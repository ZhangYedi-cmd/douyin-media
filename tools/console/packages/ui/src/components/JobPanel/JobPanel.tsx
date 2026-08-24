import { useEffect, useMemo, useRef, useState } from 'react'
import { Collapse } from 'antd'
import type { Job } from '@console/server/api-types'
import { useCancelJob } from '../../lib/actions'
import { useJobs } from '../../lib/store'
import { JobCard } from './JobCard'
import { sortJobsForPanel } from './jobSort'
import { activeSignature, computePanelVisibility, loadReadMap, markJobsRead, saveReadMap, type ReadMap } from './visibility'
import styles from './JobPanel.module.css'

// 03 §2.9 JobPanel：常驻右下角，无 props，消费 ConsoleProvider 的 jobs（useJobs()）。
//
// 本波重做生命周期（P0 走查缺陷回填，见 visibility.ts 文件头注释）：原实现「无活动任务时返回
// null」被字面理解为 jobs.length===0，已终结任务永不移除，导致一条一周前失败的发布任务
// 常驻挂角盖住每一页。现在拆成两段——
//   · 进行中（queued/running/verifying）：恒定显示在面板主体，不可关闭（关闭只是把面板
//     本身收起，进行中的任务信息不会因此丢失，见下方 isClosed 的自动还魂判定）。
//   · 已终结（succeeded/failed）：默认收进「历史任务」折叠区，是否需要面板整体弹出取决于
//     有没有"未读"的终结任务（visibility.ts 的 readMap，落盘 localStorage，刷新不还魂）。
// 面板另有「最小化」（缩成右下角小胶囊，点击还原）与「关闭」（隐藏整个面板 + 把当下能看到的
// 终结任务标记已读）两个操作——这两个交互、以及"历史任务"折叠区，都是 03 §2.9 原设计没有的
// 新增面，偏离处已在此说明理由（红线 7）。
/** 「全部取消」确认弹窗正文（2026-08-19 新增，看板「取消任务」能力，任务卡明确要求"说明会连
 * 排队中的一起清空"）：把当前进行中任务按 queued/running-verifying 分类点数，让人确认前知道
 * 这一下会影响多少个任务；风险说明同单任务取消——正在跑的那部分文件不会自动回滚。 */
function CancelAllSummary({ activeJobs }: { activeJobs: Job[] }) {
  const queuedCount = activeJobs.filter((j) => j.state === 'queued').length
  const runningCount = activeJobs.length - queuedCount
  return (
    <div>
      <p style={{ fontSize: 'var(--text-sm)', marginBottom: 'var(--space-2)' }}>
        当前共有 {activeJobs.length} 个进行中的任务（排队中 {queuedCount} 个、正在执行 {runningCount} 个）。
        确认后排队中的会全部清空，正在执行的会强行终止子进程——不会只停一个又冒出下一个。
      </p>
      {runningCount > 0 ? (
        <p style={{ color: 'var(--danger)', fontSize: 'var(--text-xs)', fontWeight: 600 }}>
          正在执行的任务已经写出去的文件不会自动回滚（比如口播稿、治理报告写了一半），
          取消后需要自己检查现场、决定是留是删。
        </p>
      ) : null}
    </div>
  )
}

export function JobPanel() {
  const jobs = useJobs()
  const storage = useMemo(getStorage, [])
  const [readMap, setReadMap] = useState<ReadMap>(() => loadReadMap(storage))
  const [minimized, setMinimized] = useState(true)
  const [closedActiveSig, setClosedActiveSig] = useState<string | null>(null)
  const { cancelAll } = useCancelJob()

  const vis = useMemo(() => computePanelVisibility(jobs, readMap), [jobs, readMap])
  const activeSig = useMemo(() => activeSignature(vis.activeJobs), [vis.activeJobs])
  // 关闭只在"进行中任务集合没变化、也没有新的未读终结任务"期间持续生效；任一变化都视为
  // "有新情况"，即便用户之前关过面板也要自动重新出现（验收点：不能因为关过就再也不提示）。
  const isClosed = closedActiveSig !== null && closedActiveSig === activeSig && !vis.hasUnreadTerminal

  // 面板从"关闭"因为新情况自动重开、或从"只有历史待看"变成"有新任务在跑"时，顺带取消最小化，
  // 让新情况显眼地弹出来一次；用户在会话内主动点的最小化（非以上两种触发）则不受这个 effect 打扰。
  const prevRef = useRef({ closed: isClosed, hasActive: vis.hasActive })
  useEffect(() => {
    const reopened = prevRef.current.closed && !isClosed
    const becameActive = vis.hasActive && !prevRef.current.hasActive
    if (reopened || becameActive) setMinimized(false)
    prevRef.current = { closed: isClosed, hasActive: vis.hasActive }
  }, [isClosed, vis.hasActive])

  if (!vis.shouldRender || isClosed) return null

  function persistReadMap(next: ReadMap) {
    setReadMap(next)
    saveReadMap(storage, next)
  }

  function handleClose() {
    // 关闭 = 确认已看过当前展示的全部未读终结任务（下次刷新不再自动弹出），并记住此刻进行中
    // 任务的签名——面板何时重新出现交给上面 isClosed 的签名比对，不是"关了就再也不提示"。
    persistReadMap(markJobsRead(readMap, vis.unreadTerminalJobs))
    setClosedActiveSig(activeSig)
  }

  function handleDismissJob(job: Job) {
    persistReadMap(markJobsRead(readMap, [job]))
  }

  async function handleCancelAll() {
    await cancelAll({
      title: '确认全部取消',
      summary: <CancelAllSummary activeJobs={vis.activeJobs} />,
    })
  }

  if (minimized) {
    const label = vis.hasActive ? `进行中 ${vis.activeJobs.length}` : `历史任务 ${vis.unreadTerminalJobs.length}`
    return (
      <button type="button" className={styles.capsule} onClick={() => setMinimized(false)} title="展开任务面板">
        <span className={`badge ${vis.hasActive ? 'b-accent' : ''}`.trim()}>
          <i />
          {label}
        </span>
        {vis.hasActive && vis.unreadTerminalJobs.length > 0 ? (
          <span className={styles.capsuleBadge}>{vis.unreadTerminalJobs.length}</span>
        ) : null}
      </button>
    )
  }

  const { visible: activeVisible, hiddenCount: activeHiddenCount } = sortJobsForPanel(vis.activeJobs)
  const { visible: historyVisible, hiddenCount: historyHiddenCount } = sortJobsForPanel(vis.terminalJobs, 20)

  return (
    <div className={styles.panel}>
      <div className={styles.head}>
        <b>任务面板</b>
        <span className="muted" style={{ fontSize: 'var(--text-xs)' }}>
          {vis.hasActive ? `${vis.activeJobs.length} 个进行中` : '无进行中任务'}
          {activeHiddenCount > 0 ? `（仅显示最近 ${activeVisible.length} 个）` : ''}
        </span>
        <div className={styles.headActions}>
          {vis.hasActive ? (
            <button type="button" className="btn btn-sm btn-danger" onClick={() => void handleCancelAll()}>
              全部取消
            </button>
          ) : null}
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => setMinimized(true)}>
            最小化
          </button>
          <button type="button" className="btn btn-sm btn-ghost" onClick={handleClose}>
            关闭
          </button>
        </div>
      </div>
      <div className={styles.list}>
        {activeVisible.length > 0 ? (
          activeVisible.map((job) => <JobCard key={job.id} job={job} defaultExpanded={activeVisible.length === 1} />)
        ) : (
          <p className="muted" style={{ fontSize: 'var(--text-xs)' }}>
            暂无进行中的任务。
          </p>
        )}
      </div>
      {vis.terminalJobs.length > 0 ? (
        <Collapse
          ghost
          size="small"
          className={styles.history}
          defaultActiveKey={vis.hasActive ? [] : ['history']}
          items={[
            {
              key: 'history',
              label: `历史任务（${vis.terminalJobs.length} 条${vis.unreadTerminalJobs.length > 0 ? `，${vis.unreadTerminalJobs.length} 条未读` : ''}）——成本 / 裁定 / 大脑改动`,
              children: (
                <div className={styles.list}>
                  {historyVisible.map((job) => (
                    <JobCard
                      key={job.id}
                      job={job}
                      onDismiss={vis.unreadTerminalJobs.includes(job) ? () => handleDismissJob(job) : undefined}
                    />
                  ))}
                  {historyHiddenCount > 0 ? (
                    <p className="muted" style={{ fontSize: 'var(--text-xs)' }}>
                      还有 {historyHiddenCount} 条更早的记录未展示。
                    </p>
                  ) : null}
                </div>
              ),
            },
          ]}
        />
      ) : null}
    </div>
  )
}

/** window.localStorage 的轻量取用：可能不可用（隐私模式/SSR），失败时交给 visibility.ts 的
 *  loadReadMap/saveReadMap 兜底成空表，取用本身也不抛异常——写法参考 lib/api.ts getToken。 */
function getStorage(): Storage | undefined {
  if (typeof window === 'undefined') return undefined
  try {
    return window.localStorage
  } catch {
    return undefined
  }
}
