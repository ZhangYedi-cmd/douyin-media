// JobRunner 补测（C 验收跟进项①）：runner.test.ts 明确声明只测 precheck 拒绝路径，happy-path 因为会真
// spawn `claude -p`（红线：单测环境禁止意外触发真实 CC 调用）而被排除。这里用 vi.mock('@console/cc-stream')
// 假掉 spawn 边界（runHeadlessCC / createMilestoneEngine），补三块此前零覆盖的行为：
//   1. 同 slug 二次发起 → 第二发 JOB_DUPLICATE（幂等锁，锁在 register() 同步加，不用等 run 完）
//   2. job 生命周期状态推进：queued → running → verifying → succeeded/failed（含跨两任务的排队）
//   3. 终局（succeeded/failed）后锁释放，同 slug 可再次发起新任务
// verdict 判定本身用真文件（不 mock verdict.ts），与 verdict.test.ts 分工：这里只关心 runner 的编排逻辑。
//
// 遵循 packages/cc-stream/__test__/spawn.test.ts 的既有约定：mock 控制变量先声明、vi.mock 工厂只引用它们，
// 被测模块用动态 `await import(...)` 放在最后——天然避开需要 vi.hoisted() 的顺序问题。
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { Hono } from 'hono'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { HeadlessRun, HeadlessRunExit, MilestoneEngine, NormEvent } from '@console/cc-stream'
import type { SseHub } from '../../sse.js'
import type { Config } from '../../config.js'
import { copyFixtureRepoToTemp, buildTestStore } from '../../../__test__/fixtures.js'

const runHeadlessCCMock = vi.fn()
const createMilestoneEngineMock = vi.fn()

// GET /api/jobs/history 用的两个真解析函数（routes/jobs.ts 的 GET /api/jobs/:id/log 也 import 了
// 这两个名字，但本文件下面的 GET /api/jobs/history 测试不会触达 /log 路由——这里补全 mock 只是
// 让 routes/jobs.ts 的顶层 import 不因 mock 工厂缺字段而拿到 undefined，不代表这两个函数本身被验证；
// 它们的真实行为由 cc-stream 自己的单测 + routes/jobs.test.ts 的 /log 端点测试覆盖。
vi.mock('@console/cc-stream', async () => {
  const actual = await vi.importActual<typeof import('@console/cc-stream')>('@console/cc-stream')
  return {
    ...actual,
    runHeadlessCC: (...args: unknown[]) => runHeadlessCCMock(...args),
    createMilestoneEngine: (...args: unknown[]) => createMilestoneEngineMock(...args),
  }
})

const { JobRunner } = await import('../../jobs/runner.js')
const { createJobRoutes } = await import('../../routes/jobs.js')

const consoleRootTmp = fs.mkdtempSync(path.join(os.tmpdir(), 'job-runner-lifecycle-console-'))
afterAll(() => fs.rmSync(consoleRootTmp, { recursive: true, force: true }))

const noopSse = { broadcast: () => {}, jobUpdate: () => {}, clientCount: () => 0, startPing: () => {}, stopPing: () => {} } as unknown as SseHub

function buildRunner(repoRoot: string) {
  const store = buildTestStore(repoRoot)
  const config: Config = { consoleRoot: consoleRootTmp, repoRoot, port: 5170, mediaBin: 'media', tokenPath: '/dev/null' }
  return new JobRunner({ config, store, sse: noopSse })
}

/** review-sample 默认 fixture 状态是 review，改成 approved 才能过 submitPublish 的 precheck。 */
function setMetaStatus(root: string, date: string, slug: string, status: string): void {
  const p = path.join(root, 'content', date, slug, 'meta.yaml')
  const raw = fs.readFileSync(p, 'utf8')
  fs.writeFileSync(p, raw.replace(/^status: .*$/m, `status: ${status}`))
}

interface RunController {
  push(ev: NormEvent): void
  end(): void
  finishExit(exit: HeadlessRunExit): void
}

/**
 * 手搓一个完全可控的 HeadlessRun：events 是一个懒惰的 async iterator，只有测试主动 push 才吐事件；
 * push 先看有没有在等的 next() 调用者，有就直接 resolve，没有就进队列——这样测试代码可以连续同步
 * push 多个事件再 end()，不用担心 for-await 消费者到底醒了没有（消费者早晚会把队列吃完）。
 */
function makeControllableRun(): { run: HeadlessRun; controller: RunController } {
  const queue: NormEvent[] = []
  const waiters: Array<(res: IteratorResult<NormEvent>) => void> = []
  let ended = false
  let resolveExit!: (v: HeadlessRunExit) => void
  const exitPromise = new Promise<HeadlessRunExit>((resolve) => {
    resolveExit = resolve
  })

  const iterator: AsyncIterator<NormEvent> = {
    next(): Promise<IteratorResult<NormEvent>> {
      if (queue.length > 0) return Promise.resolve({ value: queue.shift() as NormEvent, done: false })
      if (ended) return Promise.resolve({ value: undefined, done: true } as IteratorResult<NormEvent>)
      return new Promise((resolve) => waiters.push(resolve))
    },
  }

  const run: HeadlessRun = {
    events: { [Symbol.asyncIterator]: () => iterator },
    pid: 4242,
    kill: () => {},
    exit: exitPromise,
  }

  const controller: RunController = {
    push(ev) {
      const waiter = waiters.shift()
      if (waiter) waiter({ value: ev, done: false })
      else queue.push(ev)
    },
    end() {
      ended = true
      while (waiters.length > 0) {
        const waiter = waiters.shift()!
        waiter({ value: undefined, done: true } as IteratorResult<NormEvent>)
      }
    },
    finishExit(exit) {
      resolveExit(exit)
    },
  }

  return { run, controller }
}

async function waitForTerminal(runner: InstanceType<typeof JobRunner>, jobId: string) {
  await vi.waitFor(() => {
    const job = runner.getById(jobId)
    if (!job || (job.state !== 'succeeded' && job.state !== 'failed')) throw new Error(`job ${jobId} 未到终局`)
  })
  return runner.getById(jobId)!
}

beforeEach(() => {
  runHeadlessCCMock.mockReset()
  createMilestoneEngineMock.mockReset()
  createMilestoneEngineMock.mockReturnValue({ feed: () => [] } satisfies MilestoneEngine)
})

describe('JobRunner 全流程（mock @console/cc-stream，杜绝真实 spawn claude -p）', () => {
  it('同 slug 二次发起 publish：第一发已同步进入 running，第二发立即 JOB_DUPLICATE，不会再调 runHeadlessCC', () => {
    const tmp = copyFixtureRepoToTemp()
    setMetaStatus(tmp, '2030-01-06', 'review-sample', 'approved')
    const runner = buildRunner(tmp)
    const { run } = makeControllableRun()
    runHeadlessCCMock.mockReturnValueOnce(run)

    const first = runner.submitPublish({ slug: 'review-sample' })
    expect(first.ok).toBe(true)
    if (first.ok) expect(runner.getById(first.job.id)?.state).toBe('running')

    const second = runner.submitPublish({ slug: 'review-sample' })
    expect(second.ok).toBe(false)
    if (!second.ok) {
      expect(second.code).toBe('JOB_DUPLICATE')
      expect(second.message).toContain('review-sample')
    }
    expect(runHeadlessCCMock).toHaveBeenCalledTimes(1)
  })

  it('job 生命周期：running →（done 事件 + 正常退出）→ verifying → succeeded（meta.status 复核通过，真文件读取）', async () => {
    const tmp = copyFixtureRepoToTemp()
    setMetaStatus(tmp, '2030-01-06', 'review-sample', 'approved')
    const runner = buildRunner(tmp)
    const { run, controller } = makeControllableRun()
    runHeadlessCCMock.mockReturnValueOnce(run)

    const res = runner.submitPublish({ slug: 'review-sample' })
    expect(res.ok).toBe(true)
    if (!res.ok) return
    const jobId = res.job.id
    expect(runner.getById(jobId)?.state).toBe('running')

    controller.push({ kind: 'say', messageId: 'm1', text: '开始处理' })
    controller.push({ kind: 'say', messageId: 'm1', text: '开始处理…上传中' }) // 同 messageId 覆盖式更新，不拼接
    controller.push({ kind: 'done', ok: true, costUsd: 0.02, turns: 4, durationMs: 5000 })
    controller.end()
    // 模拟子进程真的把 meta.status 落成 published——verdict 现场 fs.readFileSync 读真文件，不读快照
    setMetaStatus(tmp, '2030-01-06', 'review-sample', 'published')
    controller.finishExit({ code: 0, signal: null, stderrTail: '' })

    const job = await waitForTerminal(runner, jobId)
    expect(job.state).toBe('succeeded')
    expect(job.narration).toEqual([{ messageId: 'm1', text: '开始处理…上传中' }])
    expect(job.costUsd).toBe(0.02)
    expect(job.turns).toBe(4)
    expect(job.durationMs).toBe(5000)
    expect(job.error).toBeUndefined()
    expect(job.verdict).toEqual({ ok: true, metaStatus: 'published', expect: ['published', 'scheduled'], note: undefined })
    expect(job.endedAt).toBeDefined()
    expect(job.startedAt).toBeDefined()
  })

  it('job 生命周期：子进程自报成功（done.ok=true）但 meta.status 没回到 published/scheduled → verifying 后判 failed', async () => {
    const tmp = copyFixtureRepoToTemp()
    setMetaStatus(tmp, '2030-01-06', 'review-sample', 'approved')
    const runner = buildRunner(tmp)
    const { run, controller } = makeControllableRun()
    runHeadlessCCMock.mockReturnValueOnce(run)

    const res = runner.submitPublish({ slug: 'review-sample' })
    expect(res.ok).toBe(true)
    if (!res.ok) return
    const jobId = res.job.id

    controller.push({ kind: 'done', ok: true, costUsd: 0.01, turns: 1, durationMs: 100 })
    controller.end()
    // 不改 meta.status——它仍停在 approved，模拟「子进程说完事了但文件没真的翻」
    controller.finishExit({ code: 0, signal: null, stderrTail: '' })

    const job = await waitForTerminal(runner, jobId)
    expect(job.state).toBe('failed')
    expect(job.error).toBeUndefined() // done.ok=true，不是子进程自报错误；是 verdict 复核不过
    expect(job.verdict?.ok).toBe(false)
    expect(job.verdict?.metaStatus).toBe('approved')
    expect(job.verdict?.note).toContain('声称成功但')
  })

  it('两任务排队：第二发在第一发运行期间停在 queued；第一发终局后才转 running；两者终局后锁各自释放', async () => {
    const tmp = copyFixtureRepoToTemp()
    setMetaStatus(tmp, '2030-01-06', 'review-sample', 'approved')
    setMetaStatus(tmp, '2030-01-05', 'published-sample', 'approved')
    const runner = buildRunner(tmp)

    const runA = makeControllableRun()
    const runB = makeControllableRun()
    runHeadlessCCMock.mockReturnValueOnce(runA.run).mockReturnValueOnce(runB.run)

    const resA = runner.submitPublish({ slug: 'review-sample' })
    const resB = runner.submitPublish({ slug: 'published-sample' })
    expect(resA.ok).toBe(true)
    expect(resB.ok).toBe(true)
    if (!resA.ok || !resB.ok) return

    // B 排队期间：runHeadlessCC 只该被 A 调过一次，B 还没轮到
    expect(runHeadlessCCMock).toHaveBeenCalledTimes(1)
    expect(runner.getActive()?.id).toBe(resA.job.id)
    expect(runner.getActive()?.state).toBe('running')
    expect(runner.getQueued().map((j) => j.id)).toEqual([resB.job.id])
    expect(runner.getById(resB.job.id)?.state).toBe('queued')

    // 收尾 A（判 failed 即可，这里只关心排队/接力机制，不重复断言 verdict 细节）
    runA.controller.push({ kind: 'done', ok: true, costUsd: 0, turns: 1, durationMs: 1 })
    runA.controller.end()
    runA.controller.finishExit({ code: 0, signal: null, stderrTail: '' })
    await waitForTerminal(runner, resA.job.id)

    // A 终局的 finally 里 runNext() 应已把 B 从 queued 取出转 running，并真调了第二次 runHeadlessCC
    expect(runHeadlessCCMock).toHaveBeenCalledTimes(2)
    expect(runner.getActive()?.id).toBe(resB.job.id)
    expect(runner.getById(resB.job.id)?.state).toBe('running')
    expect(runner.getQueued()).toEqual([])

    // 收尾 B
    runB.controller.push({ kind: 'done', ok: true, costUsd: 0, turns: 1, durationMs: 1 })
    runB.controller.end()
    runB.controller.finishExit({ code: 0, signal: null, stderrTail: '' })
    await waitForTerminal(runner, resB.job.id)
    expect(runner.getActive()).toBeNull()

    // 终局后锁释放：两个 slug 都能再发新任务（不是 JOB_DUPLICATE）
    const runA2 = makeControllableRun()
    runHeadlessCCMock.mockReturnValueOnce(runA2.run)
    const resA2 = runner.submitPublish({ slug: 'review-sample' })
    expect(resA2.ok).toBe(true)

    const runB2 = makeControllableRun()
    runHeadlessCCMock.mockReturnValueOnce(runB2.run)
    const resB2 = runner.submitPublish({ slug: 'published-sample' })
    expect(resB2.ok).toBe(true)
  })
})

// 2026-08-19 增补（用户需求"详情页看 CC 运行时全链路日志"，K 号执行数据侧）：execCcJob 的 for-await
// 循环里，每条 NormEvent 除了驱动既有的 job:<id> 全量快照（narration/milestones），还应原样连同
// 序号一起广播到新开的 job-log:<id>（追加语义，见 api-types.ts JobLogEvent 头注的协议说明）。
describe('JobRunner 实时全链路日志广播（job-log:<id>）', () => {
  it('for-await 循环里每条 NormEvent 都广播到 job-log:<id>，seq 从 0 起按到达顺序单调递增', async () => {
    const tmp = copyFixtureRepoToTemp()
    setMetaStatus(tmp, '2030-01-06', 'review-sample', 'approved')
    const store = buildTestStore(tmp)
    const config: Config = { consoleRoot: consoleRootTmp, repoRoot: tmp, port: 5170, mediaBin: 'media', tokenPath: '/dev/null' }
    const broadcastSpy = vi.fn()
    const sse = {
      broadcast: broadcastSpy,
      jobUpdate: () => {},
      clientCount: () => 0,
      startPing: () => {},
      stopPing: () => {},
    } as unknown as SseHub
    const runner = new JobRunner({ config, store, sse })
    const { run, controller } = makeControllableRun()
    runHeadlessCCMock.mockReturnValueOnce(run)

    const res = runner.submitPublish({ slug: 'review-sample' })
    expect(res.ok).toBe(true)
    if (!res.ok) return
    const jobId = res.job.id

    controller.push({ kind: 'say', messageId: 'm1', text: 'hi' })
    controller.push({ kind: 'thinking', text: '思考中', at: '2030-01-06T00:00:00.000Z' })
    controller.push({ kind: 'done', ok: true, costUsd: 0, turns: 1, durationMs: 1 })
    controller.end()
    setMetaStatus(tmp, '2030-01-06', 'review-sample', 'published')
    controller.finishExit({ code: 0, signal: null, stderrTail: '' })
    await waitForTerminal(runner, jobId)

    const logCalls = broadcastSpy.mock.calls.filter(([event]) => event === `job-log:${jobId}`)
    expect(logCalls).toEqual([
      [`job-log:${jobId}`, { seq: 0, event: { kind: 'say', messageId: 'm1', text: 'hi' } }],
      [`job-log:${jobId}`, { seq: 1, event: { kind: 'thinking', text: '思考中', at: '2030-01-06T00:00:00.000Z' } }],
      [`job-log:${jobId}`, { seq: 2, event: { kind: 'done', ok: true, costUsd: 0, turns: 1, durationMs: 1 } }],
    ])
    // job:<id> 全量快照广播走的是 sse.jobUpdate()（另一个方法，不经这里 stub 的 broadcast），
    // 与 job-log:<id> 各走各的、互不替代——这正是 api-types.ts JobLogEvent 头注解释的那层边界。
  })
})

describe('JobRunner.getRevision()', () => {
  it('透出 store.revision（GET /api/jobs/:id/log 的 ApiEnvelope 借它拿 revision 字段）', () => {
    const tmp = copyFixtureRepoToTemp()
    const store = buildTestStore(tmp)
    const config: Config = { consoleRoot: consoleRootTmp, repoRoot: tmp, port: 5170, mediaBin: 'media', tokenPath: '/dev/null' }
    const runner = new JobRunner({ config, store, sse: noopSse })
    expect(runner.getRevision()).toBe(store.revision)
  })
})

// 2026-08-19 增补（详情页「执行记录」tab 需求）：GET /api/jobs/history 按 job id 去重时，同一个 id
// 若磁盘（result.json）和内存表都有，内存版本必须赢——这条分支只有真的把一个任务推进到终局
// （写盘 + 内存表都留下记录）才能验证，routes/jobs.test.ts 那边没有 mock cc-stream、无法安全地把
// 任务推进到 succeeded，所以放在这里（本文件已经 mock 了 @console/cc-stream，可以安全推进生命周期）。
describe('GET /api/jobs/history：内存版本覆盖磁盘版本（同一 job id）', () => {
  it('任务终局后磁盘 result.json 若被后续污染成旧快照，历史接口仍返回内存表里的最新版本', async () => {
    const tmp = copyFixtureRepoToTemp()
    setMetaStatus(tmp, '2030-01-06', 'review-sample', 'approved')
    const store = buildTestStore(tmp)
    const config: Config = { consoleRoot: consoleRootTmp, repoRoot: tmp, port: 5170, mediaBin: 'media', tokenPath: '/dev/null' }
    const runner = new JobRunner({ config, store, sse: noopSse })
    const { run, controller } = makeControllableRun()
    runHeadlessCCMock.mockReturnValueOnce(run)

    const res = runner.submitPublish({ slug: 'review-sample' })
    expect(res.ok).toBe(true)
    if (!res.ok) return
    const jobId = res.job.id

    controller.push({ kind: 'done', ok: true, costUsd: 0.02, turns: 3, durationMs: 999 })
    controller.end()
    setMetaStatus(tmp, '2030-01-06', 'review-sample', 'published')
    controller.finishExit({ code: 0, signal: null, stderrTail: '' })
    const job = await waitForTerminal(runner, jobId)
    expect(job.state).toBe('succeeded') // runOne() 的 writeResultFile() 此时已把这份 succeeded 快照落盘

    // 模拟磁盘上的 result.json 比内存表旧/脏（例如一次异常写入留下的陈旧快照）：把落盘文件的
    // state 改成 'failed'。若历史接口错误地"磁盘优先"，下面会读到这个被污染的 'failed'。
    const resultPath = path.join(consoleRootTmp, 'logs/jobs', `${jobId}.result.json`)
    const onDisk = JSON.parse(fs.readFileSync(resultPath, 'utf8'))
    onDisk.state = 'failed'
    fs.writeFileSync(resultPath, JSON.stringify(onDisk))

    const app = new Hono()
    app.route('/', createJobRoutes({ runner, logsDir: path.join(consoleRootTmp, 'logs/jobs') }))
    const historyRes = await app.request(`/api/jobs/history?slug=review-sample`)
    expect(historyRes.status).toBe(200)
    const body = await historyRes.json()
    const found = body.data.jobs.find((j: { id: string }) => j.id === jobId)
    expect(found).toBeDefined()
    expect(found.state).toBe('succeeded') // 内存版本赢，不是磁盘上被污染的 'failed'
  })
})

// 2026-08-19 增补（看板「取消任务」能力，J 号执行；真实事故起因见 jobs/runner.ts cancelJob 头注：
// 用户连点 3 个治理任务 + 1 个创作任务后发现无法取消，最后靠总指挥手工 kill 收场，过程中还踩到
// "杀掉正在跑的那个，队列会立刻把下一个推上来"的坑）。覆盖任务卡点名的每条分支：
// queued 出队、running 杀进程（不跑终局裁决）、已终结拒绝、cancel-all 清空队列。
describe('JobRunner.cancelJob / cancelAllJobs', () => {
  it('取消一个 queued 任务：立即同步转 cancelled，不会调用 runHeadlessCC；不影响正在跑的那个继续到底', async () => {
    const tmp = copyFixtureRepoToTemp()
    setMetaStatus(tmp, '2030-01-06', 'review-sample', 'approved')
    setMetaStatus(tmp, '2030-01-05', 'published-sample', 'approved')
    const runner = buildRunner(tmp)

    const runA = makeControllableRun()
    runHeadlessCCMock.mockReturnValueOnce(runA.run) // B 不该被 spawn，只这一次返回值够用

    const resA = runner.submitPublish({ slug: 'review-sample' })
    const resB = runner.submitPublish({ slug: 'published-sample' })
    expect(resA.ok).toBe(true)
    expect(resB.ok).toBe(true)
    if (!resA.ok || !resB.ok) return
    expect(runner.getById(resB.job.id)?.state).toBe('queued')

    const cancelRes = runner.cancelJob(resB.job.id)
    expect(cancelRes.ok).toBe(true)
    if (cancelRes.ok) {
      expect(cancelRes.job.state).toBe('cancelled')
      expect(cancelRes.job.error).toContain('已被人取消')
      expect(cancelRes.job.endedAt).toBeDefined()
      expect(cancelRes.job.verdict).toBeUndefined() // 没跑过、也不该有裁决
    }
    // 出队生效：不在排队列表里了，锁也已释放——同 slug 能重新发起而不是 JOB_DUPLICATE（幂等锁不会
    // 因为"取消"这个动作而卡死后续对同一条目的操作）
    expect(runner.getQueued()).toEqual([])
    const runB2 = makeControllableRun()
    runHeadlessCCMock.mockReturnValueOnce(runB2.run)
    const resB2 = runner.submitPublish({ slug: 'published-sample' })
    expect(resB2.ok).toBe(true)

    // A（原本正在跑的那个）完全不受影响，正常收尾到 succeeded
    runA.controller.push({ kind: 'done', ok: true, costUsd: 0.01, turns: 1, durationMs: 10 })
    runA.controller.end()
    setMetaStatus(tmp, '2030-01-06', 'review-sample', 'published')
    runA.controller.finishExit({ code: 0, signal: null, stderrTail: '' })
    const jobA = await waitForTerminal(runner, resA.job.id)
    expect(jobA.state).toBe('succeeded')
  })

  it('取消一个 running 任务：调用子进程 kill()，子进程退出后落 cancelled（不跑终局裁决，即便文件状态本可判 succeeded）', async () => {
    const tmp = copyFixtureRepoToTemp()
    setMetaStatus(tmp, '2030-01-06', 'review-sample', 'approved')
    const runner = buildRunner(tmp)
    const { run, controller } = makeControllableRun()
    const killSpy = vi.fn()
    run.kill = killSpy
    runHeadlessCCMock.mockReturnValueOnce(run)

    const res = runner.submitPublish({ slug: 'review-sample' })
    expect(res.ok).toBe(true)
    if (!res.ok) return
    const jobId = res.job.id
    expect(runner.getById(jobId)?.state).toBe('running')

    const cancelRes = runner.cancelJob(jobId)
    expect(cancelRes.ok).toBe(true)
    expect(killSpy).toHaveBeenCalledTimes(1) // 真的调了子进程的 kill()
    // running/verifying 场景取消不是瞬时终局：state 暂时还没变，但 cancelRequested 已置位
    // （"正在停止中"的过渡态信号，供 UI 区分"按了但还没死透"与"按了没反应"）。
    expect(runner.getById(jobId)?.state).toBe('running')
    expect(runner.getById(jobId)?.cancelRequested).toBe(true)

    // 模拟子进程真的把 meta.status 落成 published——若走正常终局裁决流程本会判 succeeded，
    // 但因为已被标记取消，runOne 必须跳过裁决、不看这个文件状态。
    controller.push({ kind: 'done', ok: true, costUsd: 0.02, turns: 2, durationMs: 500 })
    controller.end()
    setMetaStatus(tmp, '2030-01-06', 'review-sample', 'published')
    controller.finishExit({ code: null, signal: 'SIGTERM', stderrTail: '' })

    const job = await waitForTerminal2(runner, jobId, 'cancelled')
    expect(job.state).toBe('cancelled')
    expect(job.error).toContain('已被人取消')
    expect(job.verdict).toBeUndefined() // 没跑终局裁决——即便 meta.status 已经是 published
    expect(job.cancelRequested).toBeUndefined() // 终局已定，临时标记已清
    expect(job.endedAt).toBeDefined()
  })

  it('取消一个不存在的任务 → NOT_FOUND', () => {
    const runner = buildRunner(copyFixtureRepoToTemp())
    const res = runner.cancelJob('publish-nonexistent-0000')
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.code).toBe('NOT_FOUND')
  })

  it('取消一个已终结（succeeded）的任务 → PRECONDITION_FAILED，明确报错而不是假装成功', async () => {
    const tmp = copyFixtureRepoToTemp()
    setMetaStatus(tmp, '2030-01-06', 'review-sample', 'approved')
    const runner = buildRunner(tmp)
    const { run, controller } = makeControllableRun()
    runHeadlessCCMock.mockReturnValueOnce(run)

    const res = runner.submitPublish({ slug: 'review-sample' })
    expect(res.ok).toBe(true)
    if (!res.ok) return
    controller.push({ kind: 'done', ok: true, costUsd: 0, turns: 1, durationMs: 1 })
    controller.end()
    setMetaStatus(tmp, '2030-01-06', 'review-sample', 'published')
    controller.finishExit({ code: 0, signal: null, stderrTail: '' })
    const job = await waitForTerminal(runner, res.job.id)
    expect(job.state).toBe('succeeded')

    const cancelRes = runner.cancelJob(res.job.id)
    expect(cancelRes.ok).toBe(false)
    if (!cancelRes.ok) {
      expect(cancelRes.code).toBe('PRECONDITION_FAILED')
      expect(cancelRes.message).toContain('succeeded')
    }
  })

  it('取消一个已经是 cancelled 的任务（再点一次取消按钮）→ 同样 PRECONDITION_FAILED，不是 no-op 假成功', () => {
    const tmp = copyFixtureRepoToTemp()
    setMetaStatus(tmp, '2030-01-06', 'review-sample', 'approved')
    setMetaStatus(tmp, '2030-01-05', 'published-sample', 'approved')
    const runner = buildRunner(tmp)
    const runA = makeControllableRun()
    runHeadlessCCMock.mockReturnValueOnce(runA.run)
    const resA = runner.submitPublish({ slug: 'review-sample' })
    const resB = runner.submitPublish({ slug: 'published-sample' })
    if (!resA.ok || !resB.ok) throw new Error('setup failed')

    const first = runner.cancelJob(resB.job.id)
    expect(first.ok).toBe(true)
    const second = runner.cancelJob(resB.job.id)
    expect(second.ok).toBe(false)
    if (!second.ok) expect(second.code).toBe('PRECONDITION_FAILED')
  })

  it('cancel-all：清空整条队列（全部标记 cancelled），并对正在跑的任务发出取消信号——不会"杀一个冒一个"', async () => {
    const tmp = copyFixtureRepoToTemp()
    setMetaStatus(tmp, '2030-01-06', 'review-sample', 'approved')
    setMetaStatus(tmp, '2030-01-05', 'published-sample', 'approved')
    const runner = buildRunner(tmp)

    const runA = makeControllableRun()
    const killSpy = vi.fn()
    runA.run.kill = killSpy
    runHeadlessCCMock.mockReturnValueOnce(runA.run) // 只有 A 会真的 spawn；B/C 应保持排队，永不 spawn

    const resA = runner.submitPublish({ slug: 'review-sample' }) // running
    const resB = runner.submitPublish({ slug: 'published-sample' }) // queued
    const resC = runner.submitHarnessRun({ task: 'retro' }) // queued（fixture 内已注册且 enabled 的治理任务）
    expect(resA.ok).toBe(true)
    expect(resB.ok).toBe(true)
    if (!resA.ok || !resB.ok || !resC.ok) throw new Error('setup failed')
    expect(runner.getQueued().map((j) => j.id)).toEqual([resB.job.id, resC.job.id])

    const result = runner.cancelAllJobs()
    expect(result.cancelledQueued).toBe(2)
    expect(result.cancelledActive).toBe(resA.job.id)
    expect(killSpy).toHaveBeenCalledTimes(1)

    // 队列已被真正清空：不是"标记了但还在数组里"，runNext() 不会再 shift 到它们
    expect(runner.getQueued()).toEqual([])
    expect(runner.getById(resB.job.id)?.state).toBe('cancelled')
    expect(runner.getById(resC.job.id)?.state).toBe('cancelled')

    // A 的子进程真正退出后收尾为 cancelled，且 runOne 的 finally→runNext() 不会凭空冒出下一个任务
    // （队列已空，"杀一个冒一个"的坑不会重演）
    runA.controller.end()
    runA.controller.finishExit({ code: null, signal: 'SIGTERM', stderrTail: '' })
    const jobA = await waitForTerminal2(runner, resA.job.id, 'cancelled')
    expect(jobA.state).toBe('cancelled')
    expect(runner.getActive()).toBeNull()
    expect(runner.getQueued()).toEqual([])
  })

  it('cancel-all：没有任何进行中任务时也合法调用，回 0/null（不是错误）', () => {
    const runner = buildRunner(copyFixtureRepoToTemp())
    const result = runner.cancelAllJobs()
    expect(result).toEqual({ cancelledQueued: 0, cancelledActive: null })
  })
})

/** 同 waitForTerminal，但等到指定的具体终态（用于区分 cancelled vs succeeded/failed，避免"随便一个
 *  终态就放行"掩盖掉"本该是 cancelled 却被判成别的"这类回归）。 */
async function waitForTerminal2(runner: InstanceType<typeof JobRunner>, jobId: string, expectState: string) {
  await vi.waitFor(() => {
    const job = runner.getById(jobId)
    if (!job || job.state !== expectState) throw new Error(`job ${jobId} 未到达终态 ${expectState}（当前：${job?.state}）`)
  })
  return runner.getById(jobId)!
}
