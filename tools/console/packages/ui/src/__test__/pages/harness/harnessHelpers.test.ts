import { describe, expect, it } from 'vitest'
import { daysSince, parsePeriodicDays, taskRunText, triggerLabel } from '../../../pages/harness/harnessHelpers'
import type { HarnessTaskRow } from '@console/server/api-types'

const NOW = new Date('2026-08-18T12:00:00.000Z')

function task(overrides: Partial<HarnessTaskRow>): HarnessTaskRow {
  return { name: 'x', skill: 'x', enabled: true, trigger: 'periodic:2d', lastRun: null, overdue: false, ...overrides }
}

describe('parsePeriodicDays', () => {
  it('解析 periodic:Nd', () => {
    expect(parsePeriodicDays('periodic:7d')).toBe(7)
  })
  it('非 periodic 触发器返回 null', () => {
    expect(parsePeriodicDays('event:发布后')).toBeNull()
    expect(parsePeriodicDays('weighted-pool')).toBeNull()
  })
})

describe('daysSince', () => {
  it('计算整天数', () => {
    expect(daysSince('2026-08-16T12:00:00.000Z', NOW)).toBe(2)
  })
  it('非法日期返回 null', () => {
    expect(daysSince('not-a-date', NOW)).toBeNull()
  })
})

describe('taskRunText', () => {
  it('periodic 任务未逾期：显示天数', () => {
    const t = task({ trigger: 'periodic:7d', lastRun: '2026-08-15T12:00:00.000Z', overdue: false })
    expect(taskRunText(t, NOW)).toEqual({ text: '3 天', warn: false })
  })

  it('periodic 任务逾期：天数 + ⚠ 逾期 尾缀，warn=true', () => {
    const t = task({ trigger: 'periodic:2d', lastRun: '2026-08-10T12:00:00.000Z', overdue: true })
    const r = taskRunText(t, NOW)
    expect(r.warn).toBe(true)
    expect(r.text).toBe('8 天 ⚠ 逾期')
  })

  it('event 触发任务：显示最近运行的日期时间，不算天数（本地时间展示，用无 Z 后缀的 ISO 串避开跑测机时区差异）', () => {
    const t = task({ trigger: 'event:发布后', lastRun: '2026-07-10T22:00:00', overdue: false })
    expect(taskRunText(t, NOW).text).toBe('最近 07-10 22:00')
  })

  it('从无运行记录：两类触发器都显示「尚无运行记录」，warn 采信 server overdue', () => {
    expect(taskRunText(task({ trigger: 'periodic:2d', lastRun: null, overdue: true }), NOW)).toEqual({
      text: '尚无运行记录',
      warn: true,
    })
  })
})

// 07-界面用语对照表 §3：TaskRegistryTable「触发方式」列的翻译（harness/tasks.md 真实用到的
// 触发器字面量：periodic:Nd / weighted-pool / post-publish-window）。
describe('triggerLabel', () => {
  it('periodic:1d 显「每天」（不是「每 1 天」）', () => {
    expect(triggerLabel('periodic:1d')).toBe('每天')
  })
  it('periodic:Nd（N>1）显「每 N 天」', () => {
    expect(triggerLabel('periodic:30d')).toBe('每 30 天')
    expect(triggerLabel('periodic:2d')).toBe('每 2 天')
  })
  it('weighted-pool 显「按权重抽取」', () => {
    expect(triggerLabel('weighted-pool')).toBe('按权重抽取')
  })
  it('post-publish-window 显「发布后窗口触发」', () => {
    expect(triggerLabel('post-publish-window')).toBe('发布后窗口触发')
  })
  it('未知触发器兜底原样显示，不装作认识', () => {
    expect(triggerLabel('event:未知')).toBe('event:未知')
  })
})
