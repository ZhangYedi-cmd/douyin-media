import { describe, it, expect } from 'vitest'
import {
  META_TRANSITIONS,
  BACKLOG_TRANSITIONS,
  assertMetaTransition,
  assertBacklogTransition,
  legalNext,
  pickNext,
  renderTransitionTable,
} from '../state.js'
import type { BacklogStatus, MetaStatus, Snapshot } from '../types.js'

const META_STATUSES: MetaStatus[] = [
  'ideated',
  'drafting',
  'review',
  'approved',
  'scheduled',
  'published',
  'retro_done',
  'rejected',
]

const BACKLOG_STATUSES: BacklogStatus[] = ['idea', 'picked', 'published', 'expired', 'rejected', 'archived']

describe('meta 迁移表：8x8 穷举，逐格对齐 §2.14', () => {
  for (const from of META_STATUSES) {
    for (const to of META_STATUSES) {
      const legal = META_TRANSITIONS[from]?.[to]
      it(`${from} → ${to}：${legal ? '合法' : '非法'}`, () => {
        if (legal) {
          expect(assertMetaTransition(from, to)).toEqual(legal)
        } else {
          expect(() => assertMetaTransition(from, to)).toThrow(/非法/)
        }
      })
    }
  }

  it('review→rejected 要求 requiresReason=true', () => {
    expect(assertMetaTransition('review', 'rejected').requiresReason).toBe(true)
  })

  it('其余迁移 requiresReason=false', () => {
    expect(assertMetaTransition('ideated', 'drafting').requiresReason).toBe(false)
    expect(assertMetaTransition('approved', 'published').requiresReason).toBe(false)
  })

  it('published→retro_done 标记 line=harness（治理线迁移）', () => {
    expect(assertMetaTransition('published', 'retro_done').line).toBe('harness')
  })

  it('其余迁移 line=production', () => {
    expect(assertMetaTransition('ideated', 'drafting').line).toBe('production')
    expect(assertMetaTransition('scheduled', 'published').line).toBe('production')
  })

  it('retro_done 是终态，任何目标都非法', () => {
    for (const to of META_STATUSES) {
      expect(() => assertMetaTransition('retro_done', to)).toThrow()
    }
  })

  it('legalNext 返回该状态全部合法出边', () => {
    expect(legalNext('published')).toEqual(['retro_done'])
    expect(new Set(legalNext('review'))).toEqual(new Set(['drafting', 'approved', 'rejected']))
    expect(legalNext('retro_done')).toEqual([])
  })

  it('非法迁移报错信息含合法出边提示', () => {
    try {
      assertMetaTransition('review', 'published')
      throw new Error('应抛错未抛')
    } catch (err: any) {
      expect(err.code).toBe('E_ILLEGAL_TRANSITION')
      expect(err.message).toContain('drafting')
      expect(err.message).toContain('approved')
    }
  })
})

describe('backlog 迁移表：6x6 穷举', () => {
  for (const from of BACKLOG_STATUSES) {
    for (const to of BACKLOG_STATUSES) {
      const legal = BACKLOG_TRANSITIONS[from]?.[to]
      it(`${from} → ${to}：${legal ? '合法' : '非法'}`, () => {
        if (legal) {
          expect(assertBacklogTransition(from, to)).toEqual(legal)
        } else {
          expect(() => assertBacklogTransition(from, to)).toThrow(/非法/)
        }
      })
    }
  }
})

describe('renderTransitionTable', () => {
  it('输出含全部 8 个状态与 publish-done 提示', () => {
    const table = renderTransitionTable()
    for (const s of META_STATUSES) expect(table).toContain(s)
    expect(table).toContain('media publish-done')
  })
})

function makeBacklog(topics: Snapshot['backlog']['topics'], nextUp: string | null = null): Snapshot['backlog'] {
  return { nextUp, topics }
}

function idea(id: string, score: number | null, extra: Partial<Snapshot['backlog']['topics'][number]> = {}) {
  return {
    id,
    title: `title-${id}`,
    alt_titles: [],
    track: 'depth' as const,
    format: 'kouban' as const,
    status: 'idea' as const,
    content_path: null,
    score,
    tier: null,
    scores: null,
    urgency: 'queue' as const,
    reason: '',
    links: [],
    tags: [],
    created: '2026-08-01',
    metrics: {},
    plan_file: null,
    ...extra,
  }
}

describe('pickNext', () => {
  it('next_up 指向合法 idea 时优先取它', () => {
    const backlog = makeBacklog([idea('a', 3), idea('b', 5)], 'a')
    const d = pickNext(backlog)
    expect(d.decision).toBe('next_up')
    expect(d.id).toBe('a')
    expect(d.warnings).toEqual([])
  })

  it('next_up 指向非 idea 条目时忽略指针改按 score 取题并告警', () => {
    const backlog = makeBacklog([idea('a', 3, { status: 'picked' }), idea('b', 5)], 'a')
    const d = pickNext(backlog)
    expect(d.decision).toBe('score')
    expect(d.id).toBe('b')
    expect(d.warnings.length).toBe(1)
  })

  it('next_up 指向不存在 id 时忽略指针改按 score 取题并告警', () => {
    const backlog = makeBacklog([idea('b', 5)], 'not-exist')
    const d = pickNext(backlog)
    expect(d.decision).toBe('score')
    expect(d.id).toBe('b')
    expect(d.warnings.length).toBe(1)
  })

  it('next_up 空时按 score 降序取最高', () => {
    const backlog = makeBacklog([idea('a', 3), idea('b', 5), idea('c', 4)])
    const d = pickNext(backlog)
    expect(d.decision).toBe('score')
    expect(d.id).toBe('b')
    expect(d.runnerUp.map((r) => r.id)).toEqual(['c', 'a'])
  })

  it('同分时 depth 优先于 traffic', () => {
    const backlog = makeBacklog([idea('a', 4, { track: 'traffic' }), idea('b', 4, { track: 'depth' })])
    expect(pickNext(backlog).id).toBe('b')
  })

  it('同分同赛道时 created 早者优先', () => {
    const backlog = makeBacklog([
      idea('a', 4, { created: '2026-08-05' }),
      idea('b', 4, { created: '2026-08-01' }),
    ])
    expect(pickNext(backlog).id).toBe('b')
  })

  it('同分同赛道同 created 时按 id 字典序', () => {
    const backlog = makeBacklog([idea('z', 4), idea('a', 4)])
    expect(pickNext(backlog).id).toBe('a')
  })

  it('score 为 null 的条目排在最后（不阻塞取题，但不会被优先选中）', () => {
    const backlog = makeBacklog([idea('a', null), idea('b', 3)])
    expect(pickNext(backlog).id).toBe('b')
  })

  it('池中无 idea 时 decision=empty', () => {
    const backlog = makeBacklog([idea('a', 3, { status: 'published' })])
    const d = pickNext(backlog)
    expect(d.decision).toBe('empty')
    expect(d.id).toBeNull()
  })

  it('expired/picked/published/archived/rejected 天然排除', () => {
    const backlog = makeBacklog([
      idea('a', 9, { status: 'expired' }),
      idea('b', 9, { status: 'picked' }),
      idea('c', 9, { status: 'published' }),
      idea('d', 9, { status: 'archived' }),
      idea('e', 9, { status: 'rejected' }),
      idea('f', 1),
    ])
    expect(pickNext(backlog).id).toBe('f')
  })
})
