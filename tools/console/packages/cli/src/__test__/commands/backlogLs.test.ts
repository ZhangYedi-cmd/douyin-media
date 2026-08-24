import { describe, it, expect } from 'vitest'
import { runCli, runCliJson, FIXTURE_REPO_ROOT } from '../../../__test__/helpers.js'

describe('media backlog ls（fixture 仓）', () => {
  it('缺省只列 idea，count 统计全状态', () => {
    const { result, json } = runCliJson<{ data: { count: Record<string, number>; topics: { status: string }[] } }>([
      'backlog',
      'ls',
      '--json',
      '--root',
      FIXTURE_REPO_ROOT,
    ])
    expect(result.status).toBe(0)
    expect(json.data.topics.every((t) => t.status === 'idea')).toBe(true)
    expect(json.data.count.idea).toBeGreaterThan(0)
  })

  it('--status picked 只列 picked（open-weight-5 对应条目）', () => {
    const { json } = runCliJson<{ data: { topics: { id: string; status: string }[] } }>([
      'backlog',
      'ls',
      '--status',
      'picked',
      '--json',
      '--root',
      FIXTURE_REPO_ROOT,
    ])
    expect(json.data.topics.every((t) => t.status === 'picked')).toBe(true)
    expect(json.data.topics.some((t) => t.id === '2026-06-14-003')).toBe(true)
  })

  it('--expiring 附带 expiresIn/expireRule 字段', () => {
    const { json } = runCliJson<{ data: { topics: { expiresIn?: number }[] } }>([
      'backlog',
      'ls',
      '--expiring',
      '--json',
      '--root',
      FIXTURE_REPO_ROOT,
    ])
    for (const t of json.data.topics) expect(typeof t.expiresIn).toBe('number')
  })

  it('非法 --status 枚举值 → exit 2', () => {
    const result = runCli(['backlog', 'ls', '--status', 'bogus', '--json', '--root', FIXTURE_REPO_ROOT])
    expect(result.status).toBe(2)
  })

  it('非法 --track 枚举值 → exit 2', () => {
    const result = runCli(['backlog', 'ls', '--track', 'bogus', '--json', '--root', FIXTURE_REPO_ROOT])
    expect(result.status).toBe(2)
  })

  it('--limit 生效', () => {
    const { json } = runCliJson<{ data: { topics: unknown[] } }>([
      'backlog',
      'ls',
      '--status',
      'idea',
      '--limit',
      '2',
      '--json',
      '--root',
      FIXTURE_REPO_ROOT,
    ])
    expect(json.data.topics.length).toBeLessThanOrEqual(2)
  })
})
