// lib/sse.ts：EventSource + revision 门卫（03-前端执行方案.md §2.10）。React 无关，可单测。
// job 事件消费 02 §2.1 契约：事件名 `job:<id>`、data = Job 全量快照（幂等可覆盖、抗丢事件，
// 2026-08-18 冲突 #2 裁定：不设增量 JobEvent 类型）。
import { apiGet, getToken } from './api'
// 契约路径 '@console/server/api-types' 在 ui 侧不可解析（server 包无 exports/types 字段），
// 改用其真实产物路径（详细说明见 lib/api.ts 顶部注释）；本行是同一未决项在本文件的复述。
import type { HealthData, Job, JobLogEvent } from '@console/server/api-types'

export type SseState = 'connecting' | 'open' | 'closed'

export interface SseHandlers {
  onRefresh(revision: number): void
  onJob(job: Job): void
  onState(s: SseState): void
}

export interface SseConnection {
  close(): void
  /** `job:<id>` 是动态具名事件，EventSource 需先注册才能收到；在得知 id 时调用
   *（useJobs 初拉 GET /api/jobs、或 postJob 202 返回后）。重复调用同一 id 是幂等的。 */
  watchJob(id: string): void
  /**
   * 2026-08-19 增补（CC 运行日志查看功能，K 号数据侧落地契约，见 @console/server/api-types.ts
   * JobLogEvent 头注释）：`job-log:<id>` 也是动态具名事件，但语义是**追加**（不是 `job:<id>`
   * 那种全量覆盖）——payload 带 seq，客户端按「seq < 回放长度则丢弃、否则按序 append」自己拼接
   * （JobLogView 消费，合并逻辑见 components/JobLogView/mergeLogEvents.ts）。
   * 回调不进 SseHandlers：日志消费方是按 job 分流的多个组件实例（可能同时有好几个 JobLogView
   * 关注不同/相同的 job），不是像 onJob 那样单例的全局 store handler，所以回调从参数传入。
   * 同一 id 允许多个订阅者（各自独立收到相同广播）；返回取消订阅函数，只解绑这一个回调——
   * 直到最后一个订阅者也取消后才真正 removeEventListener。close() 会把剩余的全部清理干净。
   */
  watchJobLog(id: string, onEvent: (payload: JobLogEvent) => void): () => void
}

interface RefreshPayload {
  revision: number
  reason?: string
}

/**
 * 建一条 SSE 连接。要点（03 §2.10 原文）：
 * ① EventSource 设不了自定义头 → URL 带 `?token=`；
 * ② 断线重连由 EventSource 内建；'open' 回调里 GET /api/health 比对 revision，
 *    不一致（含服务端重启后 revision 归零/回退）立即 onRefresh（丢事件 + revision 双保险）；
 * ③ 未知事件名（如 server 的 25s 心跳 'ping'）静默跳过——本实现只 addEventListener 已知的
 *    'refresh' 与逐个注册的 'job:<id>'，未注册的事件天然收不到回调，无需显式忽略逻辑；
 * ④ close() 会解绑全部 job 监听并把状态置 'closed'（供 React 卸载时清理，不残留监听器）。
 */
export function connectSse(handlers: SseHandlers): SseConnection {
  const url = `/api/events?token=${encodeURIComponent(getToken())}`
  const es = new EventSource(url)
  const jobListeners = new Map<string, (ev: MessageEvent) => void>()
  // job-log:<id> 每个 id 可能有多个订阅者（callbacks 集合），只在第一个订阅者到来时真正
  // addEventListener，最后一个订阅者取消后才 removeEventListener——比 jobListeners（每个 id
  // 恒定一个全局回调）多一层引用计数。
  const jobLogListeners = new Map<string, { esListener: (ev: MessageEvent) => void; callbacks: Set<(payload: JobLogEvent) => void> }>()
  let closed = false

  handlers.onState('connecting')

  es.addEventListener('open', () => {
    if (closed) return
    handlers.onState('open')
    apiGet<HealthData>('/api/health')
      .then((health) => {
        if (!closed) handlers.onRefresh(health.revision)
      })
      .catch(() => {
        // 探测失败不影响连接态判定；下一条 'refresh' 广播仍会驱动刷新。
      })
  })

  es.addEventListener('error', () => {
    if (closed) return
    // readyState: 0 CONNECTING（浏览器正在自动重连）/ 2 CLOSED（服务端拒绝或网络彻底不可达，不会自动重试）。
    handlers.onState(es.readyState === EventSource.CLOSED ? 'closed' : 'connecting')
  })

  es.addEventListener('refresh', (ev) => {
    try {
      const data = JSON.parse((ev as MessageEvent).data) as RefreshPayload
      if (typeof data.revision === 'number') handlers.onRefresh(data.revision)
    } catch {
      // 畸形 payload 静默跳过（前向兼容）。
    }
  })

  function watchJob(id: string): void {
    if (jobListeners.has(id)) return
    const listener = (ev: MessageEvent) => {
      try {
        const job = JSON.parse(ev.data) as Job
        handlers.onJob(job)
      } catch {
        // 畸形 payload 静默跳过。
      }
    }
    jobListeners.set(id, listener)
    es.addEventListener(`job:${id}`, listener as EventListener)
  }

  function watchJobLog(id: string, onEvent: (payload: JobLogEvent) => void): () => void {
    let entry = jobLogListeners.get(id)
    if (!entry) {
      const callbacks = new Set<(payload: JobLogEvent) => void>()
      const esListener = (ev: MessageEvent) => {
        try {
          const payload = JSON.parse(ev.data) as JobLogEvent
          if (typeof payload.seq !== 'number' || !payload.event) return // 畸形 payload 静默跳过
          for (const cb of callbacks) cb(payload)
        } catch {
          // 畸形 payload 静默跳过。
        }
      }
      entry = { esListener, callbacks }
      jobLogListeners.set(id, entry)
      es.addEventListener(`job-log:${id}`, esListener as EventListener)
    }
    entry.callbacks.add(onEvent)
    return () => {
      const current = jobLogListeners.get(id)
      if (!current) return
      current.callbacks.delete(onEvent)
      if (current.callbacks.size === 0) {
        es.removeEventListener(`job-log:${id}`, current.esListener as EventListener)
        jobLogListeners.delete(id)
      }
    }
  }

  function close(): void {
    if (closed) return
    closed = true
    for (const [id, listener] of jobListeners) {
      es.removeEventListener(`job:${id}`, listener as EventListener)
    }
    for (const [id, entry] of jobLogListeners) {
      es.removeEventListener(`job-log:${id}`, entry.esListener as EventListener)
    }
    jobLogListeners.clear()
    jobListeners.clear()
    es.close()
    handlers.onState('closed')
  }

  return { close, watchJob, watchJobLog }
}
