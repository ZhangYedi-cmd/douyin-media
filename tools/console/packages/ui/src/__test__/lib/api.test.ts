import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getToken, assetUrl, apiGet, apiGetText, postAction, postJob, cancelJob, cancelAllJobs, ApiError } from '../../lib/api'

// lib/api.ts 单测：token 读写、URL 拼装、GET/POST 的信封适配与错误路径。
// vitest 默认 node 环境没有 window/localStorage，getToken 的 hash 读取分支用 vi.stubGlobal
// 手搭一个最小 window shim（不引入 jsdom——那是新依赖，红线 6 要求先登记依赖表理由，
// 本波不需要为此单测扩大依赖面）。

function stubWindow(hash: string, storedToken?: string) {
  const store = new Map<string, string>()
  if (storedToken !== undefined) store.set('console.token', storedToken)
  let href = `http://localhost:5173/${hash}`
  const win = {
    location: {
      get hash() {
        return hash
      },
      get href() {
        return href
      },
    },
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v)
      },
    },
    history: {
      replaceState: vi.fn((_state: unknown, _title: string, url: string) => {
        href = url
      }),
    },
  }
  vi.stubGlobal('window', win)
  return win
}

beforeEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('getToken', () => {
  it('无 window（SSR/纯 node 环境）兜底返回空串', () => {
    expect(getToken()).toBe('')
  })

  it('首次从 location.hash 读 #token=…，存 localStorage 并清 hash（02 §2.0：hash 不进访问日志）', () => {
    const win = stubWindow('#token=abc123')
    expect(getToken()).toBe('abc123')
    expect(win.localStorage.getItem('console.token')).toBe('abc123')
    expect(win.history.replaceState).toHaveBeenCalledOnce()
    const clearedUrl = (win.history.replaceState.mock.calls[0] as unknown[])[2] as string
    expect(clearedUrl).not.toContain('#token=')
  })

  it('无 hash 时从 localStorage 读回已存 token', () => {
    stubWindow('', 'stored-tkn')
    expect(getToken()).toBe('stored-tkn')
  })

  it('hash 值需 decodeURIComponent（token 可能含被编码字符）', () => {
    stubWindow(`#token=${encodeURIComponent('a+b/c')}`)
    expect(getToken()).toBe('a+b/c')
  })
})

describe('assetUrl', () => {
  it('拼装 /api/asset?path=…&token=…（img/a 标签带不了头，token 走 query，02 §2.0）', () => {
    stubWindow('', 'tkn-x')
    expect(assetUrl('content/2026-08-18/ep/assets/cover.png')).toBe(
      '/api/asset?path=content%2F2026-08-18%2Fep%2Fassets%2Fcover.png&token=tkn-x',
    )
  })
})

describe('apiGet / apiGetText', () => {
  it('apiGet 带 Authorization: Bearer 头，非 2xx 抛 ApiError 并把 server 错误信封的 message 带出', async () => {
    stubWindow('', 'tkn-y')
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      text: () => Promise.resolve(JSON.stringify({ error: { code: 'NOT_FOUND', message: '内容条目不存在：x' } })),
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(apiGet('/api/content/x')).rejects.toMatchObject({ status: 404, message: '内容条目不存在：x' })
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tkn-y')
  })

  it('apiGetText 解一层 /api/file 的 ApiEnvelope，只回文本内容', async () => {
    stubWindow('', '')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify({ revision: 3, now: 'x', data: { content: '口播稿正文', size: 6, mtime: 'x', truncated: false } })),
      }),
    )
    await expect(apiGetText('/api/file?path=a.md')).resolves.toBe('口播稿正文')
  })

  it('apiGetText 响应缺 data.content 时抛 ApiError（而不是静默返回 undefined）', async () => {
    stubWindow('', '')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, status: 200, text: () => Promise.resolve(JSON.stringify({ revision: 1, now: 'x', data: {} })) }),
    )
    await expect(apiGetText('/api/file?path=a.md')).rejects.toBeInstanceOf(ApiError)
  })
})

describe('postAction', () => {
  it('成功路径：把 server ActionOkResponse.result.writes 映射成 changes，result 整体序列化进 stdout', async () => {
    stubWindow('', '')
    const mediaResult = {
      ok: true,
      cmd: 'flip',
      data: {},
      writes: [{ path: 'content/x/meta.yaml', fields: ['status'], diff: '- review\n+ approved' }],
    }
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify({ ok: true, dryRun: true, result: mediaResult, check: null })),
      }),
    )

    const result = await postAction('review', { slug: 'x', decision: 'approved' }, { dryRun: true })
    expect(result.ok).toBe(true)
    expect(result.dryRun).toBe(true)
    expect(result.changes).toEqual([{ path: 'content/x/meta.yaml', summary: '- review\n+ approved' }])
    expect(result.stdout).toContain('"cmd": "flip"')
  })

  it('无 diff 时 summary 退化成"字段变更：..."列表', async () => {
    stubWindow('', '')
    const mediaResult = { ok: true, cmd: 'flip', data: {}, writes: [{ path: 'content/x/meta.yaml', fields: ['status', 'timestamps'] }] }
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify({ ok: true, dryRun: false, result: mediaResult, check: { errors: 0, warns: 0, infos: 0 } })),
      }),
    )
    const result = await postAction('review', { slug: 'x', decision: 'approved' })
    expect(result.changes[0]!.summary).toBe('字段变更：status, timestamps')
  })

  it('失败路径：非 2xx 不抛异常，返回 { ok:false, error }（调用方靠 ok 字段分支，S5 约定）', async () => {
    stubWindow('', '')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        text: () => Promise.resolve(JSON.stringify({ error: { code: 'MEDIA_REJECTED', message: '非法状态迁移' } })),
      }),
    )
    const result = await postAction('review', { slug: 'x', decision: 'approved' })
    expect(result).toEqual({ ok: false, dryRun: false, changes: [], stdout: '', error: '非法状态迁移' })
  })

  it('POST body 统一含 dryRun 字段（03 §3.3 C10 约定）', async () => {
    stubWindow('', '')
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, status: 200, text: () => Promise.resolve(JSON.stringify({ ok: true, dryRun: true, result: null, check: null })) })
    vi.stubGlobal('fetch', fetchMock)

    await postAction('promote', { auto: true, slug: 'ep19' }, { dryRun: true })
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    const body = JSON.parse(init.body as string) as Record<string, unknown>
    expect(body).toEqual({ auto: true, slug: 'ep19', dryRun: true })
  })
})

describe('postJob', () => {
  it('202 成功：回传 jobId', async () => {
    stubWindow('', '')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 202,
        text: () => Promise.resolve(JSON.stringify({ jobId: 'publish-20260818-abcd', statusUrl: '/api/jobs/x', sseEvent: 'job:x' })),
      }),
    )
    await expect(postJob('publish', { slug: 'x' })).resolves.toEqual({ jobId: 'publish-20260818-abcd' })
  })

  it('409（重复提交等）抛 ApiError，不静默吞掉', async () => {
    stubWindow('', '')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        text: () => Promise.resolve(JSON.stringify({ error: { code: 'JOB_DUPLICATE', message: '已有同 slug 任务在跑' } })),
      }),
    )
    await expect(postJob('publish', { slug: 'x' })).rejects.toMatchObject({ status: 409, message: '已有同 slug 任务在跑' })
  })

  // I 号（2026-08-19）：治理线「运行」与看板「开始创作」两个新入口共用 postJob，锁定它们各自的
  // 路径映射（JOB_ACTION_PATH 新增的两条），防止路径拼错导致 404 却被 postAction 的宽松测试盖住。
  it('harness-run 打 /api/actions/harness-run，body 透传 task', async () => {
    stubWindow('', '')
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 202,
      text: () => Promise.resolve(JSON.stringify({ jobId: 'harness-run-20260819-abcd' })),
    })
    vi.stubGlobal('fetch', fetchMock)
    await expect(postJob('harness-run', { task: 'retro' })).resolves.toEqual({ jobId: 'harness-run-20260819-abcd' })
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/actions/harness-run')
    expect(JSON.parse(init.body as string)).toEqual({ task: 'retro' })
  })

  it('create 打 /api/actions/create，body 透传 slug', async () => {
    stubWindow('', '')
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 202,
      text: () => Promise.resolve(JSON.stringify({ jobId: 'create-20260819-abcd' })),
    })
    vi.stubGlobal('fetch', fetchMock)
    await expect(postJob('create', { slug: 'ep19' })).resolves.toEqual({ jobId: 'create-20260819-abcd' })
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/actions/create')
    expect(JSON.parse(init.body as string)).toEqual({ slug: 'ep19' })
  })
})

// 2026-08-19 增补（看板「取消任务」能力，J 号执行）：cancelJob/cancelAllJobs 是取消的唯一 fetch
// 出口（不走 postJob 那套 202 信封，直接 200 拿真实结果，见 lib/api.ts 头注）。
describe('cancelJob', () => {
  it('成功：POST /api/jobs/:id/cancel，回传 job 快照', async () => {
    stubWindow('', 'tkn')
    const job = { id: 'harness-run-x', type: 'harness-run', state: 'cancelled', milestones: [], narration: [], stalling: false, logPath: 'x' }
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, text: () => Promise.resolve(JSON.stringify({ ok: true, job })) })
    vi.stubGlobal('fetch', fetchMock)

    await expect(cancelJob('harness-run-x')).resolves.toEqual(job)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/jobs/harness-run-x/cancel')
    expect(init.method).toBe('POST')
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tkn')
  })

  it('id 需 URL 编码', async () => {
    stubWindow('', '')
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify({ ok: true, job: { id: 'a/b' } })),
    })
    vi.stubGlobal('fetch', fetchMock)
    await cancelJob('a/b')
    const [url] = fetchMock.mock.calls[0] as [string]
    expect(url).toBe('/api/jobs/a%2Fb/cancel')
  })

  it('404/409 抛 ApiError，不静默吞掉（查无此任务 / 任务已终结）', async () => {
    stubWindow('', '')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        text: () => Promise.resolve(JSON.stringify({ error: { code: 'PRECONDITION_FAILED', message: '任务已处于终结状态（succeeded），取消是无效操作' } })),
      }),
    )
    await expect(cancelJob('publish-x')).rejects.toMatchObject({ status: 409, message: '任务已处于终结状态（succeeded），取消是无效操作' })
  })

  it('2xx 但响应缺 job 字段时抛 ApiError（而不是返回 undefined）', async () => {
    stubWindow('', '')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, text: () => Promise.resolve(JSON.stringify({ ok: true })) }))
    await expect(cancelJob('publish-x')).rejects.toBeInstanceOf(ApiError)
  })
})

describe('cancelAllJobs', () => {
  it('成功：POST /api/jobs/cancel-all，回传 cancelledQueued/cancelledActive', async () => {
    stubWindow('', '')
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify({ ok: true, cancelledQueued: 2, cancelledActive: 'publish-x' })),
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(cancelAllJobs()).resolves.toEqual({ cancelledQueued: 2, cancelledActive: 'publish-x' })
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/jobs/cancel-all')
    expect(init.method).toBe('POST')
  })

  it('字段形状异常时兜底成 0/null，不抛异常炸掉界面', async () => {
    stubWindow('', '')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, text: () => Promise.resolve(JSON.stringify({ ok: true })) }))
    await expect(cancelAllJobs()).resolves.toEqual({ cancelledQueued: 0, cancelledActive: null })
  })
})
