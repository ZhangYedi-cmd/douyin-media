// JobCard 迷你时间轴与 JobLogView L1 时间轴共用的「里程碑 → antd Steps items」换算规则。
// 2026-08-19 从 JobCard.tsx 内联逻辑抽出（CC 运行日志查看功能，L 号执行）：JobLogView 的 L1
// 需要同一套换算（用户拍板「不必强行复用组件，复用 Steps 思路即可」），与其复制一份易漂移的
// inline 逻辑，不如把纯计算部分抽成一个测过的函数，两处都调它，JSX 渲染各写各的。
import type { Job, JobMilestone } from '@console/server/api-types'
import { clockTime } from '../../lib/format'
import { isTerminal } from './JobCard'

export interface MilestoneStepItem {
  key: string
  title: string
  description: string
  status: 'finish' | 'process' | 'error'
}

/**
 * 最后一条里程碑在任务仍进行中（非终结态）时显示 'process'（正在跑），其余（含终结态下的
 * 最后一条）一律 'finish'；failed/cancelled 额外补一条终结态步骤——「人主动停的」与
 * 「跑挂了的」用不同标题区分（JobCard.tsx 头部徽标同一区分语义的镜像）。
 */
export function buildMilestoneSteps(job: Pick<Job, 'milestones' | 'state' | 'error'>): MilestoneStepItem[] {
  const terminal = isTerminal(job.state)
  const items: MilestoneStepItem[] = job.milestones.map((m: JobMilestone, i) => ({
    key: m.id,
    title: m.label,
    description: clockTime(m.at),
    status: i < job.milestones.length - 1 || terminal ? 'finish' : 'process',
  }))
  if (job.state === 'failed') {
    items.push({ key: '__failed', title: '失败', description: job.error ?? '', status: 'error' })
  } else if (job.state === 'cancelled') {
    items.push({ key: '__cancelled', title: '已取消', description: job.error ?? '', status: 'error' })
  }
  return items
}
