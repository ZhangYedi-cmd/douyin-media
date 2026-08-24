import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { buildSnapshot } from '../snapshot.js'
import { FIXTURE_REPO_ROOT } from '../../__test__/fixtures.js'

describe('buildSnapshot (fixture repo)', () => {
  it('聚合 fixture 仓：3 个 content 条目、backlog topics、harness runs 均非空，无 parseError', () => {
    const snap = buildSnapshot(FIXTURE_REPO_ROOT)
    expect(snap.root).toBe(FIXTURE_REPO_ROOT)
    expect(snap.contents.length).toBe(3)
    expect(snap.backlog.topics.length).toBeGreaterThan(0)
    expect(snap.harness.length).toBeGreaterThan(0)
    expect(snap.parseErrors).toEqual([])
  })

  it('deliverables 探测：grok-build-teardown 四件齐全', () => {
    const snap = buildSnapshot(FIXTURE_REPO_ROOT)
    const grok = snap.contents.find((c) => c.slug === 'grok-build-teardown')!
    expect(grok.deliverables).toEqual({ video: true, cover: true, script: true, publish: true })
  })

  it('deliverables 探测：open-weight-5 没有 assets/2-script/4-publish，四件全 false', () => {
    const snap = buildSnapshot(FIXTURE_REPO_ROOT)
    const ow5 = snap.contents.find((c) => c.slug === 'open-weight-5')!
    expect(ow5.deliverables).toEqual({ video: false, cover: false, script: false, publish: false })
  })

  it('content/_template、content/_backlog 不计入 contents（下划线保留目录跳过）', () => {
    const snap = buildSnapshot(FIXTURE_REPO_ROOT)
    expect(snap.contents.some((c) => c.slug === '_template')).toBe(false)
    expect(snap.contents.some((c) => c.slug === '_backlog')).toBe(false)
  })

  it('单个 meta.yaml 解析损坏时该条目标 parseError，不拖垮其余条目（降级不抛穿）', () => {
    // 用临时仓：复制 fixture 仓根，破坏其中一个 meta.yaml
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'console-snapshot-'))
    fs.cpSync(FIXTURE_REPO_ROOT, tmp, { recursive: true })
    fs.writeFileSync(
      path.join(tmp, 'content/2026-07-18/grok-build-teardown/meta.yaml'),
      'status: [broken\n  nested',
    )
    const snap = buildSnapshot(tmp)
    expect(snap.parseErrors.length).toBe(1)
    const broken = snap.contents.find((c) => c.slug === 'grok-build-teardown')!
    expect(broken.meta).toBeNull()
    expect(broken.parseError).toBeDefined()
    // 其余条目仍正常
    expect(snap.contents.find((c) => c.slug === 'open-weight-5')!.meta).not.toBeNull()
    fs.rmSync(tmp, { recursive: true, force: true })
  })
})
