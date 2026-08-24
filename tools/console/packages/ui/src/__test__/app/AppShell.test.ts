import { describe, expect, it } from 'vitest'
import { navBadge, navCount, refreshMode } from '../../app/AppShell'
import type { OverviewData } from '@console/server/api-types'

function overview(overrides: Partial<OverviewData> = {}): OverviewData {
  return {
    dailyRun: undefined as unknown as OverviewData['dailyRun'],
    alerts: [],
    wip: {
      ideated: 1,
      drafting: 2,
      review: 0,
      approved: 1,
      scheduled: 3,
      published: 99,
      retro_done: 0,
      rejected: 5,
    } as OverviewData['wip'],
    todos: [],
    heartbeat: [],
    backlogWater: { ideaCount: 17, topScore: 8, topId: 't-1', daysSinceIdeate: 1 },
    harnessToday: { pendingProposals: 32 } as OverviewData['harnessToday'],
    ...overrides,
  } as OverviewData
}

describe('navCount（既有导出，补测覆盖）', () => {
  it('overview 未加载时返回 undefined', () => {
    expect(navCount('/kanban', undefined)).toBeUndefined()
  })

  it('/kanban 取在制合计（published/rejected 不计入）', () => {
    expect(navCount('/kanban', overview())).toBe(1 + 2 + 0 + 1 + 3)
  })

  it('/backlog 取选题池库存量', () => {
    expect(navCount('/backlog', overview())).toBe(17)
  })

  it('/harness 取待审提议数', () => {
    expect(navCount('/harness', overview())).toBe(32)
  })

  it('/metrics 等未登记路径返回 undefined', () => {
    expect(navCount('/metrics', overview())).toBeUndefined()
  })
})

describe('navBadge（E2：徽标语义判定）', () => {
  it('overview 未加载时任何路径都不出徽标', () => {
    expect(navBadge('/harness', undefined)).toBeUndefined()
  })

  it('/harness 待审提议数>0 时是 actionable（要我处理，警示色）', () => {
    expect(navBadge('/harness', overview())).toEqual({ count: 32, kind: 'actionable' })
  })

  it('边界：/harness 待审提议数=0 时降级成 info（没事不该报警）', () => {
    expect(navBadge('/harness', overview({ harnessToday: { pendingProposals: 0 } as OverviewData['harnessToday'] }))).toEqual({
      count: 0,
      kind: 'info',
    })
  })

  it('/kanban 在制数是 info（现状统计，不是待办），即使数值很大也不升级', () => {
    expect(navBadge('/kanban', overview())).toEqual({ count: 7, kind: 'info' })
  })

  it('/backlog 库存量是 info（现状统计）', () => {
    expect(navBadge('/backlog', overview())).toEqual({ count: 17, kind: 'info' })
  })

  it('未登记语义的路径（如 /metrics）不出徽标', () => {
    expect(navBadge('/metrics', overview())).toBeUndefined()
  })
})

describe('refreshMode（E4：刷新按钮降级/升级判定）', () => {
  it('SSE 已连接：quiet（弱化）', () => {
    expect(refreshMode('open')).toBe('quiet')
  })

  it('SSE 连接中：仍是 quiet，不在建连过程中就报警', () => {
    expect(refreshMode('connecting')).toBe('quiet')
  })

  it('SSE 已断开：reconnect（醒目重连）', () => {
    expect(refreshMode('closed')).toBe('reconnect')
  })
})
