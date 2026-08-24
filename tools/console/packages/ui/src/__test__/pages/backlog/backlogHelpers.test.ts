import { describe, expect, it } from 'vitest'
import {
  collisionPartnersOf,
  countStale,
  isStale,
  slugFromContentPath,
  SLUG_PATTERN,
  suggestSlug,
  topScoreOf,
} from '../../../pages/backlog/backlogHelpers'
import type { BacklogTopic } from '@console/core'
import type { BacklogCollision } from '@console/server/api-types'

function topic(overrides: Partial<BacklogTopic> & Pick<BacklogTopic, 'id' | 'created'>): BacklogTopic {
  return {
    title: '示例选题',
    alt_titles: [],
    track: 'depth',
    format: 'kouban',
    status: 'idea',
    content_path: null,
    score: null,
    tier: null,
    scores: null,
    urgency: 'queue',
    reason: '',
    links: [],
    tags: [],
    metrics: {},
    ...overrides,
  }
}

const NOW = new Date('2026-08-18T00:00:00.000Z')

describe('isStale / countStale', () => {
  it('阈值内（<=30 天）不算过期', () => {
    expect(isStale(topic({ id: 'a', created: '2026-07-19' }), NOW)).toBe(false) // 30 天整
  })

  it('超阈值（>30 天）算过期，对照 backlog.html「已 33 天」示例', () => {
    expect(isStale(topic({ id: 'a', created: '2026-07-16' }), NOW)).toBe(true) // 33 天
  })

  it('created 缺失/非法日期不算过期（不崩）', () => {
    expect(isStale(topic({ id: 'a', created: '' }), NOW)).toBe(false)
  })

  it('countStale 统计过期条数', () => {
    const ideas = [
      topic({ id: 'a', created: '2026-08-17' }), // 1 天，不过期
      topic({ id: 'b', created: '2026-07-01' }), // 48 天，过期
      topic({ id: 'c', created: '2026-06-01' }), // 78 天，过期
    ]
    expect(countStale(ideas, NOW)).toBe(2)
  })
})

describe('topScoreOf', () => {
  it('取分数最高条目', () => {
    const ideas = [
      topic({ id: 'a', created: '2026-08-01', score: 7.1 }),
      topic({ id: 'b', created: '2026-08-01', score: 8.7 }),
      topic({ id: 'c', created: '2026-08-01', score: 6.2 }),
    ]
    expect(topScoreOf(ideas)).toEqual({ score: 8.7, id: 'b' })
  })

  it('score 全为 null（系列题免打分）时返回 null', () => {
    expect(topScoreOf([topic({ id: 'a', created: '2026-08-01', score: null })])).toBeNull()
  })

  it('空数组返回 null', () => {
    expect(topScoreOf([])).toBeNull()
  })
})

describe('collisionPartnersOf', () => {
  const collisions: BacklogCollision[] = [
    { a: 'T-041', b: 'T-038', similarity: 0.83, conclusion: '二选一', reportPath: 'harness/logs/x.md' },
  ]

  it('作为 a 边命中，返回 b', () => {
    expect(collisionPartnersOf('T-041', collisions)).toEqual(['T-038'])
  })

  it('作为 b 边命中，返回 a（对称查找）', () => {
    expect(collisionPartnersOf('T-038', collisions)).toEqual(['T-041'])
  })

  it('无命中返回空数组', () => {
    expect(collisionPartnersOf('T-999', collisions)).toEqual([])
  })
})

describe('slugFromContentPath', () => {
  it('提取末段作为 slug', () => {
    expect(slugFromContentPath('content/2026-07-18/grok-build-teardown')).toBe('grok-build-teardown')
  })

  it('容忍尾斜杠', () => {
    expect(slugFromContentPath('content/2026-07-18/grok-build-teardown/')).toBe('grok-build-teardown')
  })

  it('null/undefined 返回 null', () => {
    expect(slugFromContentPath(null)).toBeNull()
    expect(slugFromContentPath(undefined)).toBeNull()
  })
})

describe('suggestSlug', () => {
  it('标题含足量拉丁词时直接 slugify', () => {
    const slug = suggestSlug('MCP Explained in 3 Minutes', '2026-07-09-001')
    expect(SLUG_PATTERN.test(slug)).toBe(true)
    expect(slug).toBe('mcp-explained-in-3-minutes')
  })

  it('纯中文标题退化为 topic-<id 末 3 位>，且始终满足 SLUG_PATTERN', () => {
    const slug = suggestSlug('AI 眼镜会取代手机吗', '2026-07-09-042')
    expect(slug).toBe('topic-042')
    expect(SLUG_PATTERN.test(slug)).toBe(true)
  })

  it('产出恒满足 server SLUG_RE（kebab-case，首字符 a-z0-9）', () => {
    const cases: [string, string][] = [
      ['一人公司月入过万的账本', '2026-07-03-037'],
      ['Claude Code 新的 dynamic workflows', '2026-06-14-001'],
      ['', '2026-06-14-999'],
    ]
    for (const [title, id] of cases) {
      expect(SLUG_PATTERN.test(suggestSlug(title, id))).toBe(true)
    }
  })
})
