// 范围声明同 jobs/runner.test.ts：只测 400/409（precheck 拒绝）与 GET 的磁盘降级路径，
// 不测 202 happy-path（会真的 spawn claude -p，见 jobs/runner.test.ts 头注）。
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { Hono } from 'hono'
import { afterAll, describe, expect, it } from 'vitest'
import type { SseHub } from '../../sse.js'
import { copyFixtureRepoToTemp, buildTestStore } from '../../../__test__/fixtures.js'
import { JobRunner } from '../../jobs/runner.js'
import { createJobRoutes } from '../../routes/jobs.js'
import type { Config } from '../../config.js'
import type { Job } from '../../api-types.js'

const consoleRootTmp = fs.mkdtempSync(path.join(os.tmpdir(), 'jobs-route-console-'))
afterAll(() => fs.rmSync(consoleRootTmp, { recursive: true, force: true }))
const logsDir = path.join(consoleRootTmp, 'logs/jobs')

const noopSse = { broadcast: () => {}, jobUpdate: () => {}, clientCount: () => 0, startPing: () => {}, stopPing: () => {} } as unknown as SseHub

function buildApp() {
  const repoRoot = copyFixtureRepoToTemp()
  const store = buildTestStore(repoRoot)
  const config: Config = { consoleRoot: consoleRootTmp, repoRoot, port: 5170, mediaBin: 'media', tokenPath: '/dev/null' }
  const runner = new JobRunner({ config, store, sse: noopSse })
  const app = new Hono()
  app.route('/', createJobRoutes({ runner, logsDir }))
  return app
}

async function post(app: Hono, url: string, body: unknown) {
  return app.request(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
}

// 2026-08-19 增补：GET /api/jobs/history 测试用的最小 Job 构造器 + 磁盘落盘助手。
function makeJob(overrides: Partial<Job> & { id: string }): Job {
  return {
    type: 'create',
    state: 'succeeded',
    milestones: [],
    narration: [],
    stalling: false,
    logPath: `logs/jobs/${overrides.id}.jsonl`,
    ...overrides,
  }
}

function writeResultJson(job: Job): void {
  fs.mkdirSync(logsDir, { recursive: true })
  fs.writeFileSync(path.join(logsDir, `${job.id}.result.json`), JSON.stringify(job))
}

describe('POST /api/actions/publish', () => {
  it('缺 slug → 400', async () => {
    const app = buildApp()
    const res = await post(app, '/api/actions/publish', {})
    expect(res.status).toBe(400)
  })

  it('非 approved 条目 → 409 PRECONDITION_FAILED', async () => {
    const app = buildApp()
    const res = await post(app, '/api/actions/publish', { slug: 'review-sample' })
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error.code).toBe('PRECONDITION_FAILED')
  })
})

describe('POST /api/actions/rework', () => {
  it('缺 reason → 400', async () => {
    const app = buildApp()
    const res = await post(app, '/api/actions/rework', { slug: 'review-sample' })
    expect(res.status).toBe(400)
  })

  it('状态不合法（published-sample）→ 409', async () => {
    const app = buildApp()
    const res = await post(app, '/api/actions/rework', { slug: 'published-sample', reason: 'x' })
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error.code).toBe('PRECONDITION_FAILED')
  })
})

describe('POST /api/actions/apply-proposal', () => {
  it('report 路径格式非法 → 400', async () => {
    const app = buildApp()
    const res = await post(app, '/api/actions/apply-proposal', { report: '/etc/passwd' })
    expect(res.status).toBe(400)
  })

  it('已 applied 的报告 → 409', async () => {
    const app = buildApp()
    const res = await post(app, '/api/actions/apply-proposal', { report: 'harness/logs/2030-01-01-backlog-gardener.md' })
    expect(res.status).toBe(409)
  })
})

// 2026-08-19 增补两条（用户走查提的手动触发能力，H 号执行；02-后端执行方案.md 未覆盖此二型，
// 契约由总指挥直接在 api-types.ts/defs.ts 落地）。同样只测 400/409——202 会真的 spawn `claude -p`。

describe('POST /api/actions/harness-run', () => {
  it('缺 task → 400', async () => {
    const app = buildApp()
    const res = await post(app, '/api/actions/harness-run', {})
    expect(res.status).toBe(400)
  })

  it('task 为空字符串 → 400', async () => {
    const app = buildApp()
    const res = await post(app, '/api/actions/harness-run', { task: '  ' })
    expect(res.status).toBe(400)
  })

  it('task 未注册（fixture 无此任务）→ 409 PRECONDITION_FAILED', async () => {
    const app = buildApp()
    const res = await post(app, '/api/actions/harness-run', { task: '不存在' })
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error.code).toBe('PRECONDITION_FAILED')
  })

  it('task 已注册但未启用（fixture disabled-task）→ 409 PRECONDITION_FAILED', async () => {
    const app = buildApp()
    const res = await post(app, '/api/actions/harness-run', { task: 'disabled-task' })
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error.code).toBe('PRECONDITION_FAILED')
  })
})

describe('POST /api/actions/create', () => {
  it('slug 格式非法 → 400', async () => {
    const app = buildApp()
    const res = await post(app, '/api/actions/create', { slug: '不合法 slug' })
    expect(res.status).toBe(400)
  })

  it('缺 slug → 400', async () => {
    const app = buildApp()
    const res = await post(app, '/api/actions/create', {})
    expect(res.status).toBe(400)
  })

  it('状态不是 ideated（review-sample 是 review）→ 409 PRECONDITION_FAILED', async () => {
    const app = buildApp()
    const res = await post(app, '/api/actions/create', { slug: 'review-sample' })
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error.code).toBe('PRECONDITION_FAILED')
  })
})

// 2026-08-19 增补（看板「取消任务」能力，J 号执行）：路由层只测不需要真 spawn `claude -p` 的路径——
// 查无此任务 404、以及「全部取消」空态下的成功回包。cancelJob 只查 runner 内存表（不像
// GET /api/jobs/:id 有磁盘降级），本文件的 buildApp() 每次都建一个全新 runner、内存表为空，
// 没有不 spawn 就能把任务喂进"已终结"状态的手段——「取消已终结任务 → 409」这条分支的完整覆盖
// 在 jobs/runner.lifecycle.test.ts（mock 过 @console/cc-stream，能安全走完整个生命周期）。
describe('POST /api/jobs/:id/cancel', () => {
  it('查无此任务 → 404 NOT_FOUND', async () => {
    const app = buildApp()
    const res = await post(app, '/api/jobs/publish-nonexistent-0000/cancel', {})
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error.code).toBe('NOT_FOUND')
  })
})

describe('POST /api/jobs/cancel-all', () => {
  it('没有任何进行中任务时调用：200，cancelledQueued=0，cancelledActive=null（不是错误）', async () => {
    const app = buildApp()
    const res = await app.request('/api/jobs/cancel-all', { method: 'POST' })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ ok: true, cancelledQueued: 0, cancelledActive: null })
  })
})

// 2026-08-19 增补（详情页「执行记录」tab 需求；见 api-types.ts JobHistoryData 头注：GET /api/jobs
// 的 recent 只兜底近 24h 内存表，磁盘全量重建又只在内存表整体为空时才触发，超过 24h 的历史任务
// 永久不可见——这个新端点补的正是这个缺口）。这里只测不需要真 spawn `claude -p` 的路径：参数校验、
// 路由注册顺序、磁盘全量扫描 + 过滤 + 排序 + 单文件解析失败容错。「内存版本覆盖磁盘版本」那条分支
// 需要把一个任务真正推进到 running/succeeded（要 mock @console/cc-stream），归属
// jobs/runner.lifecycle.test.ts，不在本文件重复。
describe('GET /api/jobs/history', () => {
  it('slug 和 task 都不传 → 400 BAD_PARAM', async () => {
    const app = buildApp()
    const res = await app.request('/api/jobs/history')
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error.code).toBe('BAD_PARAM')
  })

  it('slug 和 task 同时传 → 400 BAD_PARAM', async () => {
    const app = buildApp()
    const res = await app.request('/api/jobs/history?slug=history-slug-a&task=history-task-a')
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error.code).toBe('BAD_PARAM')
  })

  it('slug 格式非法 → 400 BAD_PARAM', async () => {
    const app = buildApp()
    const res = await app.request('/api/jobs/history?slug=' + encodeURIComponent('not a valid slug!'))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error.code).toBe('BAD_PARAM')
  })

  it('task 格式非法（含非法字符）→ 400 BAD_PARAM', async () => {
    const app = buildApp()
    const res = await app.request('/api/jobs/history?task=' + encodeURIComponent('Not_Valid_Task'))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error.code).toBe('BAD_PARAM')
  })

  it('路由注册顺序：/api/jobs/history 优先于 /api/jobs/:id 命中，不会被当成 job id 处理', async () => {
    // 若注册顺序颠倒，这条请求会先落进 `GET /api/jobs/:id`（id="history"），查无此任务 404，
    // message 里会带上 "history" 这个假 id；正确顺序下应该是本端点的 200 信封响应。
    const app = buildApp()
    const res = await app.request('/api/jobs/history?slug=history-order-check-nonexistent')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.error).toBeUndefined()
    expect(body.data.jobs).toEqual([])
  })

  it('响应信封含 revision/now/data（与既有读接口的 ApiEnvelope 一致）', async () => {
    const app = buildApp()
    const res = await app.request('/api/jobs/history?slug=history-slug-envelope-check')
    const body = await res.json()
    expect(typeof body.revision).toBe('number')
    expect(typeof body.now).toBe('string')
    expect(Array.isArray(body.data.jobs)).toBe(true)
  })

  it('磁盘全量扫描：按 slug 命中多条 result.json，过滤掉不匹配的，按 startedAt 倒序', async () => {
    const older = makeJob({
      id: 'create-20300102000000-aaa1',
      slug: 'history-slug-order',
      startedAt: '2030-01-02T00:00:00.000Z',
      endedAt: '2030-01-02T00:01:00.000Z',
    })
    const newer = makeJob({
      id: 'create-20300103000000-aaa2',
      slug: 'history-slug-order',
      startedAt: '2030-01-03T00:00:00.000Z',
      endedAt: '2030-01-03T00:01:00.000Z',
    })
    const unrelated = makeJob({ id: 'create-20300104000000-aaa3', slug: 'history-slug-order-unrelated', startedAt: '2030-01-04T00:00:00.000Z' })
    writeResultJson(older)
    writeResultJson(newer)
    writeResultJson(unrelated)

    const app = buildApp()
    const res = await app.request('/api/jobs/history?slug=history-slug-order')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.jobs.map((j: Job) => j.id)).toEqual([newer.id, older.id])
  })

  it('按 task 命中（harness-run 型 Job.task，不是 slug）', async () => {
    const job = makeJob({
      id: 'harness-run-20300105000000-bbb1',
      type: 'harness-run',
      task: 'history-task-check',
      startedAt: '2030-01-05T00:00:00.000Z',
    })
    writeResultJson(job)
    const app = buildApp()
    const res = await app.request('/api/jobs/history?task=history-task-check')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.jobs.map((j: Job) => j.id)).toEqual([job.id])
  })

  it('磁盘上某个 result.json 解析失败：跳过它，不影响其它匹配项正常返回（一条坏数据不拖垮整个列表）', async () => {
    fs.mkdirSync(logsDir, { recursive: true })
    fs.writeFileSync(path.join(logsDir, 'create-20300106000000-ccc1.result.json'), '{not valid json')
    const good = makeJob({ id: 'create-20300106000001-ccc2', slug: 'history-slug-badjson', startedAt: '2030-01-06T00:00:01.000Z' })
    writeResultJson(good)

    const app = buildApp()
    const res = await app.request('/api/jobs/history?slug=history-slug-badjson')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.jobs.map((j: Job) => j.id)).toEqual([good.id])
  })
})

describe('GET /api/jobs/:id 崩溃降级', () => {
  it('内存表与磁盘都查无 → 404', async () => {
    const app = buildApp()
    const res = await app.request('/api/jobs/publish-nonexistent-0000')
    expect(res.status).toBe(404)
  })

  it('内存表 miss 但 <id>.result.json 存在 → 回放终态', async () => {
    fs.mkdirSync(logsDir, { recursive: true })
    const job: Job = {
      id: 'publish-20300101000000-aaaa',
      type: 'publish',
      slug: 'x',
      state: 'succeeded',
      milestones: [],
      narration: [],
      stalling: false,
      logPath: 'logs/jobs/publish-20300101000000-aaaa.jsonl',
      verdict: { ok: true, metaStatus: 'published' },
    }
    fs.writeFileSync(path.join(logsDir, `${job.id}.result.json`), JSON.stringify(job))
    const app = buildApp()
    const res = await app.request(`/api/jobs/${job.id}`)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.state).toBe('succeeded')
  })

  it('只有 <id>.jsonl（result.json 缺失，模拟 server 曾重启崩溃）→ state=unknown', async () => {
    fs.mkdirSync(logsDir, { recursive: true })
    const id = 'rework-20300101000001-bbbb'
    fs.writeFileSync(path.join(logsDir, `${id}.jsonl`), '{"type":"system"}\n')
    const app = buildApp()
    const res = await app.request(`/api/jobs/${id}`)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.state).toBe('unknown')
    expect(body.note).toContain('server 曾重启')
  })
})

describe('GET /api/jobs', () => {
  it('空状态：active null, queued/recent 空', async () => {
    const app = buildApp()
    const res = await app.request('/api/jobs')
    const body = await res.json()
    expect(body.active).toBeNull()
    expect(body.queued).toEqual([])
  })
})

// 2026-08-19 增补（用户需求"详情页看 CC 运行时全链路日志"，K 号执行数据侧）：GET /api/jobs/:id/log
// 回放端点。铁律验证点：id 校验（路径穿越防护）、日志不存在 404、以及"回放 = 与实时同一个
// createNormalizer() 重放整份 .jsonl"——用一份手写的 fixture jsonl（覆盖 thinking/tool/toolDone
// 结构化 stdout/say/done 全部 kind）直接断言归一后的结果，与 normalize.test.ts 的断言口径一致
// （同一份契约、两处各自独立验证，不是同一个测试的重复）。
describe('GET /api/jobs/:id/log', () => {
  it('id 格式非法（路径穿越）→ 400 BAD_PARAM', async () => {
    const app = buildApp()
    const res = await app.request('/api/jobs/' + encodeURIComponent('../../../../etc/passwd') + '/log')
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error.code).toBe('BAD_PARAM')
  })

  it('id 格式非法（不含时间戳/hex 后缀的裸字符串）→ 400 BAD_PARAM', async () => {
    const app = buildApp()
    const res = await app.request('/api/jobs/not-a-real-job-id/log')
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error.code).toBe('BAD_PARAM')
  })

  it('id 格式合法但日志文件不存在 → 404 NOT_FOUND', async () => {
    const app = buildApp()
    const res = await app.request('/api/jobs/create-20300101000000-aaaa/log')
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error.code).toBe('NOT_FOUND')
  })

  it('日志存在：回放出与实时路径同一套归一事件，响应信封含 revision/now/data', async () => {
    fs.mkdirSync(logsDir, { recursive: true })
    const id = 'create-20300101000001-bbbb'
    const lines = [
      JSON.stringify({ type: 'system', subtype: 'hook_started', hook_id: 'h1' }), // 应被 parseStream 过滤，不出现在结果里
      JSON.stringify({ type: 'system', subtype: 'init', session_id: 's1' }),
      JSON.stringify({
        type: 'assistant',
        timestamp: '2030-01-01T00:00:01.000Z',
        message: { id: 'm1', content: [{ type: 'thinking', thinking: 'hmm' }] },
      }),
      JSON.stringify({
        type: 'assistant',
        timestamp: '2030-01-01T00:00:02.000Z',
        message: { id: 'm1', content: [{ type: 'tool_use', id: 'toolu_1', name: 'Bash', input: { command: 'echo hi' } }] },
      }),
      JSON.stringify({
        type: 'user',
        timestamp: '2030-01-01T00:00:03.000Z',
        message: { content: [{ type: 'tool_result', tool_use_id: 'toolu_1', is_error: false, content: 'hi' }] },
        tool_use_result: { stdout: 'hi', stderr: '', interrupted: false, isImage: false, noOutputExpected: false },
      }),
      JSON.stringify({ type: 'result', is_error: false, total_cost_usd: 0.01, num_turns: 1, duration_api_ms: 100 }),
    ]
    fs.writeFileSync(path.join(logsDir, `${id}.jsonl`), lines.join('\n') + '\n')

    const app = buildApp()
    const res = await app.request(`/api/jobs/${id}/log`)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(typeof body.revision).toBe('number')
    expect(typeof body.now).toBe('string')
    expect(body.data.jobId).toBe(id)
    expect(body.data.events).toEqual([
      { kind: 'started', sessionId: 's1' },
      { kind: 'thinking', text: 'hmm', at: '2030-01-01T00:00:01.000Z' },
      { kind: 'tool', id: 'toolu_1', name: 'Bash', input: { command: 'echo hi' }, at: '2030-01-01T00:00:02.000Z' },
      {
        kind: 'toolDone',
        id: 'toolu_1',
        ok: true,
        at: '2030-01-01T00:00:03.000Z',
        preview: 'hi',
        truncated: false,
        bytes: 2,
        interrupted: false,
      },
      { kind: 'done', ok: true, costUsd: 0.01, turns: 1, durationMs: 100 },
    ])
  })
})
