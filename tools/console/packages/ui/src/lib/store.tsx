// lib/store.tsx：ConsoleProvider（全站唯一全局态：revision / SSE 状态 / jobs Map）（03 §2.10）。
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { apiGet, ApiError } from './api'
import { connectSse } from './sse'
import type { SseConnection, SseState } from './sse'
// 契约路径 '@console/server/api-types' 在 ui 侧不可解析，改用真实产物路径（详见 lib/api.ts 顶部说明）。
import type { Job, JobLogEvent, JobsListData } from '@console/server/api-types'

interface ConsoleStateValue {
  revision: number
  sseState: SseState
  jobs: Record<string, Job>
  reloadTick: number
}

interface ConsoleActionsValue {
  /** 全局手动刷新（见下方 useReloadAll 的说明）。 */
  reloadAll(): void
  /**
   * S5 新增（lib/actions.tsx useJobAction 消费，不在 §2.10 签名内——同 useReloadAll 先例，
   * 登记于此供 S4 起各消费方与验收对照）：postJob 202 拿到 jobId 后，用它把 SSE 连接注册上
   * `job:<id>` 这个动态具名事件的监听（sse.ts 的 watchJob 本身只能在连接内部调用，这里转发出去）。
   */
  watchJob(id: string): void
  /**
   * S5 新增：postJob 成功后立即把一个 queued 占位 Job 塞进全局 jobs 态，JobPanel 不必等第一条
   * SSE 广播才有东西可画（§2.10 useJobAction 原文「postJob → 202 → jobs Map 立即挂 queued 项」）；
   * 随后同一 id 上的 SSE `job:<id>` 全量快照会覆盖这条占位（mergeJob 幂等语义，见下方）。
   */
  upsertJob(job: Job): void
  /**
   * 2026-08-19 增补（CC 运行日志查看功能，K 号数据侧落地契约，见 sse.ts SseConnection.watchJobLog
   * 头注释）：`job-log:<id>` 追加语义订阅的转发出口，供 JobLogView 在关注某个进行中任务时调用。
   * 返回取消订阅函数；连接尚未建立（connRef.current 为空，只有整个 app 刚挂载那一瞬间可能发生）
   * 时给一个 no-op 兜底，调用方不必判空。
   */
  watchJobLog(id: string, onEvent: (payload: JobLogEvent) => void): () => void
}

/**
 * SSE `job:<id>` 广播与 GET /api/jobs 初拉共用的合并语义：整条全量覆盖（02 §2.1 契约：幂等可覆盖、
 * 抗丢事件，不做增量 patch）。抽成纯函数单独导出，供「SSE job 事件合并逻辑」的单测覆盖
 * ——本包无 jsdom（05 §7 测试基建约束，见 lib/api.test.ts 顶部说明），ConsoleProvider 本体的
 * useEffect/useState 无法用 vitest 直接渲染断言，这层纯函数是可单测的落点。
 */
export function mergeJob(jobs: Record<string, Job>, job: Job): Record<string, Job> {
  return { ...jobs, [job.id]: job }
}

const ConsoleStateContext = createContext<ConsoleStateValue | null>(null)
const ConsoleActionsContext = createContext<ConsoleActionsValue | null>(null)

function useConsoleState(): ConsoleStateValue {
  const ctx = useContext(ConsoleStateContext)
  if (!ctx) throw new Error('useRevision/useSseState/useJobs/useJob/usePageData 必须在 <ConsoleProvider> 内使用')
  return ctx
}

export function ConsoleProvider({ children }: { children: ReactNode }) {
  const [revision, setRevision] = useState(0)
  const [sseState, setSseState] = useState<SseState>('connecting')
  const [jobs, setJobs] = useState<Record<string, Job>>({})
  const [reloadTick, setReloadTick] = useState(0)
  // watchJob 要能从 useJobAction（S5，挂载点在各页按钮点击时机，晚于本 effect）转发调用，
  // 而 conn 只活在这个 effect 闭包里——存进 ref 供 actions.watchJob 在 effect 外读取。
  const connRef = useRef<SseConnection | null>(null)

  useEffect(() => {
    const conn = connectSse({
      onRefresh: (rev) => setRevision(rev),
      onJob: (job) => setJobs((prev) => mergeJob(prev, job)),
      onState: (s) => setSseState(s),
    })
    connRef.current = conn

    // 初拉 GET /api/jobs（2026-08-18 增补，03 §2.10/§3.3 C11）：刷新页面后 JobPanel 不失明。
    // 合并 active/queued/recent 进 map；对每个已知 id 注册 SSE 监听——job:<id> 是动态具名事件，
    // 得先知道 id 才能 addEventListener，漏听的中间态由下一发全量快照或 GET /api/jobs/:id 补齐。
    let cancelled = false
    apiGet<JobsListData>('/api/jobs')
      .then((list) => {
        if (cancelled) return
        const initial: Job[] = [...(list.active ? [list.active] : []), ...list.queued, ...list.recent]
        if (initial.length === 0) return
        setJobs((prev) => initial.reduce((acc, job) => mergeJob(acc, job), prev))
        for (const job of initial) conn.watchJob(job.id)
      })
      .catch(() => {
        // 初拉失败不阻断 SSE 连接本身；job 若之后经由 postJob 产生（S5 起），到时单独 watchJob。
      })

    return () => {
      cancelled = true
      connRef.current = null
      conn.close()
    }
  }, [])

  const actions = useMemo<ConsoleActionsValue>(
    () => ({
      reloadAll: () => setReloadTick((t) => t + 1),
      watchJob: (id: string) => connRef.current?.watchJob(id),
      upsertJob: (job: Job) => setJobs((prev) => mergeJob(prev, job)),
      watchJobLog: (id: string, onEvent: (payload: JobLogEvent) => void) => connRef.current?.watchJobLog(id, onEvent) ?? (() => {}),
    }),
    [],
  )
  const state = useMemo<ConsoleStateValue>(
    () => ({ revision, sseState, jobs, reloadTick }),
    [revision, sseState, jobs, reloadTick],
  )

  return (
    <ConsoleStateContext.Provider value={state}>
      <ConsoleActionsContext.Provider value={actions}>{children}</ConsoleActionsContext.Provider>
    </ConsoleStateContext.Provider>
  )
}

export function useRevision(): number {
  return useConsoleState().revision
}

export function useSseState(): SseState {
  return useConsoleState().sseState
}

/** 挂载时 GET /api/jobs 初拉，此后 SSE `job:<id>` 全量覆盖（03 §2.10 增补）。 */
export function useJobs(): Job[] {
  const { jobs } = useConsoleState()
  return useMemo(() => Object.values(jobs), [jobs])
}

export function useJob(id: string | undefined): Job | undefined {
  const { jobs } = useConsoleState()
  return id ? jobs[id] : undefined
}

/**
 * 全局手动刷新——AppShell 顶栏「刷新」按钮的落地物（03 §2.2：调当前页与 health 的 reload()；兜底用，
 * 常态靠 SSE）。不在 §2.10 列出的五个签名之内，是本波为满足该 UI 需求新增的最小导出：
 * 让所有当前挂载的 usePageData 实例各自重拉一次，不改变全局 revision 本身（不与 SSE 的
 * revision 比对语义混淆）。未在契约里点名，故在此明确记录，供 S4 起各页消费方与验收对照。
 */
export function useReloadAll(): () => void {
  const ctx = useContext(ConsoleActionsContext)
  if (!ctx) throw new Error('useReloadAll 必须在 <ConsoleProvider> 内使用')
  return ctx.reloadAll
}

/** lib/actions.tsx useJobAction 专用（S5 新增，理由见 ConsoleActionsValue.watchJob 注释）。 */
export function useWatchJob(): (id: string) => void {
  const ctx = useContext(ConsoleActionsContext)
  if (!ctx) throw new Error('useWatchJob 必须在 <ConsoleProvider> 内使用')
  return ctx.watchJob
}

/** lib/actions.tsx useJobAction 专用（S5 新增，理由见 ConsoleActionsValue.upsertJob 注释）。 */
export function useUpsertJob(): (job: Job) => void {
  const ctx = useContext(ConsoleActionsContext)
  if (!ctx) throw new Error('useUpsertJob 必须在 <ConsoleProvider> 内使用')
  return ctx.upsertJob
}

/** components/JobLogView/JobLogView.tsx 专用（2026-08-19 新增，理由见 ConsoleActionsValue.watchJobLog 注释）。 */
export function useWatchJobLog(): (id: string, onEvent: (payload: JobLogEvent) => void) => () => void {
  const ctx = useContext(ConsoleActionsContext)
  if (!ctx) throw new Error('useWatchJobLog 必须在 <ConsoleProvider> 内使用')
  return ctx.watchJobLog
}

// ── usePageData ──────────────────────────────────────────────────────────

export interface PageDataState<T> {
  data: T | undefined // 首拉前 undefined（页面渲 Skeleton）
  error: ApiError | null
  stale: boolean // revision 已前进 / 手动 reload 触发、重拉进行中（旧数据保持显示）
  reload(): void // 顶栏手动刷新兜底用
}

/**
 * 标准读接口出参信封是 `{ revision, now, data: T }`（02 §2.0 ApiEnvelope）；但 /api/health、
 * /api/jobs 两个端点是例外——响应本身即扁平 T，没有外层 `data` 包裹（已用真实 server 实测确认，
 * 见验收报告）。这里做一次通用识别：命中顶层 `data` 字段就解一层，否则原样返回，两种真实形状
 * 都能吃，不必为每个端点各写一套 unwrap。
 */
function unwrapEnvelope<T>(raw: unknown): T {
  if (raw && typeof raw === 'object' && raw !== null && 'data' in (raw as Record<string, unknown>)) {
    return (raw as { data: T }).data
  }
  return raw as T
}

/**
 * 页级数据 hook（03 §2.10/§3 语义）：挂载 fetch；useRevision() 变化或手动 reload() → 自动重拉；
 * 重拉只换 data，组件自身 state（展开行/筛选值/滚动位）原地不动——本 hook 不清空旧 data，只是在
 * `stale` 短暂为 true 期间背后重拉，成功后原地替换。用自增 requestId 防竞态：慢响应即使后到，
 * 如果已经不是最新一次请求就直接丢弃，不会用旧数据覆盖新数据。
 */
export function usePageData<T>(url: string): PageDataState<T> {
  const { revision, reloadTick } = useConsoleState()
  const [data, setData] = useState<T | undefined>(undefined)
  const [error, setError] = useState<ApiError | null>(null)
  const [stale, setStale] = useState(false)
  const [localTick, setLocalTick] = useState(0)
  const requestIdRef = useRef(0)
  const hasLoadedRef = useRef(false)

  useEffect(() => {
    const requestId = ++requestIdRef.current
    if (hasLoadedRef.current) setStale(true)

    apiGet<unknown>(url)
      .then((raw) => {
        if (requestIdRef.current !== requestId) return // 已有更新的请求在途/完成，丢弃这次过期响应
        hasLoadedRef.current = true
        setData(unwrapEnvelope<T>(raw))
        setError(null)
        setStale(false)
      })
      .catch((err: unknown) => {
        if (requestIdRef.current !== requestId) return
        setError(err instanceof ApiError ? err : new ApiError(err instanceof Error ? err.message : String(err), 0))
        setStale(false)
      })
  }, [url, revision, reloadTick, localTick])

  const reload = useCallback(() => setLocalTick((t) => t + 1), [])

  return { data, error, stale, reload }
}
