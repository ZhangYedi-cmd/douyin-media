import { describe, expect, it } from 'vitest'
import { groupByWipStatus, publishedGroup, rejectedGroup, WIP_STATUS_ORDER } from '../../../pages/kanban/kanbanGroups'
import type { ContentSummary } from '@console/server/api-types'

function item(overrides: Partial<ContentSummary> & Pick<ContentSummary, 'slug' | 'status'>): ContentSummary {
  return {
    title: overrides.slug,
    type: 'kouban',
    pillar: 'depth',
    dir: `content/x/${overrides.slug}`,
    source: null,
    enteredAt: null,
    timestamps: {},
    ...overrides,
  }
}

describe('groupByWipStatus', () => {
  it('按 WIP_STATUS_ORDER 顺序分组，口径覆盖 5 个在制状态', () => {
    expect(WIP_STATUS_ORDER).toEqual(['ideated', 'drafting', 'review', 'approved', 'scheduled'])
  })

  it('每条内容按 status 落入对应分组，published/rejected 不落入任何在制分组', () => {
    const items = [
      item({ slug: 'a', status: 'drafting' }),
      item({ slug: 'b', status: 'review' }),
      item({ slug: 'c', status: 'published' }),
      item({ slug: 'd', status: 'rejected' }),
    ]
    const groups = groupByWipStatus(items)
    expect(groups.find((g) => g.status === 'drafting')?.items.map((i) => i.slug)).toEqual(['a'])
    expect(groups.find((g) => g.status === 'review')?.items.map((i) => i.slug)).toEqual(['b'])
    expect(groups.reduce((sum, g) => sum + g.items.length, 0)).toBe(2) // 只有 a/b 落入在制分组
  })

  it('空组仍返回（items 为空数组），交渲染层决定隐藏', () => {
    const groups = groupByWipStatus([])
    expect(groups).toHaveLength(5)
    expect(groups.every((g) => g.items.length === 0)).toBe(true)
  })

  it('总条数与 P1 WipStats 同一口径：5 组条数之和 = wip 在制合计', () => {
    const items = WIP_STATUS_ORDER.map((s, i) => item({ slug: `s${i}`, status: s }))
    const groups = groupByWipStatus(items)
    expect(groups.reduce((sum, g) => sum + g.items.length, 0)).toBe(5)
  })
})

describe('publishedGroup', () => {
  it('合并 published 与 retro_done', () => {
    const items = [
      item({ slug: 'a', status: 'published', timestamps: { published: '2026-07-04' } }),
      item({ slug: 'b', status: 'retro_done', timestamps: { published: '2026-07-01' } }),
      item({ slug: 'c', status: 'drafting' }),
    ]
    expect(publishedGroup(items).map((i) => i.slug)).toEqual(['a', 'b'])
  })

  it('按发布时间倒序（最近的在前）', () => {
    const items = [
      item({ slug: 'old', status: 'published', timestamps: { published: '2026-06-01' } }),
      item({ slug: 'new', status: 'published', timestamps: { published: '2026-07-10' } }),
      item({ slug: 'mid', status: 'published', timestamps: { published: '2026-06-30' } }),
    ]
    expect(publishedGroup(items).map((i) => i.slug)).toEqual(['new', 'mid', 'old'])
  })

  it('无发布时间戳的排在末尾（空串 localeCompare 最小）', () => {
    const items = [
      item({ slug: 'has-ts', status: 'published', timestamps: { published: '2026-07-10' } }),
      item({ slug: 'no-ts', status: 'published', timestamps: {} }),
    ]
    expect(publishedGroup(items).map((i) => i.slug)).toEqual(['has-ts', 'no-ts'])
  })
})

describe('rejectedGroup', () => {
  it('只取 rejected 状态', () => {
    const items = [item({ slug: 'a', status: 'rejected' }), item({ slug: 'b', status: 'published' })]
    expect(rejectedGroup(items).map((i) => i.slug)).toEqual(['a'])
  })
})
