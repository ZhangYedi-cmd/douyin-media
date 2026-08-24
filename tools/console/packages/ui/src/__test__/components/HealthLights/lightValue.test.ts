import { describe, expect, it } from 'vitest'
import { formatMs, formatRelative, lightValueText } from '../../../components/HealthLights/lightValue'
import type { HealthData } from '@console/server/api-types'

const NOW = new Date('2026-08-19T10:00:00Z')

function health(overrides: Partial<HealthData> = {}): HealthData {
  return {
    ok: true,
    revision: 1,
    now: NOW.toISOString(),
    lights: [],
    uptimeSec: 100,
    snapshot: { builtAt: NOW.toISOString(), buildMs: 63, parseErrors: 0 },
    watcher: { watching: true, lastEventAt: NOW.toISOString() },
    jobs: { active: null, queued: 0 },
    tick: { lastAt: NOW.toISOString() },
    ...overrides,
  }
}

describe('formatRelative', () => {
  it('小于 1 分钟：刚刚', () => {
    expect(formatRelative(new Date(NOW.getTime() - 30_000).toISOString(), NOW)).toBe('刚刚')
  })

  it('边界：恰好 1 分钟 → 进入「N 分钟前」档', () => {
    expect(formatRelative(new Date(NOW.getTime() - 60_000).toISOString(), NOW)).toBe('1 分钟前')
  })

  it('分钟档：2 分钟前', () => {
    expect(formatRelative(new Date(NOW.getTime() - 2 * 60_000).toISOString(), NOW)).toBe('2 分钟前')
  })

  it('边界：恰好 1 小时 → 进入「N 小时前」档', () => {
    expect(formatRelative(new Date(NOW.getTime() - 3_600_000).toISOString(), NOW)).toBe('1 小时前')
  })

  it('小时档：3 小时前', () => {
    expect(formatRelative(new Date(NOW.getTime() - 3 * 3_600_000).toISOString(), NOW)).toBe('3 小时前')
  })

  it('边界：恰好 24 小时 → 进入「N 天前」档', () => {
    expect(formatRelative(new Date(NOW.getTime() - 86_400_000).toISOString(), NOW)).toBe('1 天前')
  })

  it('天档：2 天前', () => {
    expect(formatRelative(new Date(NOW.getTime() - 2 * 86_400_000).toISOString(), NOW)).toBe('2 天前')
  })

  it('未来时刻（时钟漂移）兜底显示刚刚，不显示负数', () => {
    expect(formatRelative(new Date(NOW.getTime() + 5_000).toISOString(), NOW)).toBe('刚刚')
  })

  it('null/undefined 显示 —', () => {
    expect(formatRelative(null, NOW)).toBe('—')
    expect(formatRelative(undefined, NOW)).toBe('—')
  })

  it('非法日期字符串显示 —', () => {
    expect(formatRelative('not-a-date', NOW)).toBe('—')
  })
})

describe('formatMs', () => {
  it('小于 1000ms 显示整数 ms', () => {
    expect(formatMs(63)).toBe('63ms')
    expect(formatMs(63.6)).toBe('64ms')
  })

  it('边界：恰好 1000ms → 进入秒档', () => {
    expect(formatMs(1000)).toBe('1.0s')
  })

  it('大于等于 1000ms 显示 1 位小数的秒', () => {
    expect(formatMs(1234)).toBe('1.2s')
  })
})

describe('lightValueText', () => {
  it('snapshot：无解析失败时显示构建耗时', () => {
    expect(lightValueText('snapshot', health({ snapshot: { builtAt: NOW.toISOString(), buildMs: 63, parseErrors: 0 } }), NOW)).toBe(
      '63ms',
    )
  })

  it('snapshot：有解析失败时显示失败数（比耗时更值得关注）', () => {
    expect(
      lightValueText('snapshot', health({ snapshot: { builtAt: NOW.toISOString(), buildMs: 63, parseErrors: 2 } }), NOW),
    ).toBe('2 个失败')
  })

  it('watcher：监听中显示最近事件的相对时间', () => {
    expect(
      lightValueText(
        'watcher',
        health({ watcher: { watching: true, lastEventAt: new Date(NOW.getTime() - 2 * 60_000).toISOString() } }),
        NOW,
      ),
    ).toBe('2 分钟前')
  })

  it('watcher：未监听时显示「未监听」，不显示过期的最近事件时间', () => {
    expect(lightValueText('watcher', health({ watcher: { watching: false, lastEventAt: NOW.toISOString() } }), NOW)).toBe(
      '未监听',
    )
  })

  it('jobs：空闲时只显示队列长度（label 已经是「任务队列」，不重复「队列」二字）', () => {
    expect(lightValueText('jobs', health({ jobs: { active: null, queued: 3 } }), NOW)).toBe('3')
  })

  it('jobs：有任务进行中时额外标出，与纯排队区分', () => {
    expect(lightValueText('jobs', health({ jobs: { active: 'job-1', queued: 2 } }), NOW)).toBe('进行中 · 排队 2')
  })

  it('tick：显示最近一次体检的相对时间', () => {
    expect(lightValueText('tick', health({ tick: { lastAt: new Date(NOW.getTime() - 3_600_000).toISOString() } }), NOW)).toBe(
      '1 小时前',
    )
  })

  it('未知 light id 兜底空串', () => {
    expect(lightValueText('unknown', health(), NOW)).toBe('')
  })
})
