import { useState } from 'react'
import type { Job, JobState } from '@console/server/api-types'
import { STATE_LABEL, sortJobsForPanel } from '../../components/JobPanel'
import { JobLogView, useJobHistory } from '../../components/JobLogView'

// 治理线挂载点（CC 运行日志查看功能，L 号执行）：治理任务没有 slug、只有 task，看不见过程。
// 2026-08-19 二次改版：原挂在任务注册表的行展开区（TaskRegistryTable 的 antd Table
// `expandable`），真机实测翻车——展开区是 Table 自己的一个 <td>，auto table layout 按内容
// 自然宽度撑列，日志里不换行的 pre 块/长命令直接把整张表撑到 4280px 宽（要横向滚近 4 屏）。
// 改为 TaskRegistryTable 新增的「查看记录」按钮触发 Modal 承载本组件，理由：
// 1. 「运行」按钮就长在这一行——按钮点开 Modal，就地看这次点了什么、跑到哪，动作和结果不用来回切页。
// 2. Modal 是浮层不是路由，与「行不可点开详情页」（03 §4-Q1 已拍板 P5 注册表 Table 即全部）
//    不冲突——本页报告阅读器（ReportReader.tsx）已有同款先例，理由不复述。
// 3. 与「运行账本」区分职责：账本是治理线自己写的记账（harness/logs/index.jsonl，覆盖定时调度 +
//    手动触发全部来源），这里只看"通过看板『运行』按钮发起"的这条执行过程（Job 记录），
//    两者数据源不同、不能互相替代——下方空态文案据实说明这条边界，不装作两者是一回事。
//
// 数据源 2026-08-19 由「过滤 useJobs()」改为 GET /api/jobs/history?task=<task>（K 号数据侧新增，
// 见 useJobHistory.ts 头注释）——GET /api/jobs 的 recent 只兜底近 24h 内存表，那条路已知是错的。
//
// 宽度实测（本次 Modal 改版验收点，Playwright，viewport 1280×900）：960 宽 Modal 内选
// benchmark-refresher/backlog-gardener/account-audit 三个任务的 5 条真实历史运行记录，逐条展开
// 全部步骤详情（含长 Bash 命令、长文件路径）+ 强制展开原始事件折叠块 + thinking 折叠块后实测——
// 5 条记录读数一致：document.documentElement.scrollWidth = clientWidth = 1280（页面无横向滚），
// .ant-modal-body 的 scrollWidth = clientWidth = 912（Modal body 无横向滚，判据「<= clientWidth+1」
// 达标），子树内没有任何 scrollWidth > clientWidth 的元素（没有需要局部横滚的残留）。靠的是
// JobLogView 内部已有的 `.step { min-width: 0 }` + `.logblock { overflow-x: auto; white-space:
// pre-wrap }`（组件内部实现不改，见该文件头注释）；下面这行 minWidth:0 补的是本组件、以及它上面
// JobLogView `.root`/`.stream` 这两层 flex 列容器各自作为「另一个 flex 容器的 item」时的默认
// auto min-width，同一模式见 ReportReader.tsx 对应注释。
export interface TaskRunHistoryProps {
  taskName: string
}

function fmtRunTime(job: Job): string {
  const iso = job.startedAt ?? job.endedAt
  if (!iso) return '（时间未知）'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(
    2,
    '0',
  )}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function TaskRunHistory({ taskName }: TaskRunHistoryProps) {
  const { jobs, error } = useJobHistory({ task: taskName })
  const { visible } = sortJobsForPanel(jobs ?? [], 20)
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined)
  const selected = visible.find((j) => j.id === selectedId)

  if (error) {
    return (
      <p style={{ color: 'var(--danger)', fontSize: 'var(--text-xs)' }}>执行记录加载失败：{error.message}</p>
    )
  }

  if (jobs === undefined) {
    return (
      <p className="muted" style={{ fontSize: 'var(--text-xs)' }}>
        加载中…
      </p>
    )
  }

  if (visible.length === 0) {
    return (
      <p className="muted" style={{ fontSize: 'var(--text-xs)' }}>
        还没有人在这里点过「运行」——只有通过本页「运行」按钮发起的任务会出现在这里；
        定时调度触发的运行不算，那些记录看上方的运行账本。
      </p>
    )
  }

  return (
    // minWidth:0 是布局结构值不是视觉值（对照 ReportReader.tsx 同名注释）：本组件现在渲染在 Modal
    // body 里，JobLogView 内部有 flex 列容器（.root/.stream）套 flex 列容器（本组件自身），
    // 这层不清零，子树里任何一个 flex item 的默认 auto min-width 都可能顺着链条把 Modal body
    // 撑宽——即便 JobLogView 内部各处已经自己处理了横向溢出（`.step`/`.logblock`），也要在
    // 每一层新增的 flex 容器上重复这行，防止链条从中间断开又变成新的撑破点。
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', minWidth: 0 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
        {visible.map((job) => (
          <button
            key={job.id}
            type="button"
            className={`btn btn-sm ${job.id === selectedId ? '' : 'btn-ghost'}`.trim()}
            onClick={() => setSelectedId((id) => (id === job.id ? undefined : job.id))}
          >
            {job.state in STATE_LABEL ? STATE_LABEL[job.state as JobState] : '状态未知'} · {fmtRunTime(job)}
          </button>
        ))}
      </div>
      {selected ? (
        <JobLogView job={selected} />
      ) : (
        <p className="muted" style={{ fontSize: 'var(--text-xs)' }}>
          点一条运行记录查看详细过程。
        </p>
      )}
    </div>
  )
}
