// JobPanel 展示顺序的纯函数（03 §2.9 JobPanel：无 props，消费 useJobs()）。抽出来单测，
// 不依赖 React 渲染（本包无 jsdom，见 lib/api.test.ts 顶部说明）。
import type { Job, JobState } from '@console/server/api-types'

const ACTIVE_STATES: JobState[] = ['queued', 'running', 'verifying']

function isActive(job: Job): boolean {
  return ACTIVE_STATES.includes(job.state)
}

export interface SortedJobs {
  visible: Job[]
  hiddenCount: number
}

/**
 * 排序规则：进行中（queued/running/verifying）全部排在已终结（succeeded/failed）前面；
 * 进行中按 startedAt 升序（先开始的先展示，符合"正在跑的任务、越早开始越靠前"直觉）；
 * 已终结按 endedAt（缺省退回 startedAt）降序（最近完成的排前面）。
 * maxVisible 之后的条目被截断，hiddenCount 供面板顶部显示"还有 N 个未展示"。
 */
export function sortJobsForPanel(jobs: Job[], maxVisible = 6): SortedJobs {
  const active = jobs.filter(isActive)
  const done = jobs.filter((j) => !isActive(j))
  active.sort((a, b) => (a.startedAt ?? '').localeCompare(b.startedAt ?? ''))
  done.sort((a, b) => (b.endedAt ?? b.startedAt ?? '').localeCompare(a.endedAt ?? a.startedAt ?? ''))
  const ordered = [...active, ...done]
  return { visible: ordered.slice(0, maxVisible), hiddenCount: Math.max(0, ordered.length - maxVisible) }
}
