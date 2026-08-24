import { describe, it, expect } from 'vitest'
import { runCli, runCliJson, FIXTURE_REPO_ROOT } from '../../../__test__/helpers.js'

describe('media st（fixture 仓）', () => {
  it('无 slug：总览列在制条目（open-weight-5 / ep04 均 scheduled）', () => {
    const { result, json } = runCliJson<{ data: { items: { slug: string; status: string }[] } }>([
      'st',
      '--json',
      '--root',
      FIXTURE_REPO_ROOT,
    ])
    expect(result.status).toBe(0)
    const slugs = json.data.items.map((i) => i.slug)
    expect(slugs).toContain('open-weight-5')
    expect(slugs).toContain('ep04-esc-abort-chain')
  })

  it('给定 slug：单条全量记录字段齐全', () => {
    const { result, json } = runCliJson<{ data: Record<string, unknown> }>([
      'st',
      'grok-build-teardown',
      '--json',
      '--root',
      FIXTURE_REPO_ROOT,
    ])
    expect(result.status).toBe(0)
    expect(json.data.status).toBe('published')
    expect(json.data.publish_url).toBeNull()
    expect(json.data.deliverables).toEqual({ video: true, cover: true, script: true, publish: true })
    expect(json.data.legalNext).toEqual(['retro_done'])
    expect(json.data.pointerOk).toBe(true)
  })

  it('slug 不存在 → E_NOT_FOUND，exit 1', () => {
    const { result, json } = runCliJson<{ ok: boolean; error: { code: string } }>([
      'st',
      'not-exist-slug',
      '--json',
      '--root',
      FIXTURE_REPO_ROOT,
    ])
    expect(result.status).toBe(1)
    expect(json.ok).toBe(false)
    expect(json.error.code).toBe('E_NOT_FOUND')
  })

  it('人读模式（无 --json）能正常输出且 exit 0', () => {
    const result = runCli(['st', '--root', FIXTURE_REPO_ROOT])
    expect(result.status).toBe(0)
    expect(result.stdout.length).toBeGreaterThan(0)
  })
})
