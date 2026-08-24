import { useEffect, useRef, useState } from 'react'
import { Steps } from 'antd'
import type { Job, JobLogEvent } from '@console/server/api-types'
import type { NormEvent } from '@console/cc-stream'
import { ApiError, getJobLog } from '../../lib/api'
import { useWatchJobLog } from '../../lib/store'
import { buildMilestoneSteps } from '../JobPanel'
import { buildTimeline } from './jobLogParse'
import type { TimelineEntry } from './jobLogParse'
import { mergeLogEvents } from './mergeLogEvents'
import { TimelineEntryView } from './LogEntry'
import styles from './JobLogView.module.css'

// CC 运行日志的三层视图（用户原话「点击开始创作，在小框子里看日志也太难受了，能不能加入一个 CC
// 运行时日志解析、分析的功能」——右下角任务面板固定 360px，定位是"瞥一眼进度"，本组件才是"能读的
// 全链路视图"）：
//   L1 里程碑时间轴——复用 JobCard 同款 Steps 思路（buildMilestoneSteps，见该文件头注释）。
//   L2 步骤流（主体）——buildTimeline 把 tool/toolDone 配对成步骤卡，与 say/thinking/stalling/
//     done 按发生顺序合成一条线，交给 LogEntry.tsx 逐条渲染。
//   L3 原始事件——折叠兜底，排障用（JSON.stringify 全量原文）。
//
// 回放 + 实时（K 号数据侧契约，2026-08-19 已交付验收，详见 mergeLogEvents.ts 头注释）：
// 进行中的任务（queued/running/verifying）——先订阅 SSE `job-log:<id>` 开始缓冲增量，再拉一次
// GET /api/jobs/:id/log 取历史（顺序不能反，先拉历史再订阅会漏掉中间到达的事件），随后每条新到的
// SSE 广播用 mergeLogEvents 追加。已终结的任务不会再有增量，只走一次性回放，不订阅。
export interface JobLogViewProps {
  job: Job
  /**
   * 测试/演示用接缝：调用方已经拿到一份完整事件数组时传入，组件跳过内部 fetch/订阅直接渲染
   * （#/dev fixture 展示台在用，见 pages/dev/index.tsx）。真实页面不传，走上面的回放+实时路径。
   */
  events?: NormEvent[]
}

const ACTIVE_STATES: Job['state'][] = ['queued', 'running', 'verifying']

interface LogErrorView {
  heading: string
  detail: string
}

/** 404 场景要按任务是否进行中区分（总指挥实测补充）：
 * - 进行中的任务：子进程可能还没吐出第一行、日志文件尚未创建——这不是错误，是"历史为空、N=0"，
 *   调用方应当把它当空历史处理、继续靠 SSE 增量往上长，绝不能显示成"加载失败"（这是用户点完
 *   「开始创作」第一眼会看到的状态）。这条分支在 JobLogView 组件内处理，不进这个错误文案函数。
 * - 已终结的任务：日志文件是真的不存在了（任务太老、按保留策略被清理）。 */
function describeLogError(error: ApiError): LogErrorView {
  if (error.status === 404) {
    return { heading: '日志不存在', detail: '这条任务没有找到对应的运行日志——可能是任务太老，日志文件已经被清理。' }
  }
  if (error.status === 0) {
    return { heading: '无法连接看板服务', detail: '本机 server 可能没有启动，或请求被网络/代理拦截。' }
  }
  return { heading: `日志加载失败（HTTP ${error.status || '未知状态'}）`, detail: error.message }
}

export function JobLogView({ job, events: providedEvents }: JobLogViewProps) {
  const [fetchedEvents, setFetchedEvents] = useState<NormEvent[] | undefined>(undefined)
  const [error, setError] = useState<ApiError | null>(null)
  const [reloadTick, setReloadTick] = useState(0)
  const watchJobLog = useWatchJobLog()
  const isActive = ACTIVE_STATES.includes(job.state)
  const streamRef = useRef<HTMLDivElement | null>(null)
  const atBottomRef = useRef(true)

  useEffect(() => {
    if (providedEvents) return // 接缝：外部已喂事件时不再自己 fetch/订阅
    let cancelled = false
    // 回放历史（落地前为 null）与**至今收到的全部** SSE 增量。每次有新增量都拿这两份重算一次
    // 合并结果，而不是「拿上一次的结果 + 这一条」增量式追加——后者有个静默失效：
    // mergeLogEvents 遇到 seq 空洞会把后面的事件扣住不放（这是对的，不能让 N+2 显示在 N+1 前面），
    // 但如果那一条被丢弃不留存，空洞就永远补不上了。全量留存则空洞一旦补齐，被扣住的事件会自动
    // 一起放出来。代价是每条增量重算一次 merge（事件量级实测最大 138 条，可忽略）。
    let history: NormEvent[] | null = null
    const received: JobLogEvent[] = []
    setFetchedEvents(undefined)
    setError(null)

    const unsubscribe = isActive
      ? watchJobLog(job.id, (payload) => {
          if (cancelled) return
          received.push(payload)
          if (history) setFetchedEvents(mergeLogEvents(history, received))
        })
      : undefined

    getJobLog(job.id)
      .then((h) => {
        if (cancelled) return
        history = h
        setFetchedEvents(mergeLogEvents(h, received))
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const apiErr = err instanceof ApiError ? err : new ApiError(err instanceof Error ? err.message : String(err), 0)
        if (isActive && apiErr.status === 404) {
          // 刚提交的任务，日志文件还没落盘：当空历史处理，继续靠 SSE 往上长（见上方函数头注释）。
          history = []
          setFetchedEvents(mergeLogEvents([], received))
          return
        }
        setError(apiErr)
      })

    return () => {
      cancelled = true
      unsubscribe?.()
    }
  }, [job.id, isActive, reloadTick, providedEvents, watchJobLog])

  const events = providedEvents ?? fetchedEvents
  const timeline: TimelineEntry[] = events ? buildTimeline(events) : []
  const milestoneSteps = buildMilestoneSteps(job)

  // 进行中的任务自动跟到最新一条（像 tail -f）。但**只在人本来就贴着底部时**才跟——用户往上翻
  // 去看某一步的输出时，新事件到达不该把他弹回底部。阈值 48px 是"基本贴底"的容差。
  useEffect(() => {
    const el = streamRef.current
    if (!el || !isActive || !atBottomRef.current) return
    el.scrollTop = el.scrollHeight
  }, [timeline.length, isActive])

  return (
    <div className={styles.root}>
      <section>
        <p className="eyebrow" style={{ marginBottom: 'var(--space-2)' }}>
          里程碑
        </p>
        {milestoneSteps.length > 0 ? (
          <Steps direction="vertical" size="small" items={milestoneSteps} />
        ) : (
          <p className="muted" style={{ fontSize: 'var(--text-xs)' }}>
            尚无里程碑上报。
          </p>
        )}
      </section>

      <section>
        <div className={styles.streamHead}>
          <p className="eyebrow" style={{ margin: 0 }}>
            执行过程
          </p>
          {isActive && !providedEvents ? (
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => setReloadTick((t) => t + 1)}>
              重新同步
            </button>
          ) : null}
        </div>

        {error ? (
          <LogErrorBox view={describeLogError(error)} />
        ) : events === undefined ? (
          <p className="muted" style={{ fontSize: 'var(--text-xs)' }}>
            加载中…
          </p>
        ) : timeline.length === 0 ? (
          <p className="muted" style={{ fontSize: 'var(--text-xs)' }}>
            {isActive ? '任务刚提交，还没有产出任何执行事件——过程会实时出现在这里。' : '日志是空的，这条任务没有留下执行事件。'}
          </p>
        ) : (
          <div
            className={styles.stream}
            ref={streamRef}
            onScroll={(e) => {
              const el = e.currentTarget
              atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48
            }}
          >
            {timeline.map((entry, i) => (
              <TimelineEntryView key={entryKey(entry, i)} entry={entry} />
            ))}
          </div>
        )}
      </section>

      {events && events.length > 0 ? (
        <details className="fold">
          <summary>原始事件（{events.length} 条，排障用）</summary>
          <pre className="logblock">{JSON.stringify(events, null, 2)}</pre>
        </details>
      ) : null}
    </div>
  )
}

function LogErrorBox({ view }: { view: LogErrorView }) {
  return (
    <div className={styles.errorBox}>
      <p style={{ color: 'var(--danger)', fontWeight: 600, fontSize: 'var(--text-sm)' }}>{view.heading}</p>
      <p className="muted" style={{ fontSize: 'var(--text-xs)' }}>
        {view.detail}
      </p>
    </div>
  )
}

function entryKey(entry: TimelineEntry, i: number): string {
  switch (entry.kind) {
    case 'step':
      return `step-${entry.step.id}`
    case 'say':
      return `say-${entry.messageId}`
    default:
      return `${entry.kind}-${i}`
  }
}
