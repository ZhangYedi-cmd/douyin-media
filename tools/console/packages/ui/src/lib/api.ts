// lib/api.ts：全站唯一 fetch 出口（03-前端执行方案.md §2.10 / 后端鉴权契约 02 §2.0）。
// 组件内一律不裸 fetch（AI 约定 2）——数据读走 usePageData（lib/store.tsx），写动作走本文件的
// postAction/postJob（S5 起由 lib/actions.tsx 的 useAction/useJobAction 消费）。
//
// 类型来源说明（05 §5D 销账 lib/types.ts 临时镜像）：
// - 领域类型（Alert/MetaStatus/…）唯一真相源 = @console/core，各文件按需直接 type-only import。
// - Job/JobState/HealthData 等 API 层类型唯一宿主 = packages/server/src/api-types.ts。
//   契约字面导入路径本应是 '@console/server/api-types'（03 §2.10 原文），但该包 package.json
//   未声明 exports/types/main（无 "." 导出、无该子路径映射），此路径在 ui 侧无法解析
//   （已用 tsc 实测：`Cannot find module '@console/server/api-types'`）。因白名单不许碰 server 包，
//   这里改用其真实产物路径 '@console/server/api-types'（workspace 符号链接下可解析，已实测通过）
//   作为过渡；这是本波唯一的契约路径偏差，已在验收报告中登记为未决项，建议 C 补一条
//   exports["./api-types"] 映射（或 package.json 补 types 字段）来正式打开这个子路径。
import type { Job, JobHistoryData, JobLogData } from '@console/server/api-types'
// NormEvent 是 @console/cc-stream 的公共类型（无头 CC 观察器归一层，2026-08-19 扩容为 6 种事件，
// 见该包 src/types.ts 顶部注释）——与上面 @console/server/api-types 同为「type-only 交接物」，
// 该包 package.json 声明了 main/types 且在 workspace 内已符号链接（`npm install` 早前已跑过、
// 无需为本次改动新增依赖声明），bundler 解析能直接找到，未见 lib/api.ts 顶部那种子路径缺失问题。
import type { NormEvent } from '@console/cc-stream'

const TOKEN_STORAGE_KEY = 'console.token'

/** 全站统一的读写失败异常：携带 HTTP 状态码与（若有）server 的错误信封原文，供调用方按 code 分支。 */
export class ApiError extends Error {
  status: number
  body?: unknown
  constructor(message: string, status: number, body?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

/**
 * 鉴权 token 的唯一读写入口（02 §2.0/§2.8）：首次从 location.hash 读 `#token=…`
 * （hash 不进 server 访问日志）→ 存 localStorage('console.token') → history.replaceState 清 hash；
 * 之后每次调用都从 localStorage 读，SSR/无 window 环境（如 vitest node 环境）兜底返回空串。
 */
export function getToken(): string {
  if (typeof window === 'undefined') return ''
  const m = /#token=([^&]+)/.exec(window.location.hash)
  if (m?.[1]) {
    const token = decodeURIComponent(m[1])
    try {
      window.localStorage.setItem(TOKEN_STORAGE_KEY, token)
    } catch {
      // localStorage 不可用（隐私模式等）：本次请求仍可用刚读到的 token，只是刷新后要重新带 #token=。
    }
    const url = new URL(window.location.href)
    url.hash = ''
    window.history.replaceState(null, '', url.toString())
    return token
  }
  try {
    return window.localStorage.getItem(TOKEN_STORAGE_KEY) ?? ''
  } catch {
    return ''
  }
}

function authHeaders(): HeadersInit {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function readBodySafe(res: Response): Promise<unknown> {
  const text = await res.text().catch(() => '')
  if (!text) return undefined
  try {
    return JSON.parse(text) as unknown
  } catch {
    return text
  }
}

function messageFrom(body: unknown, fallback: string): string {
  if (body && typeof body === 'object' && 'error' in body) {
    const err = (body as { error?: { code?: unknown; message?: unknown } }).error
    if (err && typeof err.message === 'string') {
      // 首开裸 URL 是人人必撞的坑：401 时直接告诉用户去哪拿带 token 的入口
      if (err.code === 'AUTH_BAD_TOKEN') {
        return `${err.message}——首次使用请用带 token 的链接打开（终端跑 bash tools/console/start.sh status 会打印），打开一次后浏览器会记住`
      }
      return err.message
    }
  }
  return fallback
}

/** 全站唯一 GET 出口：带 Authorization: Bearer 头，非 2xx 抛 ApiError。T 由调用方指定（原始响应体的形状）。 */
export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(path, { headers: authHeaders() })
  const body = await readBodySafe(res)
  if (!res.ok) {
    throw new ApiError(messageFrom(body, `GET ${path} 失败：HTTP ${res.status}`), res.status, body)
  }
  return body as T
}

/**
 * `/api/file` 专用：出参信封是 `{ revision, now, data: { content, ... } }`（02 §2.1 FileReadData），
 * FileDrawer 只要纯文本，这里代为解一层。
 */
export async function apiGetText(path: string): Promise<string> {
  const envelope = await apiGet<{ data?: { content?: unknown } }>(path)
  const content = envelope.data?.content
  if (typeof content !== 'string') {
    throw new ApiError(`GET ${path} 响应缺少 data.content 字段`, 500, envelope)
  }
  return content
}

/** img/a 标签与 EventSource 无法带 Authorization 头，token 走 query（02 §2.0 约定）。 */
export function assetUrl(path: string): string {
  return `/api/asset?path=${encodeURIComponent(path)}&token=${encodeURIComponent(getToken())}`
}

export type FastAction = 'review' | 'backlog-apply' | 'promote' | 'next-up'
export type JobAction = 'publish' | 'rework' | 'apply-proposal' | 'harness-run' | 'create'

/** media `--dry-run --json` 的逐文件变更（对齐 server OkPayload.writes：WriteRecord{path,fields,diff?}）。 */
export interface FileChange {
  path: string
  summary: string
}

export interface ActionResult {
  ok: boolean
  dryRun: boolean
  changes: FileChange[]
  stdout: string
  error?: string
}

const FAST_ACTION_PATH: Record<FastAction, string> = {
  review: '/api/actions/review',
  'backlog-apply': '/api/actions/backlog-apply',
  promote: '/api/actions/promote',
  'next-up': '/api/actions/next-up',
}

const JOB_ACTION_PATH: Record<JobAction, string> = {
  publish: '/api/actions/publish',
  rework: '/api/actions/rework',
  'apply-proposal': '/api/actions/apply-proposal',
  'harness-run': '/api/actions/harness-run',
  create: '/api/actions/create',
}

interface MediaOkPayload {
  ok: true
  cmd: string
  data: unknown
  writes?: { path: string; fields: string[]; diff?: string }[]
  alerts?: unknown
}

/**
 * 4 条快写动作（review/backlog-apply/promote/next-up）的统一 POST 出口（02 §2.0/§2.2）。
 * server 的 `ActionOkResponse = { ok, dryRun, result, check }`（result = media --json 透传的 OkPayload）
 * 与 ui 侧 `ActionResult = { ok, dryRun, changes, stdout, error? }` 形状不同（03 §4 R2 已记该适配风险，
 * 约定收敛在本文件一处）：这里把 `result.writes` 映射成 `changes`，`result` 整体序列化成 `stdout` 供
 * dry-run Modal 折叠展示原文；错误路径把 server 错误信封的 message 摘出来放 `error`，不抛异常
 * ——调用方（S5 useAction）靠 `ok` 字段分支，不必额外 try/catch。
 */
export async function postAction(action: FastAction, payload: object, opts?: { dryRun?: boolean }): Promise<ActionResult> {
  const dryRun = opts?.dryRun ?? false
  const res = await fetch(FAST_ACTION_PATH[action], {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ ...payload, dryRun }),
  })
  const body = await readBodySafe(res)
  if (!res.ok) {
    return { ok: false, dryRun, changes: [], stdout: '', error: messageFrom(body, `${action} 失败：HTTP ${res.status}`) }
  }
  const result = (body as { result?: MediaOkPayload } | null)?.result
  const changes: FileChange[] = (result?.writes ?? []).map((w) => ({
    path: w.path,
    summary: w.diff ?? (w.fields.length > 0 ? `字段变更：${w.fields.join(', ')}` : ''),
  }))
  return { ok: true, dryRun, changes, stdout: result ? JSON.stringify(result, null, 2) : '' }
}

/** 5 条慢作业（publish/rework/apply-proposal/harness-run/create）的统一 POST 出口：202 受理，拿 jobId 后转交 SSE `job:<id>` 追踪。 */
export async function postJob(action: JobAction, payload: object): Promise<{ jobId: string }> {
  const res = await fetch(JOB_ACTION_PATH[action], {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(payload),
  })
  const body = await readBodySafe(res)
  if (!res.ok || res.status !== 202) {
    throw new ApiError(messageFrom(body, `${action} 提交失败：HTTP ${res.status}`), res.status, body)
  }
  const jobId = (body as { jobId?: unknown } | null)?.jobId
  if (typeof jobId !== 'string') {
    throw new ApiError(`${action} 202 响应缺少 jobId`, res.status, body)
  }
  return { jobId }
}

export async function getJob(id: string): Promise<Job> {
  return apiGet<Job>(`/api/jobs/${encodeURIComponent(id)}`)
}

/**
 * 2026-08-19 增补（CC 运行日志查看功能，L 号执行；数据契约由 K 号落地）：GET /api/jobs/:id/log，
 * 出参信封是标准 02 §2.0 ApiEnvelope<JobLogData>（`JobLogData = { jobId, events }`，K 号已在
 * @console/server/api-types.ts 落地，直接 type-only import 用其定义，不再手写内联形状）。
 * 手动解一层 data，写法对照 apiGetText；不走 usePageData——这是给单个 job 详情按需拉取的
 * 组件级数据（JobLogView 消费），不是页面级列表。404（任务太老、日志已被清理，或任务刚提交还
 * 没落盘）/400（id 格式非法）等错误原样抛 ApiError，调用方按 status 分支给出人话解释。
 */
export async function getJobLog(id: string): Promise<NormEvent[]> {
  const envelope = await apiGet<{ data?: JobLogData }>(`/api/jobs/${encodeURIComponent(id)}/log`)
  return envelope.data?.events ?? []
}

export interface JobHistoryParams {
  slug?: string
  task?: string
}

/**
 * 2026-08-19 增补（CC 运行日志查看功能，L 号执行；数据契约由 K 号落地）：
 * GET /api/jobs/history?slug=<slug> | ?task=<task>——`GET /api/jobs` 的 `recent` 只兜底近期
 * 内存表，一周前的任务永久不可见（总指挥实测发现），这个端点专门补长尾历史：按 startedAt 倒序、
 * 去重，上限 50。出参 `ApiEnvelope<JobHistoryData>`（`JobHistoryData = { jobs }`，K 号已在
 * @console/server/api-types.ts 落地）。slug/task 二选一——详情页「执行记录」tab 传 slug，
 * 治理线任务行展开传 task。
 */
export async function getJobHistory(params: JobHistoryParams): Promise<Job[]> {
  const query = params.slug ? `slug=${encodeURIComponent(params.slug)}` : `task=${encodeURIComponent(params.task ?? '')}`
  const envelope = await apiGet<{ data?: JobHistoryData }>(`/api/jobs/history?${query}`)
  return envelope.data?.jobs ?? []
}

// 2026-08-19 增补（看板「取消任务」能力）：取消是即时动作、不是慢作业，不走上面 postJob 的
// 202+jobId 信封——server 直接 200 回真实结果（见 server/routes/jobs.ts 头注）。lib/actions.tsx
// 的 useCancelJob 消费这两个出口，组件内不裸 fetch 的约定在此仍然成立（AI 约定 2）。

/** 取消一个任务：POST /api/jobs/:id/cancel。成功返回该任务的最新快照——queued 场景此时已是终态
 *  cancelled；running/verifying 场景子进程可能还没真正退出，只是 cancelRequested=true，真正的
 *  终态翻转交给既有 SSE `job:<id>` 推送。失败（404 查无此任务 / 409 任务已终结）抛 ApiError。 */
export async function cancelJob(id: string): Promise<Job> {
  const res = await fetch(`/api/jobs/${encodeURIComponent(id)}/cancel`, { method: 'POST', headers: authHeaders() })
  const body = await readBodySafe(res)
  if (!res.ok) {
    throw new ApiError(messageFrom(body, `取消任务失败：HTTP ${res.status}`), res.status, body)
  }
  const job = (body as { job?: Job } | null)?.job
  if (!job) throw new ApiError('取消任务响应缺少 job 字段', res.status, body)
  return job
}

export interface CancelAllResult {
  cancelledQueued: number
  cancelledActive: string | null
}

/** 全部取消：POST /api/jobs/cancel-all。永远 200（没有进行中任务时也合法，回 0/null），
 *  返回本次实际影响的任务数供调用方拼提示文案。 */
export async function cancelAllJobs(): Promise<CancelAllResult> {
  const res = await fetch('/api/jobs/cancel-all', { method: 'POST', headers: authHeaders() })
  const body = await readBodySafe(res)
  if (!res.ok) {
    throw new ApiError(messageFrom(body, `全部取消失败：HTTP ${res.status}`), res.status, body)
  }
  const result = body as { cancelledQueued?: unknown; cancelledActive?: unknown } | null
  return {
    cancelledQueued: typeof result?.cancelledQueued === 'number' ? result.cancelledQueued : 0,
    cancelledActive: typeof result?.cancelledActive === 'string' ? result.cancelledActive : null,
  }
}
