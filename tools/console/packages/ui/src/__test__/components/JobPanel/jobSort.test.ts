import { describe, expect, it } from 'vitest'
import { sortJobsForPanel } from '../../../components/JobPanel/jobSort'
import type { Job } from '@console/server/api-types'

function makeJob(id: string, overrides: Partial<Job> = {}): Job {
  return {
    id,
    type: 'publish',
    state: 'queued',
    milestones: [],
    narration: [],
    stalling: false,
    logPath: `.runtime/logs/jobs/${id}.jsonl`,
    ...overrides,
  }
}

describe('sortJobsForPanel', () => {
  it('进行中（queued/running/verifying）全部排在已终结（succeeded/failed）之前', () => {
    const jobs = [
      makeJob('done-1', { state: 'succeeded', endedAt: '2026-08-18T01:00:00Z' }),
      makeJob('active-1', { state: 'running', startedAt: '2026-08-18T02:00:00Z' }),
      makeJob('done-2', { state: 'failed', endedAt: '2026-08-18T03:00:00Z' }),
    ]
    const { visible } = sortJobsForPanel(jobs)
    expect(visible.map((j) => j.id)).toEqual(['active-1', 'done-2', 'done-1'])
  })

  it('进行中按 startedAt 升序（先开始的先展示）', () => {
    const jobs = [
      makeJob('later', { state: 'running', startedAt: '2026-08-18T02:00:00Z' }),
      makeJob('earlier', { state: 'queued', startedAt: '2026-08-18T01:00:00Z' }),
    ]
    const { visible } = sortJobsForPanel(jobs)
    expect(visible.map((j) => j.id)).toEqual(['earlier', 'later'])
  })

  it('已终结按 endedAt 降序（最近完成的排前面），缺 endedAt 退回 startedAt', () => {
    const jobs = [
      makeJob('old', { state: 'succeeded', endedAt: '2026-08-17T00:00:00Z' }),
      makeJob('new', { state: 'succeeded', endedAt: '2026-08-18T00:00:00Z' }),
      makeJob('no-end', { state: 'failed', startedAt: '2026-08-18T12:00:00Z' }), // 无 endedAt
    ]
    const { visible } = sortJobsForPanel(jobs)
    expect(visible.map((j) => j.id)).toEqual(['no-end', 'new', 'old'])
  })

  it('maxVisible 截断并报告 hiddenCount', () => {
    const jobs = Array.from({ length: 8 }, (_, i) => makeJob(`j${i}`, { state: 'succeeded', endedAt: `2026-08-1${i}T00:00:00Z` }))
    const { visible, hiddenCount } = sortJobsForPanel(jobs, 3)
    expect(visible).toHaveLength(3)
    expect(hiddenCount).toBe(5)
  })

  it('空数组：visible 为空、hiddenCount 为 0', () => {
    expect(sortJobsForPanel([])).toEqual({ visible: [], hiddenCount: 0 })
  })
})
