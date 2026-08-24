import { describe, it, expect } from 'vitest'
import { buildTrendPoints, formatCompact, formatDateLabel, formatInt, formatPercent } from '../../../pages/metrics/format'
import type { MetricsSnapshotRow, MetricsTrendPoint } from '@console/server/api-types'

describe('formatPercent', () => {
  it('保留一位小数，整数不补 .0', () => {
    expect(formatPercent(31)).toBe('31%')
    expect(formatPercent(27.8)).toBe('27.8%')
  })
  it('多位小数四舍五入到一位', () => {
    expect(formatPercent(27.849)).toBe('27.8%')
  })
})

describe('formatInt', () => {
  it('千分位分隔', () => {
    expect(formatInt(12400)).toBe('12,400')
    expect(formatInt(486)).toBe('486')
  })
})

describe('formatCompact', () => {
  it('小于 1000 原样整数', () => {
    expect(formatCompact(486)).toBe('486')
  })
  it('千级换算成 k，一位小数', () => {
    expect(formatCompact(91300)).toBe('91.3k')
    expect(formatCompact(1000)).toBe('1k')
  })
  it('百万级换算成 M', () => {
    expect(formatCompact(2_500_000)).toBe('2.5M')
  })
})

describe('formatDateLabel', () => {
  it('YYYY-MM-DD → MM-DD', () => {
    expect(formatDateLabel('2026-07-06')).toBe('07-06')
  })
  it('带时间的 ISO 字符串同样只取日期部分', () => {
    expect(formatDateLabel('2026-07-06T10:00:00+08:00')).toBe('07-06')
  })
  it('解析不出时原样返回，不装作能解析', () => {
    expect(formatDateLabel('未知窗口')).toBe('未知窗口')
  })
})

describe('buildTrendPoints', () => {
  const snapshots: MetricsSnapshotRow[] = [
    { slug: 'a', title: 'EP-A', publishedAt: '2026-07-04', window: '7d', plays: 45200, completion: 27 },
    { slug: 'b', title: null, publishedAt: null, window: '72h' },
  ]

  it('按 date 升序排列，映射出 x/y/tip', () => {
    const trend: MetricsTrendPoint[] = [
      { date: '2026-07-06', slug: 'a', completion: 31 },
      { date: '2026-07-04', slug: 'a', completion: 27 },
    ]
    const points = buildTrendPoints(trend, snapshots)
    expect(points.map((p) => p.x)).toEqual(['07-04', '07-06'])
    expect(points[0]!.y).toBe(27)
    expect(points[0]!.tip).toContain('EP-A')
    expect(points[0]!.tip).toContain('完播 27%')
    expect(points[0]!.tip).toContain('45.2k 播放')
  })

  it('completion 为 null 时 y 透传 null（LineChart 断线用），tip 不编造完播文案', () => {
    const trend: MetricsTrendPoint[] = [{ date: '2026-07-05', slug: 'b', completion: null }]
    const points = buildTrendPoints(trend, snapshots)
    expect(points[0]!.y).toBeNull()
    expect(points[0]!.tip).not.toContain('完播')
    expect(points[0]!.tip).not.toContain('播放') // snapshot b 无 plays 字段，不编造
  })

  it('snapshots 里查不到对应 slug 时退回 slug 本身，不装有标题', () => {
    const trend: MetricsTrendPoint[] = [{ date: '2026-07-01', slug: 'unknown-slug', completion: 10 }]
    const points = buildTrendPoints(trend, snapshots)
    expect(points[0]!.tip).toContain('unknown-slug')
  })
})
