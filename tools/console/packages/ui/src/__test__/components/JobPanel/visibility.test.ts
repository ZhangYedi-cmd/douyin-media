import { describe, expect, it } from 'vitest'
import {
  activeSignature,
  computePanelVisibility,
  isJobRead,
  jobSignature,
  loadReadMap,
  markJobsRead,
  saveReadMap,
  type ReadMap,
  type StorageLike,
} from '../../../components/JobPanel/visibility'
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

describe('computePanelVisibility', () => {
  it('进行中（queued/running/verifying）必须显示，不受已读表影响', () => {
    const active = makeJob('a1', { state: 'running' })
    // 即便 readMap 里荒谬地也给它记了一条"已读"，进行中任务依然要出现在 activeJobs 里。
    const readMap: ReadMap = { a1: jobSignature(active) }
    const vis = computePanelVisibility([active], readMap)
    expect(vis.activeJobs).toEqual([active])
    expect(vis.hasActive).toBe(true)
    expect(vis.shouldRender).toBe(true)
  })

  it('已终结任务已读后从"未读"集合隐藏，且面板不再因它而占屏', () => {
    const done = makeJob('d1', { state: 'failed', endedAt: '2026-08-11T00:00:00Z' })
    const readMap: ReadMap = markJobsRead({}, [done])
    const vis = computePanelVisibility([done], readMap)
    expect(vis.terminalJobs).toEqual([done]) // 留档不丢：仍在 terminalJobs 里
    expect(vis.unreadTerminalJobs).toEqual([]) // 但已读，不在未读集合
    expect(vis.hasUnreadTerminal).toBe(false)
    expect(vis.shouldRender).toBe(false) // 没有进行中、也没有未读终结任务 → 不占屏
  })

  it('未读的已终结任务会让面板保持可见（默认修复前的失败发布任务场景）', () => {
    const failed = makeJob('publish-fail', { state: 'failed', endedAt: '2026-08-11T00:00:00Z' })
    const vis = computePanelVisibility([failed], {})
    expect(vis.unreadTerminalJobs).toEqual([failed])
    expect(vis.shouldRender).toBe(true)
  })

  it('状态/结果有更新后，即使 id 未变，之前的已读记录也会失效、重新可见', () => {
    const v1 = makeJob('r1', { state: 'failed', endedAt: '2026-08-11T00:00:00Z' })
    const readMap = markJobsRead({}, [v1])
    expect(isJobRead(v1, readMap)).toBe(true)

    // 同一 id，裁定结果后来才补上（verdict 从无到有）——签名变化，应重新判定为未读。
    const v2 = makeJob('r1', { state: 'failed', endedAt: '2026-08-11T00:00:00Z', verdict: { ok: false, note: '重试仍失败' } })
    expect(isJobRead(v2, readMap)).toBe(false)
    const vis = computePanelVisibility([v2], readMap)
    expect(vis.unreadTerminalJobs).toEqual([v2])
    expect(vis.shouldRender).toBe(true)
  })

  it('新到达的终结任务（不在已读表里）默认可见', () => {
    const oldDone = makeJob('old', { state: 'succeeded', endedAt: '2026-08-01T00:00:00Z' })
    const readMap = markJobsRead({}, [oldDone])
    const brandNew = makeJob('new', { state: 'succeeded', endedAt: '2026-08-19T00:00:00Z' })
    const vis = computePanelVisibility([oldDone, brandNew], readMap)
    expect(vis.unreadTerminalJobs).toEqual([brandNew])
    expect(vis.shouldRender).toBe(true)
  })

  it('空任务列表：面板不占位（保持 return null 行为）', () => {
    const vis = computePanelVisibility([], {})
    expect(vis.shouldRender).toBe(false)
  })
})

describe('activeSignature', () => {
  it('相同任务集合（id+state）签名相同，顺序无关', () => {
    const a = makeJob('a', { state: 'running' })
    const b = makeJob('b', { state: 'queued' })
    expect(activeSignature([a, b])).toBe(activeSignature([b, a]))
  })

  it('新增任务或状态迁移会改变签名（供"关闭后自动还魂"判定使用）', () => {
    const a = makeJob('a', { state: 'queued' })
    const sig1 = activeSignature([a])
    const aRunning = makeJob('a', { state: 'running' })
    expect(activeSignature([aRunning])).not.toBe(sig1)
    expect(activeSignature([a, makeJob('b', { state: 'queued' })])).not.toBe(sig1)
  })

  it('空数组签名为空串', () => {
    expect(activeSignature([])).toBe('')
  })
})

describe('loadReadMap / saveReadMap：localStorage 不可用时的兜底', () => {
  it('未传 storage（如 SSR/无 window）时 loadReadMap 返回空表、saveReadMap 静默跳过', () => {
    expect(loadReadMap(undefined)).toEqual({})
    expect(() => saveReadMap(undefined, { a: '1' })).not.toThrow()
  })

  it('storage.getItem 抛异常（隐私模式等）时 loadReadMap 兜底返回空表，不外抛', () => {
    const throwing: StorageLike = {
      getItem: () => {
        throw new Error('SecurityError: 访问被拒绝')
      },
      setItem: () => {},
    }
    expect(loadReadMap(throwing)).toEqual({})
  })

  it('storage.setItem 抛异常（配额满等）时 saveReadMap 静默失败，不外抛', () => {
    const throwing: StorageLike = {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError')
      },
    }
    expect(() => saveReadMap(throwing, { a: '1' })).not.toThrow()
  })

  it('存的内容损坏（非法 JSON）时 loadReadMap 兜底返回空表', () => {
    const corrupted: StorageLike = { getItem: () => '{not valid json', setItem: () => {} }
    expect(loadReadMap(corrupted)).toEqual({})
  })

  it('正常读写往返：save 后 load 能拿回同样的表', () => {
    const store = new Map<string, string>()
    const storage: StorageLike = {
      getItem: (k) => store.get(k) ?? null,
      setItem: (k, v) => {
        store.set(k, v)
      },
    }
    const map = markJobsRead({}, [makeJob('x', { state: 'succeeded', endedAt: '2026-08-19T00:00:00Z' })])
    saveReadMap(storage, map)
    expect(loadReadMap(storage)).toEqual(map)
  })
})

describe('markJobsRead', () => {
  it('空任务数组时原样返回（不复制出一个多余的新对象引用也可接受，只需值相等）', () => {
    const readMap: ReadMap = { a: '1' }
    expect(markJobsRead(readMap, [])).toEqual(readMap)
  })

  it('批量写入不影响入参本身（纯函数、不做原地修改）', () => {
    const readMap: ReadMap = {}
    const job = makeJob('a', { state: 'succeeded', endedAt: '2026-08-19T00:00:00Z' })
    const next = markJobsRead(readMap, [job])
    expect(readMap).toEqual({})
    expect(next).toEqual({ a: jobSignature(job) })
  })
})
