import { describe, expect, it } from 'vitest'
import { backlogApplyArgs, isValidBacklogId, isValidSlug, nextUpArgs, promoteArgs, reviewArgs } from '../../actions/whitelist.js'

describe('whitelist 参数卫生', () => {
  it('isValidSlug 接受合法 kebab-case，拒绝非法字符', () => {
    expect(isValidSlug('grok-build-teardown')).toBe(true)
    expect(isValidSlug('a1')).toBe(true)
    expect(isValidSlug('BAD SLUG!!')).toBe(false)
    expect(isValidSlug('')).toBe(false)
    expect(isValidSlug(undefined)).toBe(false)
    expect(isValidSlug(123)).toBe(false)
  })

  it('isValidBacklogId 只接受 YYYY-MM-DD-NNN', () => {
    expect(isValidBacklogId('2026-07-19-001')).toBe(true)
    expect(isValidBacklogId('2026-7-19-001')).toBe(false)
    expect(isValidBacklogId('not-an-id')).toBe(false)
  })
})

describe('whitelist args 构造：唯一允许拼 media 参数的地方', () => {
  it('reviewArgs approved 不带 --reason', () => {
    const args = reviewArgs('slug-a', 'approved', undefined, false)
    expect(args).toEqual(['flip', 'slug-a', 'approved', '--json'])
  })

  it('reviewArgs rework 映射到 drafting 并带 --reason', () => {
    const args = reviewArgs('slug-a', 'rework', '事实核实不足', false)
    expect(args).toEqual(['flip', 'slug-a', 'drafting', '--reason', '事实核实不足', '--json'])
  })

  it('reviewArgs rejected 带 --reason 与 --dry-run', () => {
    const args = reviewArgs('slug-a', 'rejected', '选题不合适', true)
    expect(args).toEqual(['flip', 'slug-a', 'rejected', '--reason', '选题不合适', '--json', '--dry-run'])
  })

  it('backlogApplyArgs merge 带 --into', () => {
    const args = backlogApplyArgs('2026-01-01-001', 'merge', 'harness/logs/x.md', '2026-01-01-002', false)
    expect(args).toEqual([
      'backlog', 'apply', '2026-01-01-001', '--action', 'merge', '--proposal', 'harness/logs/x.md', '--into', '2026-01-01-002', '--json',
    ])
  })

  it('backlogApplyArgs archive 不带 --into', () => {
    const args = backlogApplyArgs('2026-01-01-001', 'archive', 'harness/logs/x.md', undefined, false)
    expect(args).toEqual(['backlog', 'apply', '2026-01-01-001', '--action', 'archive', '--proposal', 'harness/logs/x.md', '--json'])
  })

  it('promoteArgs 显式 id + slug', () => {
    const args = promoteArgs({ id: '2026-01-01-001', slug: 'my-slug' }, false)
    expect(args).toEqual(['promote', '2026-01-01-001', '--slug', 'my-slug', '--json'])
  })

  it('promoteArgs --auto + --date + --dry-run', () => {
    const args = promoteArgs({ auto: true, slug: 'my-slug', date: '2026-01-02' }, true)
    expect(args).toEqual(['promote', '--auto', '--slug', 'my-slug', '--date', '2026-01-02', '--json', '--dry-run'])
  })

  it('nextUpArgs set', () => {
    expect(nextUpArgs({ id: '2026-01-01-001' }, false)).toEqual(['next-up', 'set', '2026-01-01-001', '--json'])
  })

  it('nextUpArgs clear', () => {
    expect(nextUpArgs({ clear: true }, false)).toEqual(['next-up', 'clear', '--json'])
  })
})
