import { describe, expect, it } from 'vitest'
import { mergeJob } from '../../lib/store'
import type { Job } from '@console/server/api-types'

// mergeJob 是 ConsoleProvider 内「SSE job:<id> 广播 / GET /api/jobs 初拉 / useJobAction 占位挂载」
// 三处共用的合并语义（02 §2.1 契约：全量覆盖，幂等可覆盖、抗丢事件）。ConsoleProvider 本体依赖
// useEffect/useState，需要 DOM 渲染环境（本包无 jsdom，见 lib/api.test.ts 顶部说明）才能测；
// 抽出的这个纯函数就是「SSE job 事件合并逻辑」的可单测落点（05 §7 测试基建约束下的现实选择）。

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

describe('mergeJob', () => {
  it('新 id：追加进 map，不影响既有条目', () => {
    const prev = { a: makeJob('a') }
    const next = mergeJob(prev, makeJob('b'))
    expect(Object.keys(next).sort()).toEqual(['a', 'b'])
    expect(next.a).toBe(prev.a) // 未涉及的条目原地不动（usePageData 同款"只换变化部分"纪律）
  })

  it('已知 id：整条全量覆盖，不做字段级 patch（幂等——重复投喂同一快照结果不变）', () => {
    const prev = { a: makeJob('a', { state: 'running', milestones: [{ id: 'm1', label: '开始', at: 't0' }] }) }
    const overwritten = makeJob('a', { state: 'succeeded', milestones: [] }) // 新快照里 milestones 清空
    const next = mergeJob(prev, overwritten)
    expect(next.a).toEqual(overwritten) // 全量覆盖：旧 milestones 不会被"合并保留"
    expect(mergeJob(next, overwritten).a).toEqual(overwritten) // 幂等
  })

  it('不修改入参对象（immutable update，供 React state setter 直接用）', () => {
    const prev = { a: makeJob('a') }
    const next = mergeJob(prev, makeJob('a', { state: 'running' }))
    expect(prev.a!.state).toBe('queued')
    expect(next).not.toBe(prev)
  })
})
