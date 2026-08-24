import { describe, expect, it } from 'vitest'
import type { HarnessTaskRow } from '@console/server/api-types'
import { DEFAULT_LEDGER_DAYS, daysSince, latestTaskRun, ledgerEmptyHint } from '../../../pages/harness/ledgerWindow'

const NOW = new Date('2026-08-19T12:00:00')

function task(name: string, lastRun: string | null): HarnessTaskRow {
  return { name, skill: null, enabled: true, trigger: 'periodic:7d', lastRun, overdue: false }
}

describe('latestTaskRun', () => {
  it('取最近一次运行；忽略从未运行过的任务', () => {
    expect(latestTaskRun([task('a', '2026-07-19T09:09:00'), task('b', null), task('c', '2026-06-28T10:20:00')])).toBe(
      '2026-07-19T09:09:00',
    )
  })

  it('全部没跑过时返回 null', () => {
    expect(latestTaskRun([task('a', null), task('b', null)])).toBeNull()
  })

  it('空注册表返回 null', () => {
    expect(latestTaskRun([])).toBeNull()
  })
})

describe('daysSince', () => {
  it('按整天向下取整', () => {
    expect(daysSince('2026-07-19T09:09:00', NOW)) // 31 天多一点
      .toBe(31)
  })

  it('非法时间戳返回 null，不抛异常', () => {
    expect(daysSince('不是时间', NOW)).toBeNull()
  })
})

describe('ledgerEmptyHint', () => {
  it('治理线一次都没跑过时，不建议用户调窗口', () => {
    const hint = ledgerEmptyHint(DEFAULT_LEDGER_DAYS, [task('a', null)], NOW)
    expect(hint.text).toContain('还没有任何运行记录')
    expect(hint.suggestDays).toBeNull()
  })

  it('有记录但落在窗口外：说清最后一次时间与天数，并建议刚好覆盖它的档位', () => {
    // 真实触发场景：最后一次 07-19，距今 31 天，默认窗口 30 天——差一天全被切掉
    const hint = ledgerEmptyHint(30, [task('retro', '2026-07-19T09:09:00')], NOW)
    expect(hint.text).toContain('最近 30 天没有运行记录')
    expect(hint.text).toContain('2026-07-19')
    expect(hint.text).toContain('31 天前')
    expect(hint.suggestDays).toBe(90) // 7/30 都盖不住 31 天，下一档是 90
  })

  it('已经是最大窗口时不再建议放宽（避免给一个点了没用的链接）', () => {
    const hint = ledgerEmptyHint(3650, [task('retro', '2026-07-19T09:09:00')], NOW)
    expect(hint.suggestDays).toBeNull()
  })

  it('记录就在窗口内却仍为空：给中性兜底，不编造原因', () => {
    const hint = ledgerEmptyHint(90, [task('retro', '2026-07-19T09:09:00')], NOW)
    expect(hint.text).toContain('最近 90 天没有运行记录')
    expect(hint.suggestDays).toBeNull()
  })

  it('最后一次就在今天、窗口也覆盖得到时，走中性兜底且不建议调窗口', () => {
    const hint = ledgerEmptyHint(1, [task('retro', '2026-08-19T09:00:00')], NOW)
    expect(hint.text).toContain('2026-08-19')
    expect(hint.suggestDays).toBeNull()
  })
})
