// JobRunner：内存任务表 + 单并发 + 幂等锁（02-后端执行方案.md §2.6；上游拍板 §6 B5）。
// 崩溃安全：任务表在内存，server 挂了就丢——真相在文件里，重启后 GET /api/jobs/:id 走磁盘降级（routes/jobs.ts）。
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import type { MilestoneEngine, MilestoneTable, NormEvent } from '@console/cc-stream'
import { createMilestoneEngine, runHeadlessCC } from '@console/cc-stream'
import type { MetaStatus } from '@console/core'
import { execMedia } from '../actions/execMedia.js'
import { countRework, readReviewLog } from '../util/reviewLog.js'
import { normalizeHarnessReportPath } from '../util/harnessPath.js'
import { JOB_TIMEOUT_MS, REWORK_LIMIT } from './defs.js'
import { APPLY_MILESTONES, CREATE_MILESTONES, HARNESS_RUN_MILESTONES, PUBLISH_MILESTONES, REWORK_MILESTONES } from './milestones.js'
import { ALLOWED_TOOLS, applyProposalPrompt, createPrompt, harnessRunPrompt, publishPrompt, reworkPrompt } from './prompts.js'
import { verdictApplyProposal, verdictCreate, verdictHarnessRun, verdictPublish, verdictRework } from './verdict.js'
import type { Job, JobLogEvent, JobType, JobVerdict } from '../api-types.js'
import type { Config } from '../config.js'
import type { SseHub } from '../sse.js'
import type { Store } from '../store.js'

// 2026-08-19 增补（用户走查提的手动触发能力，H 号执行）：precheck 拒绝消息用的中文状态标签。
// UI 侧另有一份同款映射（StatusTag.tsx 的 STATUS_META，含 variant+label），但 api-types.ts 头注
// 明确「server → ui 单向 type-only」，server 不得反向 import ui 包的值，故这里按需复制精简版
// （只用于报错文案，不承担任何色彩/状态机语义——那两处唯一真相源仍是 core/state.ts 与 StatusTag.tsx）。
const STATUS_LABEL_ZH: Partial<Record<MetaStatus, string>> = {
  ideated: '已选题',
  drafting: '在写',
  review: '待审',
  approved: '待发',
  scheduled: '已排期',
  published: '已发布',
  retro_done: '复盘完成',
  rejected: '已否',
}

export interface SubmitRejection {
  ok: false
  code: 'PRECONDITION_FAILED' | 'REWORK_LIMIT' | 'JOB_DUPLICATE'
  message: string
}

export type SubmitResult = { ok: true; job: Job } | SubmitRejection

// 2026-08-19 增补（看板「取消任务」能力，J 号执行；起因见任务卡：用户连点 3 个治理任务
// + 1 个创作任务后发现没有任何办法取消，最后靠总指挥手工 kill 收场，过程中还踩到"杀掉正在跑的
// 那个，队列会立刻把下一个推上来"的坑）。CancelResult 与上面的 SubmitResult 同款写法：ok:false
// 时用统一 code 区分"查无此任务"（NOT_FOUND）与"任务已终结、取消是无效操作"（PRECONDITION_FAILED，
// 与本文件其它 precheck 拒绝复用同一错误码语义，不新造一个）。
export interface CancelRejection {
  ok: false
  code: 'NOT_FOUND' | 'PRECONDITION_FAILED'
  message: string
}

export type CancelResult = { ok: true; job: Job } | CancelRejection

export interface CancelAllResult {
  /** 本次「全部取消」清空的排队中任务数（原本处于 queued）。 */
  cancelledQueued: number
  /** 本次一并发出取消信号的正在跑任务 id（原本处于 running/verifying）；没有则为 null。 */
  cancelledActive: string | null
}

function isTerminalJobState(state: Job['state']): boolean {
  return state === 'succeeded' || state === 'failed' || state === 'cancelled'
}

interface RunnerDeps {
  config: Config
  store: Store
  sse: SseHub
}

interface JobExecutor {
  lockKey: string
  /** spawn + cc-stream 归一 + 里程碑推送；设置 job.error（若子进程自报失败/超时），不做终局裁决。 */
  run: (job: Job) => Promise<void>
  /** 终局裁决：复读 meta.status / git diff（文件状态唯一裁决，上游拍板 §7.4）。 */
  verdict: (job: Job) => Promise<JobVerdict>
}

function newJobId(type: JobType): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  return `${type}-${stamp}-${crypto.randomBytes(2).toString('hex')}`
}

export class JobRunner {
  private jobs = new Map<string, Job>()
  private executors = new Map<string, JobExecutor>()
  private locks = new Set<string>()
  private queue: string[] = []
  private active: string | null = null
  private readonly logsDir: string
  // 2026-08-19 增补（看板「取消任务」能力）：
  // - killHandles：按 jobId 存住 execCcJob 里 runHeadlessCC() 返回的 kill()（cc-stream 侧已升级成
  //   SIGTERM→10s 宽限→SIGKILL，见 packages/cc-stream/src/spawn.ts）。只在"子进程确实已 spawn"的
  //   窗口内存在；queued 任务或 before-step 阶段没有对应条目，cancelJob 对这类任务不走这条路。
  // - cancelling：running/verifying 任务被请求取消后记一笔，runOne() 靠它在子进程退出后判定
  //   "这次终局是被人取消的，不是正常失败"——不复用 job.error 是否有值来判定，因为正常失败路径
  //   也会写 job.error（execCcJob 的"子进程异常退出"分支），两者不能靠同一个字段区分。
  private killHandles = new Map<string, () => void>()
  private cancelling = new Set<string>()

  constructor(private deps: RunnerDeps) {
    this.logsDir = path.join(deps.config.consoleRoot, 'logs/jobs')
    fs.mkdirSync(this.logsDir, { recursive: true })
  }

  getById(id: string): Job | undefined {
    return this.jobs.get(id)
  }

  getActive(): Job | null {
    return this.active ? (this.jobs.get(this.active) ?? null) : null
  }

  getQueued(): Job[] {
    return this.queue.map((id) => this.jobs.get(id)).filter((j): j is Job => !!j)
  }

  /** GET /api/jobs/:id/log 的 ApiEnvelope 需要 revision 字段（与其它读接口的信封形状一致，
   *  02 §2.0）；routes/jobs.ts 不直接持有 Store，借 runner 已有的 store 依赖转手一次，
   *  避免为了这一个字段把 Store 传给 job 路由层（改 index.ts 装配、超出本次改动范围）。 */
  getRevision(): number {
    return this.deps.store.revision
  }

  /** 内存表近 24h 终态任务；server 重启后由路由层再从磁盘 *.result.json 兜底重建（02 §2.3 GET /api/jobs）。 */
  getRecent(limit = 20): Job[] {
    const dayAgo = Date.now() - 24 * 3_600_000
    return [...this.jobs.values()]
      .filter((j) => isTerminalJobState(j.state) && j.endedAt && new Date(j.endedAt).getTime() >= dayAgo)
      .sort((a, b) => (b.endedAt! < a.endedAt! ? -1 : 1))
      .slice(0, limit)
  }

  // ---------------------------------------------------------------------
  // 取消（2026-08-19 增补，看板「取消任务」能力）
  // ---------------------------------------------------------------------

  /**
   * 取消一个任务。三态语义（任务卡明确点名的三类状态）：
   * - **queued**：还没 spawn 子进程，直接出队 + 释放幂等锁，同步就是终局——不必等任何异步事件。
   * - **running / verifying**：已 spawn 子进程，这里只负责"发出取消信号"（记进 cancelling 集合 +
   *   调 kill()），不在本方法里同步把 state 改成 cancelled——子进程真正退出可能还要几秒
   *   （SIGTERM→10s 宽限→SIGKILL），提前显示 cancelled 会让人以为进程已经死了、其实还在收尾。
   *   真正的终态翻转发生在 runOne()：execCcJob 的 for-await 循环随子进程退出自然结束后，
   *   runOne 看 cancelling 集合来判定这次终局是"被取消"还是"正常失败"，据此跳过终局裁决
   *   （被取消的任务本来就没跑完，裁决没有意义）。
   * - **已终结**（succeeded/failed/cancelled）：no-op，返回明确的 PRECONDITION_FAILED，不假装
   *   成功——不能吞掉"你想取消的任务其实已经完事了"这种信息。
   *
   * 队列语义（任务卡要求写清楚判断与理由）：单任务取消**不清空队列**——排在后面的其它任务
   * （通常是不同 slug/task，各自独立）照常往下跑。理由：取消一个任务只表达"我不想要这一个了"，
   * 不隐含"所有排队的都不要了"；把它类比成任务的另一种终态（cancelled，与 succeeded/failed
   * 并列）而不是"紧急停机"，队列继续推进是 runOne() 现有 finally→runNext() 的自然行为，不需要
   * 特殊处理。真正的"紧急停机、一个不留"场景走下面的 cancelAllJobs()。
   */
  cancelJob(id: string): CancelResult {
    const job = this.jobs.get(id)
    if (!job) return { ok: false, code: 'NOT_FOUND', message: `任务不存在：${id}` }
    if (isTerminalJobState(job.state)) {
      return { ok: false, code: 'PRECONDITION_FAILED', message: `任务已处于终结状态（${job.state}），取消是无效操作` }
    }

    if (job.state === 'queued') {
      this.queue = this.queue.filter((qid) => qid !== id)
      const executor = this.executors.get(id)
      if (executor) {
        this.locks.delete(executor.lockKey)
        this.executors.delete(id)
      }
      job.state = 'cancelled'
      job.error = '已被人取消（任务尚未开始执行，已从队列移除）'
      job.endedAt = new Date().toISOString()
      this.writeResultFile(job)
      this.deps.sse.jobUpdate(job)
      return { ok: true, job }
    }

    // running / verifying：只发信号，真正的终态翻转交给 runOne()（见上方方法头注）。
    this.cancelling.add(id)
    job.cancelRequested = true
    this.killHandles.get(id)?.()
    this.deps.sse.jobUpdate(job)
    return { ok: true, job }
  }

  /**
   * 全部取消：排队中的任务全部标记 cancelled 并把队列本体清空（不是只标记——若只标记不清空数组，
   * runNext() 还会照常 shift 到这些已标记 cancelled 的 id，白白 spawn 一个注定作废的任务），
   * 正在跑的任务（如果有）一并发出取消信号。用于"连点了好几个任务、想干净地全停下来"这种场景
   * （对应任务卡起因事故：用户连点 3 个治理任务 + 1 个创作任务，事后发现没有一键停止的办法）——
   * 与单任务取消刻意不同：这里就是要"一个不留"，不存在"后面的要不要继续跑"的问题。
   */
  cancelAllJobs(): CancelAllResult {
    const queuedIds = [...this.queue]
    this.queue = []
    for (const id of queuedIds) {
      const job = this.jobs.get(id)
      const executor = this.executors.get(id)
      if (executor) {
        this.locks.delete(executor.lockKey)
        this.executors.delete(id)
      }
      if (!job) continue
      job.state = 'cancelled'
      job.error = '已被人取消（全部取消：任务尚未开始执行，已从队列移除）'
      job.endedAt = new Date().toISOString()
      this.writeResultFile(job)
      this.deps.sse.jobUpdate(job)
    }

    let cancelledActive: string | null = null
    if (this.active) {
      const activeJob = this.jobs.get(this.active)
      if (activeJob && !isTerminalJobState(activeJob.state)) {
        cancelledActive = this.active
        this.cancelling.add(this.active)
        activeJob.cancelRequested = true
        this.killHandles.get(this.active)?.()
        this.deps.sse.jobUpdate(activeJob)
      }
    }

    return { cancelledQueued: queuedIds.length, cancelledActive }
  }

  // ---------------------------------------------------------------------
  // 三个 submit：precheck → 幂等锁查重 → 建 Job(queued) → 入队
  // ---------------------------------------------------------------------

  submitPublish(params: { slug: string }): SubmitResult {
    const entry = this.deps.store.snapshot.contents.find((c) => c.slug === params.slug)
    if (!entry || !entry.meta) {
      return { ok: false, code: 'PRECONDITION_FAILED', message: `内容条目不存在或解析失败：${params.slug}` }
    }
    if (entry.meta.status !== 'approved') {
      return {
        ok: false,
        code: 'PRECONDITION_FAILED',
        message: `meta.status=${entry.meta.status}，只能对 approved 条目发起发布（「只发 approved」铁律）`,
      }
    }
    const lockKey = params.slug
    if (this.locks.has(lockKey)) return { ok: false, code: 'JOB_DUPLICATE', message: `该条目正有任务在跑：${params.slug}` }

    const job = this.createJob('publish', { slug: params.slug })
    this.register(job, {
      lockKey,
      run: (j) => this.execCcJob(j, publishPrompt(params.slug), PUBLISH_MILESTONES, JOB_TIMEOUT_MS.publish),
      verdict: (j) => verdictPublish(this.deps.config.repoRoot, params.slug, j.error === undefined),
    })
    return { ok: true, job }
  }

  submitRework(params: { slug: string; reason: string }): SubmitResult {
    const entry = this.deps.store.snapshot.contents.find((c) => c.slug === params.slug)
    if (!entry || !entry.meta) {
      return { ok: false, code: 'PRECONDITION_FAILED', message: `内容条目不存在或解析失败：${params.slug}` }
    }
    const status = entry.meta.status
    if (status !== 'review' && status !== 'drafting' && status !== 'rejected') {
      return { ok: false, code: 'PRECONDITION_FAILED', message: `meta.status=${status}，只能对 review/drafting/rejected 条目发起重做` }
    }
    const done = countRework(readReviewLog(this.deps.store.root, entry.dir))
    if (done >= REWORK_LIMIT) {
      return { ok: false, code: 'REWORK_LIMIT', message: `已重做 ${done} 次达上限 ${REWORK_LIMIT}，需转人工（3-review.md 记打回·待办）` }
    }
    const lockKey = params.slug
    if (this.locks.has(lockKey)) return { ok: false, code: 'JOB_DUPLICATE', message: `该条目正有任务在跑：${params.slug}` }

    const nth = done + 1
    const job = this.createJob('rework', { slug: params.slug, reason: params.reason })
    this.register(job, {
      lockKey,
      run: async (j) => {
        // before-step：review/rejected 先记账过 CLI 闸翻 drafting；已是 drafting（已被打回过）跳过 flip 直接派活
        if (status === 'review' || status === 'rejected') {
          const flipResult = await execMedia(this.deps.config, ['flip', params.slug, 'drafting', '--reason', params.reason, '--json'], {
            actor: `console-job:${j.id}`,
          })
          if (flipResult.httpStatus !== 200) {
            j.error = `before-step flip drafting 失败：${JSON.stringify(flipResult.body).slice(0, 1000)}`
            return
          }
        }
        await this.execCcJob(j, reworkPrompt(params.slug, entry.dir, params.reason, nth), REWORK_MILESTONES, JOB_TIMEOUT_MS.rework)
      },
      verdict: (j) => verdictRework(this.deps.config.repoRoot, params.slug, j.error === undefined),
    })
    return { ok: true, job }
  }

  submitApplyProposal(params: { report: string; note?: string }): SubmitResult {
    // index.jsonl 里 report 字段历史上是相对 harness/ 的路径（真实起服务验证时发现的坑，
    // 见 util/harnessPath.ts 头注释）；GET /api/harness 已把 reportPath 归一成仓相对形式吐给客户端，
    // 这里同样归一后再比对，两头就能对上——不归一的话，真实 index.jsonl 数据会让这个 precheck 永远落空。
    const run = this.deps.store.snapshot.harness.find(
      (r) => typeof r.report === 'string' && normalizeHarnessReportPath(r.report, this.deps.store.root) === params.report,
    )
    if (!run) return { ok: false, code: 'PRECONDITION_FAILED', message: `报告不在治理账本 index.jsonl 中：${params.report}` }
    if (run.applied === true) return { ok: false, code: 'PRECONDITION_FAILED', message: `报告已应用：${params.report}` }
    const lockKey = `proposal:${params.report}`
    if (this.locks.has(lockKey)) return { ok: false, code: 'JOB_DUPLICATE', message: `该报告正有任务在跑：${params.report}` }

    const job = this.createJob('apply-proposal', { report: params.report, reason: params.note })
    this.register(job, {
      lockKey,
      run: (j) => this.execCcJob(j, applyProposalPrompt(params.report), APPLY_MILESTONES, JOB_TIMEOUT_MS['apply-proposal']),
      verdict: () => verdictApplyProposal(this.deps.config.repoRoot),
    })
    return { ok: true, job }
  }

  // 2026-08-19 增补两型（用户走查提的手动触发能力，H 号执行；02-后端执行方案.md 未覆盖此二型，
  // 契约由总指挥直接在 api-types.ts/defs.ts 落地）。precheck/lockKey/verdict 逻辑就地写在这里，
  // 沿本文件既有三个 submit* 的写法——每型形状差异大，不抽通用接口。

  /** POST /api/actions/harness-run：task 须在注册表里、enabled、且有 skill（无 skill 的纯 CLI/规则化
   * 任务如 check 一律拒——看板本来就在持续跑 media check，不该为它派 CC 进程）。 */
  submitHarnessRun(params: { task: string }): SubmitResult {
    const row = this.deps.store.harnessTasks.find((t) => t.name === params.task)
    if (!row) {
      return { ok: false, code: 'PRECONDITION_FAILED', message: `任务不在治理任务注册表中：${params.task}` }
    }
    if (!row.enabled) {
      return {
        ok: false,
        code: 'PRECONDITION_FAILED',
        message: `任务未启用：${params.task}（harness/tasks.md 里 enabled=false，需先人工启用）`,
      }
    }
    if (!row.skill) {
      return {
        ok: false,
        code: 'PRECONDITION_FAILED',
        message: `任务 ${params.task} 没有执行技能（是纯 CLI/规则化任务，看板本来就在持续跑，不该派 CC 进程执行）`,
      }
    }
    const lockKey = `harness:${params.task}`
    if (this.locks.has(lockKey)) return { ok: false, code: 'JOB_DUPLICATE', message: `该治理任务正有任务在跑：${params.task}` }

    const skill = row.skill
    const job = this.createJob('harness-run', { task: params.task })
    this.register(job, {
      lockKey,
      run: (j) => this.execCcJob(j, harnessRunPrompt(params.task, skill), HARNESS_RUN_MILESTONES, JOB_TIMEOUT_MS['harness-run']),
      // startedAt 由 runOne() 在 executor.run() 之前赋值，verdict() 在 run() 之后才被调用，此时必已就绪。
      verdict: (j) => verdictHarnessRun(this.deps.config.repoRoot, params.task, j.startedAt!),
    })
    return { ok: true, job }
  }

  /** POST /api/actions/create：slug 须存在于快照且 meta.status === 'ideated'（只对已选题内容启动创作）。 */
  submitCreate(params: { slug: string }): SubmitResult {
    const entry = this.deps.store.snapshot.contents.find((c) => c.slug === params.slug)
    if (!entry || !entry.meta) {
      return { ok: false, code: 'PRECONDITION_FAILED', message: `内容条目不存在或解析失败：${params.slug}` }
    }
    if (entry.meta.status !== 'ideated') {
      const label = STATUS_LABEL_ZH[entry.meta.status] ?? entry.meta.status
      return {
        ok: false,
        code: 'PRECONDITION_FAILED',
        message: `内容 ${params.slug} 当前状态是 ${label}，只有「已选题」的内容能启动创作`,
      }
    }
    const lockKey = `create:${params.slug}`
    if (this.locks.has(lockKey)) return { ok: false, code: 'JOB_DUPLICATE', message: `该条目正有任务在跑：${params.slug}` }

    const dir = entry.dir
    const job = this.createJob('create', { slug: params.slug })
    this.register(job, {
      lockKey,
      run: (j) => this.execCcJob(j, createPrompt(params.slug, dir), CREATE_MILESTONES, JOB_TIMEOUT_MS.create),
      verdict: () => verdictCreate(this.deps.config.repoRoot, params.slug),
    })
    return { ok: true, job }
  }

  // ---------------------------------------------------------------------
  // 内部机制
  // ---------------------------------------------------------------------

  private createJob(type: JobType, extra: Partial<Job>): Job {
    const id = newJobId(type)
    const job: Job = {
      id,
      type,
      state: 'queued',
      milestones: [],
      narration: [],
      stalling: false,
      logPath: path.relative(this.deps.config.consoleRoot, path.join(this.logsDir, `${id}.jsonl`)),
      ...extra,
    }
    this.jobs.set(id, job)
    return job
  }

  private register(job: Job, executor: JobExecutor): void {
    this.executors.set(job.id, executor)
    this.locks.add(executor.lockKey)
    this.queue.push(job.id)
    this.deps.sse.jobUpdate(job)
    this.runNext()
  }

  private runNext(): void {
    if (this.active) return
    const nextId = this.queue.shift()
    if (!nextId) return
    const job = this.jobs.get(nextId)
    const executor = this.executors.get(nextId)
    if (!job || !executor) {
      this.runNext()
      return
    }
    this.active = nextId
    void this.runOne(job, executor)
  }

  private async runOne(job: Job, executor: JobExecutor): Promise<void> {
    job.state = 'running'
    job.startedAt = new Date().toISOString()
    this.deps.sse.jobUpdate(job)
    try {
      await executor.run(job)
      if (this.cancelling.has(job.id)) {
        // 被取消：不跑终局裁决（executor.verdict）——任务本来就没有正常跑完，用裁决语义评价一个
        // 被人为打断的过程没有意义，"通过/未通过"这两个选项都不对。error 里如实写清楚发生了什么，
        // 折叠此前 execCcJob 可能已写的"子进程异常退出"技术细节（SIGTERM 本身就会让子进程走
        // 非正常退出码），不让它盖过"这是人主动取消的"这个更重要的事实。
        job.state = 'cancelled'
        job.error = job.error ? `已被人取消（${job.error}）` : '已被人取消'
      } else {
        job.state = 'verifying'
        this.deps.sse.jobUpdate(job)
        const verdict = await executor.verdict(job)
        job.verdict = verdict
        job.state = verdict.ok ? 'succeeded' : 'failed'
      }
    } catch (err) {
      if (this.cancelling.has(job.id)) {
        job.state = 'cancelled'
        job.error = job.error ? `已被人取消（${job.error}）` : '已被人取消'
      } else {
        job.error = job.error ?? (err instanceof Error ? err.message : String(err))
        job.state = 'failed'
      }
    } finally {
      job.endedAt = new Date().toISOString()
      delete job.cancelRequested // 终局已定，清掉"正在停止中"的临时标记
      this.writeResultFile(job)
      this.locks.delete(executor.lockKey)
      this.executors.delete(job.id)
      this.killHandles.delete(job.id)
      this.cancelling.delete(job.id)
      this.deps.sse.jobUpdate(job)
      this.active = null
      this.runNext()
    }
  }

  private writeResultFile(job: Job): void {
    try {
      fs.writeFileSync(path.join(this.logsDir, `${job.id}.result.json`), JSON.stringify(job, null, 2))
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`[job ${job.id}] 写 result.json 失败：`, err)
    }
  }

  /** spawn + cc-stream 归一 + 里程碑引擎 + SSE 推送；stalling 计数（连续 2 次才亮）在此收拢，cc-stream 只逐次吐信号。 */
  private async execCcJob(job: Job, prompt: string, milestoneTable: MilestoneTable, timeoutMs: number): Promise<void> {
    // 极窄的竞态窗口：submitRework 这类有 before-step（先记账翻状态）的任务，若在 before-step
    // 期间就被 cancelJob 打上 cancelling 标记（此时 killHandles 还没有这个 job 的条目，因为子进程
    // 还没 spawn），不必真的再拉起一个注定要被扔掉的子进程——runOne() 后续照样会按 cancelling
    // 集合判定为"被取消"，这里提前 return 只是省一次没意义的 spawn。
    if (this.cancelling.has(job.id)) return
    const engine = createMilestoneEngine(milestoneTable)
    const run = runHeadlessCC({
      prompt,
      allowedTools: ALLOWED_TOOLS,
      cwd: this.deps.config.repoRoot,
      timeoutMs,
      logPath: path.join(this.logsDir, `${job.id}.jsonl`),
    })
    this.killHandles.set(job.id, run.kill)
    try {
      let stallingStreak = 0
      // 2026-08-19 增补（用户需求"详情页看创作全链路"，K 号执行）：`job:<id>`（下面的 sse.jobUpdate）
      // 是 Job 快照的全量覆盖广播，只有 narration/milestones 这些"驱动状态"字段，thinking/
      // toolDone.preview 等展示字段全部丢在这里——所以另开一条 job-log:<id> 纯追加语义的事件流，
      // 把每条归一事件原样连同序号一起广播出去。seq 从 0 起、按本次 execCcJob 调用（=本 job 的
      // 生命周期）单调递增，且与 GET /api/jobs/:id/log 回放数组的下标严格对齐（两条路径喂的是
      // 同一份 <id>.jsonl、走同一个 parseStream+createNormalizer，见 api-types.ts JobLogEvent
      // 头注的详细协议说明）——客户端借这个 seq 在"先订阅 SSE 再拉历史"的时序里去重合并。
      let logSeq = 0
      for await (const ev of run.events) {
        const logEv: JobLogEvent = { seq: logSeq++, event: ev }
        this.deps.sse.broadcast(`job-log:${job.id}`, logEv)
        this.applyNormEvent(job, ev, engine)
        stallingStreak = ev.kind === 'stalling' ? stallingStreak + 1 : 0
        job.stalling = stallingStreak >= 2
        this.deps.sse.jobUpdate(job)
      }
      const exit = await run.exit
      const sawDone = job.turns !== undefined || job.costUsd !== undefined || job.durationMs !== undefined
      if (exit.code !== 0 && !sawDone) {
        job.error = `子进程异常退出 code=${exit.code} signal=${exit.signal ?? ''}；stderr 尾：${exit.stderrTail.slice(-500)}`
      }
    } finally {
      this.killHandles.delete(job.id)
    }
  }

  private applyNormEvent(job: Job, ev: NormEvent, engine: MilestoneEngine): void {
    if (ev.kind === 'say') {
      const idx = job.narration.findIndex((n) => n.messageId === ev.messageId)
      if (idx >= 0) job.narration[idx] = { messageId: ev.messageId, text: ev.text }
      else job.narration.push({ messageId: ev.messageId, text: ev.text })
    } else if (ev.kind === 'done') {
      job.costUsd = ev.costUsd
      job.turns = ev.turns
      job.durationMs = ev.durationMs
      if (!ev.ok) job.error = job.error ?? '子进程 result.is_error=true（终局仍以文件状态复核为准）'
    }
    // tool 事件同时驱动里程碑；started/toolDone 只用于内部推进，不单独写进 Job 字段。
    for (const hit of engine.feed(ev)) job.milestones.push(hit)
  }
}
