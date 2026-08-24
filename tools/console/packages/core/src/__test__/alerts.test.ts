import { describe, it, expect } from 'vitest'
import { computeAlerts, expireRules, previewExpiry, DEFAULT_ALERT_CFG } from '../alerts.js'
import { buildSnapshot } from '../snapshot.js'
import { FIXTURE_REPO_ROOT } from '../../__test__/fixtures.js'
import type { BacklogTopic, ContentEntry, ContentMeta, Snapshot } from '../types.js'

const NOW = new Date('2026-08-18T21:00:00')

function meta(overrides: Partial<ContentMeta> = {}): ContentMeta {
  return {
    slug: 'x',
    title: 't',
    type: 'kouban',
    pillar: 'depth',
    status: 'ideated',
    source: null,
    schedule: null,
    publish_url: null,
    timestamps: {},
    blocker: {},
    ...overrides,
  }
}

function content(overrides: Partial<ContentEntry> = {}): ContentEntry {
  return {
    slug: 'x',
    dir: 'content/2026-08-01/x',
    meta: meta(),
    deliverables: { video: false, cover: false, script: false, publish: false },
    ...overrides,
  }
}

function topic(overrides: Partial<BacklogTopic> = {}): BacklogTopic {
  return {
    id: '2026-08-01-001',
    title: 't',
    alt_titles: [],
    track: 'depth',
    format: 'kouban',
    status: 'idea',
    content_path: null,
    score: 4,
    tier: 'S',
    scores: null,
    urgency: 'queue',
    reason: '',
    links: [],
    tags: [],
    created: '2026-08-01',
    metrics: {},
    plan_file: null,
    ...overrides,
  }
}

function snapshot(overrides: Partial<Snapshot> = {}): Snapshot {
  return {
    generatedAt: NOW.toISOString(),
    root: '/fixture',
    contents: [],
    backlog: { nextUp: null, topics: [] },
    harness: [],
    metrics: [],
    parseErrors: [],
    ...overrides,
  }
}

function findAlerts(alerts: ReturnType<typeof computeAlerts>, rule: string) {
  return alerts.filter((a) => a.rule === rule)
}

describe('CHK-01 双层不同步（历史事故回归：meta 翻了 backlog 没翻）', () => {
  it('meta=published 但 backlog(source) 仍是 picked → error', () => {
    const snap = snapshot({
      contents: [
        content({
          slug: 'desync-fixture',
          dir: 'content/2026-06-30/desync-fixture',
          meta: meta({ slug: 'desync-fixture', status: 'published', source: '2026-06-30-999', publish_url: 'https://x' }),
        }),
      ],
      backlog: { nextUp: null, topics: [topic({ id: '2026-06-30-999', status: 'picked' })] },
    })
    const alerts = findAlerts(computeAlerts(snap, NOW), 'CHK-01')
    expect(alerts.length).toBe(1)
    expect(alerts[0]!.level).toBe('error')
    expect(alerts[0]!.subject).toBe('desync-fixture')
  })

  it('backlog=published 但 meta 未达 published → error（反向同一规则）', () => {
    const snap = snapshot({
      contents: [
        content({
          slug: 'desync-fixture-2',
          meta: meta({ slug: 'desync-fixture-2', status: 'review', source: '2026-06-30-998' }),
        }),
      ],
      backlog: { nextUp: null, topics: [topic({ id: '2026-06-30-998', status: 'published' })] },
    })
    const alerts = findAlerts(computeAlerts(snap, NOW), 'CHK-01')
    expect(alerts.length).toBe(1)
    expect(alerts[0]!.subject).toBe('2026-06-30-998')
  })

  it('双层一致时不报警', () => {
    const snap = snapshot({
      contents: [content({ meta: meta({ status: 'published', source: 'id-1', publish_url: 'https://x' }) })],
      backlog: { nextUp: null, topics: [topic({ id: 'id-1', status: 'published' })] },
    })
    expect(findAlerts(computeAlerts(snap, NOW), 'CHK-01')).toEqual([])
  })
})

describe('CHK-02 picked 断链', () => {
  it('content_path 为空 → error', () => {
    const snap = snapshot({ backlog: { nextUp: null, topics: [topic({ status: 'picked', content_path: null })] } })
    expect(findAlerts(computeAlerts(snap, NOW), 'CHK-02').length).toBe(1)
  })

  it('content_path 指向的目录在快照里查无 meta → error', () => {
    const snap = snapshot({
      backlog: { nextUp: null, topics: [topic({ status: 'picked', content_path: 'content/2026-08-01/ghost' })] },
    })
    expect(findAlerts(computeAlerts(snap, NOW), 'CHK-02').length).toBe(1)
  })

  it('content_path 有对应条目时不报警', () => {
    const snap = snapshot({
      contents: [content({ dir: 'content/2026-08-01/real' })],
      backlog: { nextUp: null, topics: [topic({ status: 'picked', content_path: 'content/2026-08-01/real' })] },
    })
    expect(findAlerts(computeAlerts(snap, NOW), 'CHK-02')).toEqual([])
  })
})

describe('CHK-03 scheduled 超时（历史事故回归：EP04 / open-weight-5，用真实 fixture）', () => {
  it('EP04 fixture：schedule=2026-06-19 20:00，now=2026-08-18 远超 24h → error', () => {
    const snap = buildSnapshot(FIXTURE_REPO_ROOT)
    const alerts = findAlerts(computeAlerts(snap, NOW), 'CHK-03')
    const ep04 = alerts.find((a) => a.subject === 'ep04-esc-abort-chain')
    expect(ep04).toBeDefined()
    expect(ep04!.level).toBe('error')
    expect(ep04!.since).toBe('2026-06-19 20:00')
  })

  it('刚过 schedule 不到 24h 时不报警', () => {
    const snap = snapshot({
      contents: [content({ meta: meta({ status: 'scheduled', schedule: '2026-08-18 20:00' }) })],
    })
    expect(findAlerts(computeAlerts(snap, new Date('2026-08-18T21:00:00')), 'CHK-03')).toEqual([])
  })

  it('超过 24h 后报警', () => {
    const snap = snapshot({
      contents: [content({ meta: meta({ status: 'scheduled', schedule: '2026-08-17 20:00' }) })],
    })
    expect(findAlerts(computeAlerts(snap, new Date('2026-08-18T21:00:00')), 'CHK-03').length).toBe(1)
  })
})

describe('CHK-04 review 积压', () => {
  it('review 停留超 48h → warn', () => {
    const snap = snapshot({
      contents: [
        content({ meta: meta({ status: 'review', timestamps: { review: '2026-08-15' } }) }),
      ],
    })
    const alerts = findAlerts(computeAlerts(snap, NOW), 'CHK-04')
    expect(alerts.length).toBe(1)
    expect(alerts[0]!.level).toBe('warn')
  })

  it('review 未满 48h 不报警', () => {
    const snap = snapshot({
      contents: [content({ meta: meta({ status: 'review', timestamps: { review: '2026-08-18' } }) })],
    })
    expect(findAlerts(computeAlerts(snap, NOW), 'CHK-04')).toEqual([])
  })
})

describe('CHK-05 链接待补（历史事故回归：published 无链接，用真实 grok-build-teardown fixture）', () => {
  it('grok-build-teardown：status=published 且 publish_url 为空 → warn', () => {
    const snap = buildSnapshot(FIXTURE_REPO_ROOT)
    const alerts = findAlerts(computeAlerts(snap, NOW), 'CHK-05')
    expect(alerts.some((a) => a.subject === 'grok-build-teardown')).toBe(true)
  })

  it('published 且有链接时不报警', () => {
    const snap = snapshot({
      contents: [content({ meta: meta({ status: 'published', publish_url: 'https://v.douyin.com/x' }) })],
    })
    expect(findAlerts(computeAlerts(snap, NOW), 'CHK-05')).toEqual([])
  })
})

describe('CHK-06 指针断裂', () => {
  it('meta.source 为空 → warn', () => {
    const snap = snapshot({ contents: [content({ meta: meta({ source: null }) })] })
    expect(findAlerts(computeAlerts(snap, NOW), 'CHK-06').length).toBe(1)
  })

  it('meta.source 在 backlog 查无此 id → warn', () => {
    const snap = snapshot({ contents: [content({ meta: meta({ source: 'ghost-id' }) })] })
    expect(findAlerts(computeAlerts(snap, NOW), 'CHK-06').length).toBe(1)
  })

  it('backlog.content_path 与 meta 实际目录不一致 → warn', () => {
    const snap = snapshot({
      contents: [content({ dir: 'content/2026-08-01/real', meta: meta({ source: 'id-1' }) })],
      backlog: { nextUp: null, topics: [topic({ id: 'id-1', content_path: 'content/2026-08-01/other' })] },
    })
    expect(findAlerts(computeAlerts(snap, NOW), 'CHK-06').length).toBe(1)
  })

  it('指针完整一致时不报警', () => {
    const snap = snapshot({
      contents: [content({ dir: 'content/2026-08-01/real', meta: meta({ source: 'id-1' }) })],
      backlog: { nextUp: null, topics: [topic({ id: 'id-1', content_path: 'content/2026-08-01/real' })] },
    })
    expect(findAlerts(computeAlerts(snap, NOW), 'CHK-06')).toEqual([])
  })
})

describe('CHK-07 临近过期', () => {
  it('urgency=today 且 created 距今 1 天（还差 1 天命中 R1）→ info', () => {
    const snap = snapshot({
      backlog: {
        nextUp: null,
        topics: [topic({ urgency: 'today', created: '2026-08-17' })], // NOW=08-18 21:00，距今约 1 天
      },
    })
    const alerts = findAlerts(computeAlerts(snap, NOW), 'CHK-07')
    expect(alerts.length).toBe(1)
    expect(alerts[0]!.level).toBe('info')
  })

  it('已经命中机械规则（该被 sweep）的不算「临近」，CHK-07 不重复报', () => {
    const snap = snapshot({
      backlog: { nextUp: null, topics: [topic({ urgency: 'today', created: '2026-08-10' })] },
    })
    expect(findAlerts(computeAlerts(snap, NOW), 'CHK-07')).toEqual([])
    expect(expireRules(snap.backlog.topics[0]!, NOW).length).toBeGreaterThan(0)
  })

  it('距命中还很远时不报警', () => {
    const snap = snapshot({
      backlog: { nextUp: null, topics: [topic({ urgency: 'queue', created: '2026-08-18' })] },
    })
    expect(findAlerts(computeAlerts(snap, NOW), 'CHK-07')).toEqual([])
  })
})

describe('CHK-08 疑似空跑', () => {
  it('工作日阈值时点后无当日 content 目录 → warn', () => {
    // 2026-08-18 是周二
    const snap = snapshot({ contents: [content({ dir: 'content/2026-08-17/yesterday' })] })
    const alerts = findAlerts(computeAlerts(snap, new Date('2026-08-18T21:30:00')), 'CHK-08')
    expect(alerts.length).toBe(1)
  })

  it('当日已有 content 目录则不报警', () => {
    const snap = snapshot({ contents: [content({ dir: 'content/2026-08-18/today' })] })
    expect(findAlerts(computeAlerts(snap, new Date('2026-08-18T21:30:00')), 'CHK-08')).toEqual([])
  })

  it('阈值时点之前不报警', () => {
    const snap = snapshot({ contents: [] })
    expect(findAlerts(computeAlerts(snap, new Date('2026-08-18T10:00:00')), 'CHK-08')).toEqual([])
  })

  it('周末不报警', () => {
    // 2026-08-15 是周六
    const snap = snapshot({ contents: [] })
    expect(findAlerts(computeAlerts(snap, new Date('2026-08-15T21:30:00')), 'CHK-08')).toEqual([])
  })
})

describe('expiresIn / expireRules（与 backlog ls --expiring 共用引擎）', () => {
  it('R2 timeliness>=4 超 7 天命中', () => {
    const t = topic({ created: '2026-08-01', scores: { practical: 3, social: 3, emotion: 3, hook: 3, timeliness: 4, trigger: 3 } })
    expect(expireRules(t, new Date('2026-08-10T00:00:00')).map((m) => m.rule)).toContain('R2')
  })

  it('非 idea 状态永不命中/预演', () => {
    const t = topic({ status: 'picked', urgency: 'today', created: '2026-08-01' })
    expect(expireRules(t, NOW)).toEqual([])
    expect(previewExpiry(t, NOW)).toBeNull()
  })

  it('已逾期未清扫时 previewExpiry 返回负数天数（不同于「尚未命中」的 CHK-07 语义）', () => {
    const t = topic({ urgency: 'today', created: '2026-08-10' }) // NOW=08-18，超 2 天阈值
    const preview = previewExpiry(t, NOW)
    expect(preview).not.toBeNull()
    expect(preview!.days).toBeLessThan(0)
  })
})

describe('DEFAULT_ALERT_CFG 可覆盖', () => {
  it('自定义 cfg 生效（调小 CHK-04 阈值）', () => {
    const snap = snapshot({
      contents: [content({ meta: meta({ status: 'review', timestamps: { review: '2026-08-18 12:00' } }) })],
    })
    const cfg = { ...DEFAULT_ALERT_CFG, reviewStalledHours: 1 }
    const alerts = findAlerts(computeAlerts(snap, new Date('2026-08-18T21:00:00'), cfg), 'CHK-04')
    expect(alerts.length).toBe(1)
  })
})
