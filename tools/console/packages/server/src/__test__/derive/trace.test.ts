import { describe, expect, it } from 'vitest'
import { buildSnapshot } from '@console/core'
import { FIXTURE_REPO_ROOT } from '../../../__test__/fixtures.js'
import { deriveDailyTrace, deriveHarnessToday } from '../../derive/trace.js'

describe('deriveDailyTrace（乙类场景1文件轨迹，S6）', () => {
  it('今日（review-sample 所在日期）推进到 review 阶段，带 evidence 链', () => {
    const snap = buildSnapshot(FIXTURE_REPO_ROOT)
    const now = new Date('2030-01-06T23:00:00')
    const trace = deriveDailyTrace(FIXTURE_REPO_ROOT, snap, now)
    expect(trace.date).toBe('2030-01-06')
    expect(trace.phase).toBe('review')
    expect(trace.slug).toBe('review-sample')
    expect(trace.evidence.map((e) => e.phase)).toContain('scripted')
    expect(trace.evidence.map((e) => e.phase)).toContain('review')
    expect(trace.logPath).toBe('pipeline/logs/2030-01-06.md')
    expect(trace.logTail.length).toBeGreaterThan(0)
  })

  it('今日无任何内容目录时 phase=idle', () => {
    const snap = buildSnapshot(FIXTURE_REPO_ROOT)
    const now = new Date('2099-12-31T12:00:00')
    const trace = deriveDailyTrace(FIXTURE_REPO_ROOT, snap, now)
    expect(trace.phase).toBe('idle')
    expect(trace.evidence).toEqual([])
  })

  it('published-sample 所在日期无 audio-segments/rendered 观测点时最高只到 scripted', () => {
    const snap = buildSnapshot(FIXTURE_REPO_ROOT)
    const now = new Date('2030-01-05T23:00:00')
    const trace = deriveDailyTrace(FIXTURE_REPO_ROOT, snap, now)
    // published-sample 有 assets/*.mp4 但 meta.status=published（非 review），故不会推到 review 阶段；
    // 有 mp4 应推到 rendered。
    expect(trace.phase).toBe('rendered')
  })
})

describe('deriveHarnessToday', () => {
  it('按日期过滤 ran/reports，pendingProposals 为全量口径', () => {
    const snap = buildSnapshot(FIXTURE_REPO_ROOT)
    // 注意：故意不带 Z 后缀——本地时间构造，与 harness ts 字段（naive 本地字符串，如 fixture 的
    // "2030-01-09T09:00:00"）同一时区语境，避免本机 TZ=+8 时 UTC 输入跨日导致断言假失败。
    const now = new Date('2030-01-09T20:00:00')
    const today = deriveHarnessToday(snap, now)
    expect(today.ran).toBe(1) // 只有 2030-01-09 那条 retro run
    expect(today.reports).toBe(1)
    // pendingProposals：全量 applied:false && findings>0（retro 一条），与「今日」无关
    expect(today.pendingProposals).toBe(1)
  })
})
