import { describe, expect, it } from 'vitest'
import type { MetaStatus } from '@console/core'
import { buildStageTimelineItems } from '../../../pages/detail/stageTimelineItems'

const FULL_ORDER: MetaStatus[] = ['ideated', 'drafting', 'review', 'approved', 'scheduled', 'published', 'retro_done', 'rejected']

function timelineAllNull(): { status: MetaStatus; at: string | null }[] {
  return FULL_ORDER.map((status) => ({ status, at: null }))
}

describe('buildStageTimelineItems', () => {
  it('正常流程（current !== rejected）时 rejected 节点整个不出现', () => {
    const items = buildStageTimelineItems(timelineAllNull(), 'drafting')
    expect(items.map((i) => i.key)).toEqual(['ideated', 'drafting', 'review', 'approved', 'scheduled', 'published', 'retro_done'])
  })

  it('被否掉（current === rejected）时 rejected 节点出现且渲染成 error 态终点', () => {
    const items = buildStageTimelineItems(timelineAllNull(), 'rejected')
    const rejectedItem = items.find((i) => i.key === 'rejected')
    expect(rejectedItem).toBeDefined()
    expect(rejectedItem!.status).toBe('error')
  })

  it('当前节点（非 rejected）渲染成 process', () => {
    const items = buildStageTimelineItems(timelineAllNull(), 'review')
    expect(items.find((i) => i.key === 'review')!.status).toBe('process')
  })

  it('已有时间戳但不是当前节点渲染成 finish；无时间戳渲染成 wait', () => {
    const timeline = timelineAllNull().map((n) => (n.status === 'ideated' ? { ...n, at: '2026-08-01' } : n))
    const items = buildStageTimelineItems(timeline, 'drafting')
    expect(items.find((i) => i.key === 'ideated')!.status).toBe('finish')
    expect(items.find((i) => i.key === 'review')!.status).toBe('wait')
  })

  it('description 取时间戳，缺失时回退显示 "—"', () => {
    const timeline = timelineAllNull().map((n) => (n.status === 'ideated' ? { ...n, at: '2026-08-01' } : n))
    const items = buildStageTimelineItems(timeline, 'drafting')
    expect(items.find((i) => i.key === 'ideated')!.description).toBe('2026-08-01')
    expect(items.find((i) => i.key === 'review')!.description).toBe('—')
  })
})
