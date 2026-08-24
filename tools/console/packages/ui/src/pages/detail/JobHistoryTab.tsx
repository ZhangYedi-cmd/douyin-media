import { useState } from 'react'
import { Empty } from 'antd'
import type { Job, JobState } from '@console/server/api-types'
import { STATE_LABEL, TYPE_LABEL, sortJobsForPanel } from '../../components/JobPanel'
import { JobLogView, useJobHistory } from '../../components/JobLogView'

// 「产物」Tabs 新增的第 5 个 tab：执行记录（用户原话「点击开始创作，在小框子里看日志也太难受了，
// 能不能加入一个 CC 运行时日志解析、分析的功能」）。一条内容可能有多次任务（创作/重做/发布），
// 所以先列出该 slug 的历史任务、再看某一次的详细过程。
//
// 数据源 2026-08-19 由「过滤 useJobs()」改为 GET /api/jobs/history?slug=<slug>（K 号数据侧新增，
// 见 useJobHistory.ts / lib/api.ts getJobHistory 头注释）——总指挥实测发现 GET /api/jobs 的
// recent 只兜底近 24h 内存表，一条内容一周前跑的任务会永久看不到，那条路已知是错的。
export interface JobHistoryTabProps {
  slug: string
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

export function JobHistoryTab({ slug }: JobHistoryTabProps) {
  const { jobs, error } = useJobHistory({ slug })
  const { visible } = sortJobsForPanel(jobs ?? [], 50)
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined)
  const selected = visible.find((j) => j.id === selectedId) ?? visible[0]

  if (error) {
    return (
      <div>
        <p style={{ color: 'var(--danger)', fontWeight: 600, fontSize: 'var(--text-sm)' }}>执行记录加载失败</p>
        <p className="muted" style={{ fontSize: 'var(--text-xs)' }}>{error.message}</p>
      </div>
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
      <Empty
        description={
          <span>
            这条内容还没跑过任何任务。
            <br />
            <span className="muted" style={{ fontSize: 'var(--text-xs)' }}>
              创作 / 重做 / 发布任一动作启动后，会在这里看到完整的执行过程。
            </span>
          </span>
        }
      />
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
        {visible.map((job) => (
          <button
            key={job.id}
            type="button"
            className={`btn btn-sm ${job.id === selected?.id ? '' : 'btn-ghost'}`.trim()}
            onClick={() => setSelectedId(job.id)}
          >
            {TYPE_LABEL[job.type]} · {job.state in STATE_LABEL ? STATE_LABEL[job.state as JobState] : '状态未知'} · {fmtRunTime(job)}
          </button>
        ))}
      </div>
      {selected ? <JobLogView job={selected} /> : null}
    </div>
  )
}
