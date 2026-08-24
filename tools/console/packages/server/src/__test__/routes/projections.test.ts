import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildSnapshot } from '@console/core'
import { copyFixtureRepoToTemp, FIXTURE_NOW, FIXTURE_REPO_ROOT, buildTestStore } from '../../../__test__/fixtures.js'
import {
  projectBacklog,
  projectContentDetail,
  projectContents,
  projectHarness,
  projectMetrics,
  projectOverview,
} from '../../routes/projections.js'

describe('projectOverview', () => {
  it('wip 按 8 个 MetaStatus 计数', () => {
    const store = buildTestStore()
    const data = projectOverview(store)
    expect(data.wip.published).toBe(1)
    expect(data.wip.review).toBe(1)
    expect(data.wip.ideated).toBe(0)
  })

  it('heartbeat 来自 store.harnessTasks（task/trigger/lastRun/overdue 透传）', () => {
    const store = buildTestStore()
    const data = projectOverview(store)
    const ideate = data.heartbeat.find((h) => h.task === 'ideate')!
    expect(ideate.overdue).toBe(true)
  })

  it('backlogWater 取 idea 中最高分', () => {
    const store = buildTestStore()
    const data = projectOverview(store)
    expect(data.backlogWater.ideaCount).toBe(2)
    expect(data.backlogWater.topId).toBe('2030-01-01-001')
    expect(data.backlogWater.topScore).toBe(4.2)
  })

  it('harnessToday 直接透传 store.harnessToday', () => {
    const store = buildTestStore()
    const data = projectOverview(store)
    expect(data.harnessToday).toEqual(store.harnessToday)
  })
})

describe('projectContents', () => {
  it('默认列出全部条目，按 dir 倒序', () => {
    const store = buildTestStore()
    const data = projectContents(store, {})
    expect(data.total).toBe(2)
    expect(data.items[0]!.slug).toBe('review-sample') // 2030-01-06 晚于 2030-01-05
    expect(data.items[1]!.slug).toBe('published-sample')
  })

  it('status 过滤', () => {
    const store = buildTestStore()
    const data = projectContents(store, { status: ['published'] })
    expect(data.items.map((i) => i.slug)).toEqual(['published-sample'])
  })

  it('limit 截断但 total 仍是过滤后全量', () => {
    const store = buildTestStore()
    const data = projectContents(store, { limit: 1 })
    expect(data.items.length).toBe(1)
    expect(data.total).toBe(2)
  })

  it('enteredAt 取当前状态对应的 timestamps 值', () => {
    const store = buildTestStore()
    const data = projectContents(store, {})
    const review = data.items.find((i) => i.slug === 'review-sample')!
    expect(review.enteredAt).toBe('2030-01-07 09:00')
  })

  it('meta 解析失败的条目降级带 parseError，不剔除，不拖垮其余条目', () => {
    const tmp = copyFixtureRepoToTemp()
    fs.writeFileSync(path.join(tmp, 'content/2030-01-06/review-sample/meta.yaml'), 'status: [broken\n  nested')
    const store = buildTestStore(tmp)
    const data = projectContents(store, {})
    expect(data.total).toBe(2)
    const broken = data.items.find((i) => i.slug === 'review-sample')!
    expect(broken.parseError).toBeDefined()
    expect(data.parseErrors.length).toBe(1)
    fs.rmSync(tmp, { recursive: true, force: true })
  })
})

describe('projectContentDetail', () => {
  it('不存在的 slug 返回 null', () => {
    const store = buildTestStore()
    expect(projectContentDetail(store, 'nonexistent')).toBeNull()
  })

  it('timeline 覆盖全部 8 个 MetaStatus，按状态机顺序', () => {
    const store = buildTestStore()
    const data = projectContentDetail(store, 'review-sample')!
    expect(data.timeline.map((t) => t.status)).toEqual([
      'ideated', 'drafting', 'review', 'approved', 'scheduled', 'published', 'retro_done', 'rejected',
    ])
    expect(data.timeline.find((t) => t.status === 'review')!.at).toBe('2030-01-07 09:00')
    expect(data.timeline.find((t) => t.status === 'approved')!.at).toBeNull()
  })

  it('files 探测存在性：2-script.md 存在、3-review.md 存在（本条目有留痕）、4-publish.md 存在', () => {
    const store = buildTestStore()
    const data = projectContentDetail(store, 'review-sample')!
    const byRole = Object.fromEntries(data.files.map((f) => [f.role, f]))
    expect(byRole['2-script.md']!.exists).toBe(true)
    expect(byRole['3-review.md']!.exists).toBe(true)
    expect(byRole['1-brief.md']!.exists).toBe(false)
  })

  it('published-sample 的 files 探测到 cover/video 两个衍生角色', () => {
    const store = buildTestStore()
    const data = projectContentDetail(store, 'published-sample')!
    const roles = data.files.map((f) => f.role)
    expect(roles).toContain('cover')
    expect(roles).toContain('video')
  })

  it('allowedTransitions 来自 core legalNext，action 恒为 review', () => {
    const store = buildTestStore()
    const data = projectContentDetail(store, 'review-sample')!
    expect(data.allowedTransitions.map((t) => t.to).sort()).toEqual(['approved', 'drafting', 'rejected'])
    expect(data.allowedTransitions.every((t) => t.action === 'review')).toBe(true)
  })

  it('published-sample：治理线迁移（retro_done）被过滤，allowedTransitions 为空（C 验收发现项 #1 修正）', () => {
    const store = buildTestStore()
    const data = projectContentDetail(store, 'published-sample')!
    // published→retro_done 是治理线唯一迁移，看板动作层无法达成，透出即幽灵项
    expect(data.allowedTransitions).toEqual([])
  })

  it('source.backlogId 来自 meta.source', () => {
    const store = buildTestStore()
    const data = projectContentDetail(store, 'review-sample')!
    expect(data.source).toEqual({ backlogId: '2030-01-02-001' })
  })

  it('auditTrail 解析 3-review.md 留痕行，kind 按内容分类', () => {
    const store = buildTestStore()
    const data = projectContentDetail(store, 'review-sample')!
    expect(data.auditTrail.length).toBe(2)
    expect(data.auditTrail[0]!.kind).toBe('feishu')
    expect(data.auditTrail[1]!.kind).toBe('rework')
    expect(data.reworkCount).toBe(1)
  })

  it('publishInfo 解析 4-publish.md 的标题/简介/标签三字段', () => {
    const store = buildTestStore()
    const data = projectContentDetail(store, 'review-sample')!
    expect(data.publishInfo).toEqual({
      title: '出审测试条目标题',
      desc: '这是一段测试用简介文案。',
      tags: ['#测试', '#console'],
    })
  })

  it('无 4-publish.md 时 publishInfo 为 null', () => {
    const store = buildTestStore()
    const data = projectContentDetail(store, 'published-sample')!
    expect(data.publishInfo).toBeNull()
  })

  it('checks 里含四项交付物体检，deliverables 齐全的条目全 ok', () => {
    const store = buildTestStore()
    const data = projectContentDetail(store, 'published-sample')!
    const byLabel = Object.fromEntries(data.checks.map((c) => [c.label, c]))
    expect(byLabel['成片']!.level).toBe('ok')
    expect(byLabel['封面']!.level).toBe('ok')
  })
})

describe('projectBacklog', () => {
  it('stats 四态计数', () => {
    const store = buildTestStore()
    const data = projectBacklog(store, {})
    expect(data.stats).toEqual({ idea: 2, picked: 1, published: 1, expired: 0 })
  })

  it('nextPick 按 score 取最高（next_up 为空）', () => {
    const store = buildTestStore()
    const data = projectBacklog(store, {})
    expect(data.nextPick).not.toBeNull()
    expect(data.nextPick!.id).toBe('2030-01-01-001')
    expect(data.nextPick!.viaPointer).toBe(false)
  })

  it('collisions 从最近一份 gardener 报告解析出撞题结论', () => {
    const store = buildTestStore()
    const data = projectBacklog(store, {})
    expect(data.collisions.length).toBe(1)
    expect(data.collisions[0]).toMatchObject({ a: '2030-01-01-001', b: '2030-01-01-002', similarity: 0.82 })
  })

  it('nextUpId 透传 backlog.yaml 的 next_up', () => {
    const store = buildTestStore()
    expect(projectBacklog(store, {}).nextUpId).toBeNull()
  })
})

describe('projectHarness', () => {
  it('ledger 含 fixture 三条运行记录（fixture ts 均在未来，window 过滤天然全含）', () => {
    const store = buildTestStore()
    const data = projectHarness(store, 30)
    expect(data.ledger.length).toBe(3)
  })

  it('proposals 只收 applied:false 且 findings>0 的条目', () => {
    const store = buildTestStore()
    const data = projectHarness(store, 30)
    expect(data.proposals.length).toBe(1)
    expect(data.proposals[0]!.reportPath).toBe('harness/logs/2030-01-09-retro.md')
  })

  it('retroMatrix 按 published 内容 × 窗口聚合，命中的窗口标 ok', () => {
    const store = buildTestStore()
    const data = projectHarness(store, 30)
    const row = data.retroMatrix.find((r) => r.slug === 'published-sample')!
    expect(row.windows['24h']).toBe('ok')
    expect(row.windows['72h']).toBe('pending')
  })

  it('reports 列出 harness/logs 下全部 .md 报告文件', () => {
    const store = buildTestStore()
    const data = projectHarness(store, 30)
    const names = data.reports.map((r) => path.basename(r.path)).sort()
    expect(names).toEqual(['2030-01-01-backlog-gardener.md', '2030-01-08-ideate.md', '2030-01-09-retro.md'])
  })
})

describe('projectMetrics', () => {
  it('available=true 且按 slug 取最新窗口快照', () => {
    const store = buildTestStore()
    const data = projectMetrics(store)
    expect(data.available).toBe(true)
    expect(data.snapshots.length).toBe(1)
    expect(data.snapshots[0]).toMatchObject({ slug: 'published-sample', window: '72h', plays: 2400, completion: 0.4 })
  })

  it('summary 汇总 published/withSnapshot/avgCompletion/totalPlays', () => {
    const store = buildTestStore()
    const data = projectMetrics(store)
    expect(data.summary.published).toBe(1)
    expect(data.summary.withSnapshot).toBe(1)
    expect(data.summary.avgCompletion).toBeCloseTo(0.4)
    expect(data.summary.totalPlays).toBe(2400)
  })

  it('trend 按时间升序列出全部记录', () => {
    const store = buildTestStore()
    const data = projectMetrics(store)
    expect(data.trend.map((t) => t.completion)).toEqual([0.35, 0.4])
  })

  it('无 metrics 记录时 available=false，不抛异常', () => {
    const tmp = copyFixtureRepoToTemp()
    fs.rmSync(path.join(tmp, 'harness/logs/metrics.jsonl'))
    const store = buildTestStore(tmp)
    const data = projectMetrics(store)
    expect(data.available).toBe(false)
    expect(data.snapshots).toEqual([])
    fs.rmSync(tmp, { recursive: true, force: true })
  })

  it('?slug= 过滤单条', () => {
    const store = buildTestStore()
    const data = projectMetrics(store, 'no-such-slug')
    expect(data.available).toBe(false)
  })
})

// 冒烟：确认 buildSnapshot 与 FIXTURE_NOW 组合本身零 parseError（fixture 数据完整性防腐）。
describe('fixture 完整性', () => {
  it('fixture 仓 buildSnapshot 零 parseError', () => {
    const snap = buildSnapshot(FIXTURE_REPO_ROOT)
    expect(snap.parseErrors).toEqual([])
  })
  it('FIXTURE_NOW 落在 review-sample 出审之后', () => {
    expect(FIXTURE_NOW.getTime()).toBeGreaterThan(new Date('2030-01-07T09:00:00').getTime())
  })
})
