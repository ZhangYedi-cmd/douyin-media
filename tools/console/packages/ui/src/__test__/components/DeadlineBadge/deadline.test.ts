import { describe, it, expect } from 'vitest'
import { computeDeadlineState } from '../../../components/DeadlineBadge/deadline'

// S3 验收②：since=49h 前 → warn；since=47h 前 → 默认色（阈值断言，默认 warnAfterHours=48）。
describe('computeDeadlineState', () => {
  const now = new Date('2026-08-18T12:00:00.000Z')
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 60 * 60 * 1000).toISOString()

  it('since 49 小时前，默认阈值 48h → warn', () => {
    const state = computeDeadlineState({ since: hoursAgo(49) }, now)
    expect(state.level).toBe('warn')
  })

  it('since 47 小时前，默认阈值 48h → default（未到 warn）', () => {
    const state = computeDeadlineState({ since: hoursAgo(47) }, now)
    expect(state.level).toBe('default')
  })

  it('since 48 小时整 → 已达阈值边界，判 warn（>=）', () => {
    const state = computeDeadlineState({ since: hoursAgo(48) }, now)
    expect(state.level).toBe('warn')
  })

  it('dangerAfterHours 设置后，超过它转 danger', () => {
    const state = computeDeadlineState({ since: hoursAgo(100), dangerAfterHours: 72 }, now)
    expect(state.level).toBe('danger')
  })

  it('未设置 dangerAfterHours 时，即使停留很久也不升级到 danger（默认不启用）', () => {
    const state = computeDeadlineState({ since: hoursAgo(1000) }, now)
    expect(state.level).toBe('warn')
  })

  it('prefix 会拼进文案前缀', () => {
    const state = computeDeadlineState({ since: hoursAgo(1), prefix: 'review 停留' }, now)
    expect(state.text.startsWith('review 停留')).toBe(true)
  })

  it('deadline 未过期 → default，文案显示剩余时间', () => {
    const future = new Date(now.getTime() + 5 * 60 * 60 * 1000).toISOString()
    const state = computeDeadlineState({ deadline: future }, now)
    expect(state.level).toBe('default')
    expect(state.text).toContain('剩')
  })

  it('deadline 已过 38 小时，默认阈值 48h → 仍是 default（未到 warn）', () => {
    const past = new Date(now.getTime() - 38 * 60 * 60 * 1000).toISOString()
    const state = computeDeadlineState({ deadline: past }, now)
    expect(state.level).toBe('default')
    expect(state.text).toContain('已过')
  })

  it('deadline 已过 60 小时，默认阈值 48h → warn', () => {
    const past = new Date(now.getTime() - 60 * 60 * 60 * 1000).toISOString()
    const state = computeDeadlineState({ deadline: past }, now)
    expect(state.level).toBe('warn')
  })

  it('既无 since 也无 deadline → default，文案回退 prefix 或占位符', () => {
    const state = computeDeadlineState({}, now)
    expect(state.level).toBe('default')
    expect(state.text).toBe('—')
  })
})
