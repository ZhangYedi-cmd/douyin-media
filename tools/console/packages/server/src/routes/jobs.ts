// 3 条慢作业 POST + GET /api/jobs/:id + GET /api/jobs（02-后端执行方案.md §2.3）。
import fs from 'node:fs'
import path from 'node:path'
import { Hono } from 'hono'
import { createNormalizer, parseStream } from '@console/cc-stream'
import type { NormEvent } from '@console/cc-stream'
import { isValidSlug } from '../actions/whitelist.js'
import type { JobRunner } from '../jobs/runner.js'
import type {
  ApiEnvelope,
  ApiErrorBody,
  Job,
  JobCancelAllResponse,
  JobCancelResponse,
  JobHistoryData,
  JobLogData,
  JobSubmittedResponse,
  JobsListData,
} from '../api-types.js'

// job id 形如 `create-20260819144107-b312`（newJobId() 落地格式：`${type}-${14位时间戳}-${4位hex}`）。
// GET /api/jobs/:id/log 要把 id 拼进文件路径，必须先校验——字符集本身就不含 `/` `.`，
// 天然杜绝路径穿越（`../../etc/passwd` 之类必然不匹配），不需要再走 safeResolve 那套 realpath 复核。
const JOB_ID_RE = /^[a-z][a-z-]*-\d{14}-[0-9a-f]{4}$/

// GET /api/jobs/history 的 task 参数字符集（harness/tasks.md 里 task: 字段的实测形状，如
// benchmark-refresher/backlog-gardener，与 harness-run 型 Job.task 同源）。不拼路径，但既然
// isValidSlug 已有先例——任意字符串一律不放行，用白名单堵住。
const TASK_NAME_RE = /^[a-z][a-z0-9-]{0,64}$/

export interface JobRouteDeps {
  runner: JobRunner
  logsDir: string
}

function badParam(message: string): ApiErrorBody {
  return { error: { code: 'BAD_PARAM', message } }
}

function submittedBody(job: Job): JobSubmittedResponse {
  return { jobId: job.id, statusUrl: `/api/jobs/${job.id}`, sseEvent: `job:${job.id}` }
}

export function createJobRoutes(deps: JobRouteDeps): Hono {
  const { runner, logsDir } = deps
  const app = new Hono()

  app.post('/api/actions/publish', async (c) => {
    const body = await c.req.json().catch(() => null)
    if (!body || typeof body !== 'object') return c.json(badParam('请求体须为 JSON 对象'), 400)
    const { slug } = body as { slug?: unknown }
    if (!isValidSlug(slug)) return c.json(badParam('slug 格式非法或缺失'), 400)
    const result = runner.submitPublish({ slug })
    if (!result.ok) return c.json({ error: { code: result.code, message: result.message } }, 409)
    return c.json(submittedBody(result.job), 202)
  })

  app.post('/api/actions/rework', async (c) => {
    const body = await c.req.json().catch(() => null)
    if (!body || typeof body !== 'object') return c.json(badParam('请求体须为 JSON 对象'), 400)
    const { slug, reason } = body as { slug?: unknown; reason?: unknown }
    if (!isValidSlug(slug)) return c.json(badParam('slug 格式非法或缺失'), 400)
    if (typeof reason !== 'string' || reason.trim() === '') return c.json(badParam('reason 必填'), 400)
    const result = runner.submitRework({ slug, reason })
    if (!result.ok) return c.json({ error: { code: result.code, message: result.message } }, 409)
    return c.json(submittedBody(result.job), 202)
  })

  app.post('/api/actions/apply-proposal', async (c) => {
    const body = await c.req.json().catch(() => null)
    if (!body || typeof body !== 'object') return c.json(badParam('请求体须为 JSON 对象'), 400)
    const { report, note } = body as { report?: unknown; note?: unknown }
    if (typeof report !== 'string' || !report.startsWith('harness/logs/')) {
      return c.json(badParam('report 须为 harness/logs/ 下的报告相对路径'), 400)
    }
    const result = runner.submitApplyProposal({ report, note: typeof note === 'string' ? note : undefined })
    if (!result.ok) return c.json({ error: { code: result.code, message: result.message } }, 409)
    return c.json(submittedBody(result.job), 202)
  })

  // 2026-08-19 增补两条（用户走查提的手动触发能力，H 号执行；02-后端执行方案.md 未覆盖此二型，
  // 契约由总指挥直接在 api-types.ts/defs.ts 落地）。写法照抄上面三条：格式校验在路由层，
  // 业务 precheck（注册表/状态机）留给 runner，409 统一走 result.code。

  app.post('/api/actions/harness-run', async (c) => {
    const body = await c.req.json().catch(() => null)
    if (!body || typeof body !== 'object') return c.json(badParam('请求体须为 JSON 对象'), 400)
    const { task } = body as { task?: unknown }
    if (typeof task !== 'string' || task.trim() === '') return c.json(badParam('task 必填'), 400)
    const result = runner.submitHarnessRun({ task })
    if (!result.ok) return c.json({ error: { code: result.code, message: result.message } }, 409)
    return c.json(submittedBody(result.job), 202)
  })

  app.post('/api/actions/create', async (c) => {
    const body = await c.req.json().catch(() => null)
    if (!body || typeof body !== 'object') return c.json(badParam('请求体须为 JSON 对象'), 400)
    const { slug } = body as { slug?: unknown }
    if (!isValidSlug(slug)) return c.json(badParam('slug 格式非法或缺失'), 400)
    const result = runner.submitCreate({ slug })
    if (!result.ok) return c.json({ error: { code: result.code, message: result.message } }, 409)
    return c.json(submittedBody(result.job), 202)
  })

  // 2026-08-19 增补两条（看板「取消任务」能力，J 号执行；真实事故起因见 jobs/runner.ts
  // cancelJob 头注）。契约刻意不走上面五条 POST /api/actions/* 那套 202+jobId+SSE 追踪信封
  // （JobSubmittedResponse）——取消是即时动作，不是要另起一条慢作业，200 直接回真实结果即可，
  // 界面刷新仍旧全靠既有 SSE `job:<id>` 广播（cancelJob/cancelAllJobs 内部都会调 sse.jobUpdate）。
  // 错误码沿用既有约定：查无此任务 404 NOT_FOUND；任务已处于终结态、取消是无效操作 409
  // PRECONDITION_FAILED（与本文件其它 precheck 拒绝复用同一错误码语义，不新造一个）。

  app.post('/api/jobs/:id/cancel', (c) => {
    const id = c.req.param('id')
    const result = runner.cancelJob(id)
    if (!result.ok) {
      const status = result.code === 'NOT_FOUND' ? 404 : 409
      return c.json({ error: { code: result.code, message: result.message } }, status)
    }
    const body: JobCancelResponse = { ok: true, job: result.job }
    return c.json(body)
  })

  // 「全部取消」：没有 precheck 可拒——空队列 + 无正在跑的任务时也是合法调用，回 0/null 即可，
  // 不是错误（一键清空面板哪怕面板本来就是空的，也不该报错）。
  app.post('/api/jobs/cancel-all', (c) => {
    const result = runner.cancelAllJobs()
    const body: JobCancelAllResponse = { ok: true, cancelledQueued: result.cancelledQueued, cancelledActive: result.cancelledActive }
    return c.json(body)
  })

  // 2026-08-19 增补（详情页「执行记录」tab 需求；验收 GET /api/jobs/:id/log 时发现的既有 bug，
  // 见 api-types.ts JobHistoryData 头注）：按 slug 或 task 列出某内容/某治理任务的全部历史任务，
  // 不受 GET /api/jobs 的 recent 24h 窗口、也不受"内存表非空就不兜底磁盘"那条件限制。
  //
  // **路由注册顺序要求：本条必须注册在下面的 `GET /api/jobs/:id` 之前**——两者路径段数相同
  // （`/api/jobs/history` vs `/api/jobs/:id`，history 会被当成 id 的值），若把 `:id` 那条注册在前，
  // 对 /api/jobs/history 的请求会先命中 `:id` 路由、拿 "history" 当 job id 走 JOB_ID_RE 校验，
  // 症状是回一个"任务不存在：history"或类似的 404/400，而不是本处理器。routes/jobs.test.ts
  // 里有专门测试固化这个顺序，不要在改动时把两者顺序倒过来。
  //
  // 数据源与去重：磁盘 `logs/jobs/*.result.json` 全量扫描（不受时间窗口限制）+ 内存表
  // （active/queued/recent）按 job id 合并，同 id 内存版本覆盖磁盘版本（内存的是最新的，比如
  // 一个 running 任务磁盘上还没有 result.json、或磁盘上是稍早写入的快照）。按 startedAt 倒序，
  // 上限 50 条。
  //
  // 已知缺口（故意不处理，别当成遗漏）：有极少数 `.jsonl` 没有对应的 `.result.json`
  // （子进程被硬杀、没走完 runOne() 的终局写盘），这类孤儿日志不出现在历史列表里——要把它们
  // 捞出来得反过去扫 jsonl 猜 slug/task，不值当，本次不做。
  app.get('/api/jobs/history', (c) => {
    const slug = c.req.query('slug')
    const task = c.req.query('task')
    if (slug === undefined && task === undefined) {
      return c.json(badParam('slug 或 task 二选一必填'), 400)
    }
    if (slug !== undefined && task !== undefined) {
      return c.json(badParam('slug 与 task 二选一，不能同时传'), 400)
    }
    if (slug !== undefined && !isValidSlug(slug)) {
      return c.json(badParam(`slug 格式非法：${slug}`), 400)
    }
    if (task !== undefined && !TASK_NAME_RE.test(task)) {
      return c.json(badParam(`task 格式非法：${task}`), 400)
    }

    const matches = (job: Job): boolean => (slug !== undefined ? job.slug === slug : job.task === task)

    const byId = new Map<string, Job>()

    // 磁盘全量扫描：logsDir 可能还不存在（server 刚起、从未跑过任何 job），readdirSync 失败静默跳过。
    try {
      for (const f of fs.readdirSync(logsDir)) {
        if (!f.endsWith('.result.json')) continue
        try {
          const job = JSON.parse(fs.readFileSync(path.join(logsDir, f), 'utf8')) as Job
          if (matches(job)) byId.set(job.id, job)
        } catch {
          /* 单个文件解析失败：跳过，不让一条坏数据拖垮整个历史列表 */
        }
      }
    } catch {
      /* logsDir 不存在 */
    }

    // 内存表覆盖：active/queued（磁盘上还没有）+ recent（磁盘上可能有，但内存版本更新，以它为准）。
    const active = runner.getActive()
    const memJobs = [...(active ? [active] : []), ...runner.getQueued(), ...runner.getRecent()]
    for (const job of memJobs) {
      if (matches(job)) byId.set(job.id, job)
    }

    const jobs = [...byId.values()]
      .sort((a, b) => {
        const at = a.startedAt ?? ''
        const bt = b.startedAt ?? ''
        return bt < at ? -1 : bt > at ? 1 : 0
      })
      .slice(0, 50)

    const data: JobHistoryData = { jobs }
    const body: ApiEnvelope<JobHistoryData> = { revision: runner.getRevision(), now: new Date().toISOString(), data }
    return c.json(body)
  })

  app.get('/api/jobs/:id', (c) => {
    const id = c.req.param('id')
    const inMemory = runner.getById(id)
    if (inMemory) return c.json(inMemory)

    // 崩溃降级：内存表 miss → 查 <id>.result.json（有则回放终态）→ 再查 <id>.jsonl（有则 state=unknown）→ 都无则 404
    const resultPath = path.join(logsDir, `${id}.result.json`)
    if (fs.existsSync(resultPath)) {
      try {
        const job = JSON.parse(fs.readFileSync(resultPath, 'utf8')) as Job
        return c.json(job)
      } catch {
        /* 落到下面的降级分支 */
      }
    }
    const jsonlPath = path.join(logsDir, `${id}.jsonl`)
    if (fs.existsSync(jsonlPath)) {
      return c.json({
        id,
        state: 'unknown',
        note: 'server 曾重启，任务表已失；真相看文件状态与 media check',
        logPath: path.relative(path.dirname(path.dirname(logsDir)), jsonlPath),
      })
    }
    return c.json({ error: { code: 'NOT_FOUND', message: `任务不存在：${id}` } }, 404)
  })

  // 2026-08-19 增补（用户需求"详情页看 CC 运行时全链路日志"，K 号执行数据侧；总指挥已在
  // cc-stream 落地 NormEvent 的展示字段扩容——thinking/at/toolDone.preview 等）。
  //
  // 铁律：绝不写第二个解析器。回放 = 把 <id>.jsonl 整个文件按行喂给与实时路径（jobs/runner.ts
  // execCcJob → runHeadlessCC 内部）完全相同的 parseStream + createNormalizer，重放一遍——两条
  // 路径吃的是同一份文件、走同一段代码，输出天然一致。这个项目已经在「警报区 vs 待我处理」
  // 「账本 vs 注册表」「报告路径归一化」上栽过三次「同一份数据两种口径」的跟头，此处刻意不重演：
  // 哪怕多写几行手搓 JSON.parse 循环看起来更省事，也不允许——那就是第二个解析器。
  //
  // 不分页：总指挥实测现有归一层已把 350 事件/419KB 压到 107 事件/26KB，本次扩容增加的字段
  // （thinking 事件 + preview/at 等）体量仍是同一量级，一次性返回即可。
  app.get('/api/jobs/:id/log', async (c) => {
    const id = c.req.param('id')
    if (!JOB_ID_RE.test(id)) return c.json(badParam(`任务 id 格式非法：${id}`), 400)
    const logFile = path.join(logsDir, `${id}.jsonl`)
    if (!fs.existsSync(logFile)) {
      return c.json({ error: { code: 'NOT_FOUND', message: `日志不存在：${id}` } }, 404)
    }
    const normalize = createNormalizer()
    const events: NormEvent[] = []
    for await (const raw of parseStream(fs.createReadStream(logFile))) {
      events.push(...normalize(raw))
    }
    const data: JobLogData = { jobId: id, events }
    const body: ApiEnvelope<JobLogData> = { revision: runner.getRevision(), now: new Date().toISOString(), data }
    return c.json(body)
  })

  app.get('/api/jobs', (c) => {
    const active = runner.getActive()
    const queued = runner.getQueued()
    let recent = runner.getRecent()

    // server 重启后内存表为空：从磁盘 *.result.json 按 mtime 倒序兜底重建（02 §2.3 增补，冲突#15 拍板a）
    if (recent.length === 0 && !active && queued.length === 0) {
      try {
        const files = fs
          .readdirSync(logsDir)
          .filter((f) => f.endsWith('.result.json'))
          .map((f) => {
            const abs = path.join(logsDir, f)
            return { abs, mtime: fs.statSync(abs).mtimeMs }
          })
          .sort((a, b) => b.mtime - a.mtime)
          .slice(0, 20)
        recent = files
          .map((f) => {
            try {
              return JSON.parse(fs.readFileSync(f.abs, 'utf8')) as Job
            } catch {
              return null
            }
          })
          .filter((j): j is Job => !!j)
      } catch {
        /* logsDir 可能还不存在（server 刚起、从未跑过 job） */
      }
    }

    const data: JobsListData = { active, queued, recent }
    return c.json(data)
  })

  return app
}
