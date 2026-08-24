import { describe, expect, it } from 'vitest'
import { buildMilestoneSteps } from '../../../components/JobPanel/milestoneSteps'
import type { Job, JobMilestone } from '@console/server/api-types'

// 2026-08-19 从 JobCard.tsx 内联逻辑抽出（CC 运行日志查看功能，L 号执行），JobCard 与
// JobLogView 的 L1 时间轴共用这一份换算规则——单测锁定行为，避免两处漂移。

function makeJob(overrides: Partial<Job> = {}): Pick<Job, 'milestones' | 'state' | 'error'> {
  return { milestones: [], state: 'running', error: undefined, ...overrides }
}

const M1: JobMilestone = { id: 'm1', label: '定位内容条目', at: '2026-08-19T05:00:00.000Z' }
const M2: JobMilestone = { id: 'm2', label: '写入产物', at: '2026-08-19T05:01:00.000Z' }

describe('buildMilestoneSteps', () => {
  it('进行中（非终结态）：最后一条里程碑为 process，之前的为 finish', () => {
    const items = buildMilestoneSteps(makeJob({ milestones: [M1, M2], state: 'running' }))
    expect(items.map((i) => i.status)).toEqual(['finish', 'process'])
    expect(items[0].title).toBe('定位内容条目')
  })

  it('已终结（succeeded）：全部里程碑为 finish，不追加终结态步骤', () => {
    const items = buildMilestoneSteps(makeJob({ milestones: [M1, M2], state: 'succeeded' }))
    expect(items.map((i) => i.status)).toEqual(['finish', 'finish'])
    expect(items).toHaveLength(2)
  })

  it('failed：追加一条「失败」步骤（status=error），描述取 job.error', () => {
    const items = buildMilestoneSteps(makeJob({ milestones: [M1], state: 'failed', error: '物料校验未过' }))
    expect(items).toHaveLength(2)
    expect(items[1]).toEqual({ key: '__failed', title: '失败', description: '物料校验未过', status: 'error' })
  })

  it('cancelled：追加一条「已取消」步骤，与 failed 用不同标题区分（人主动停的 vs 跑挂了的）', () => {
    const items = buildMilestoneSteps(makeJob({ milestones: [M1], state: 'cancelled' }))
    expect(items[1]).toMatchObject({ key: '__cancelled', title: '已取消', status: 'error' })
  })

  it('failed 但 error 缺失：description 兜底为空字符串，不编造原因', () => {
    const items = buildMilestoneSteps(makeJob({ milestones: [], state: 'failed', error: undefined }))
    expect(items[0].description).toBe('')
  })

  it('milestones 为空、进行中：返回空数组（不追加终结态步骤，因为不是终结态）', () => {
    expect(buildMilestoneSteps(makeJob({ milestones: [], state: 'queued' }))).toEqual([])
  })

  it('description 按 HH:mm:ss 本地时间格式化（不是原样 ISO 字符串）', () => {
    const items = buildMilestoneSteps(makeJob({ milestones: [M1], state: 'succeeded' }))
    expect(items[0].description).not.toBe(M1.at)
    expect(items[0].description).toMatch(/^\d{2}:\d{2}:\d{2}$/)
  })
})
