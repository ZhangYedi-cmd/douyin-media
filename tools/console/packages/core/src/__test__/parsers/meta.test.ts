import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import { parseMetaFile } from '../../parsers/meta.js'
import { fixturePath } from '../../../__test__/fixtures.js'

describe('parseMetaFile', () => {
  it('解析注释最重的真实 fixture（grok-build-teardown），字段齐全且不抛错', () => {
    const p = fixturePath('content/2026-07-18/grok-build-teardown/meta.yaml')
    const raw = fs.readFileSync(p, 'utf8')
    const { meta, doc } = parseMetaFile(raw, p)
    expect(meta.slug).toBe('grok-build-teardown')
    expect(meta.status).toBe('published')
    expect(meta.type).toBe('kouban')
    expect(meta.pillar).toBe('depth')
    expect(meta.source).toBe('2026-07-17-002')
    expect(meta.publish_url).toBeNull() // 真实数据：sau 未返回链接，CHK-05 应命中
    expect(meta.timestamps.published).toBe('2026-07-19 19:30')
    expect(meta.timestamps.approved).toBe('2026-07-19 19:28')
    expect(doc).toBeDefined() // Document 本体留给 writer.ts 点位编辑；完整字节级往返套件见 writer 阶段（R1，§4）
  })

  it('EP04 的 timestamps 用了非标准键 scheduled_submit，标准 scheduled 键缺失时不报错、按空处理', () => {
    const p = fixturePath('content/2026-06-18/ep04-esc-abort-chain/meta.yaml')
    const raw = fs.readFileSync(p, 'utf8')
    const { meta } = parseMetaFile(raw, p)
    expect(meta.status).toBe('scheduled')
    expect(meta.schedule).toBe('2026-06-19 20:00')
    expect(meta.timestamps.scheduled).toBeUndefined()
    expect(meta.timestamps.approved).toBe('2026-06-18 20:52')
  })

  it('EP04 缺少 blocker 字段时降级为空对象，不抛错', () => {
    const p = fixturePath('content/2026-06-18/ep04-esc-abort-chain/meta.yaml')
    const raw = fs.readFileSync(p, 'utf8')
    const { meta } = parseMetaFile(raw, p)
    expect(meta.blocker).toEqual({})
  })

  it('open-weight-5 用标准 timestamps.scheduled 键，能正常读到', () => {
    const p = fixturePath('content/2026-06-15/open-weight-5/meta.yaml')
    const raw = fs.readFileSync(p, 'utf8')
    const { meta } = parseMetaFile(raw, p)
    expect(meta.timestamps.scheduled).toBe('2026-06-15 00:34')
  })

  it('日期形态的标量（created/schedule）保持字符串，不被 yaml 解析成 Date', () => {
    const p = fixturePath('content/2026-06-15/open-weight-5/meta.yaml')
    const raw = fs.readFileSync(p, 'utf8')
    const { meta } = parseMetaFile(raw, p)
    expect(typeof meta.schedule).toBe('string')
  })

  it('YAML 语法损坏时抛错（供 snapshot.ts 捕获降级）', () => {
    const bad = 'status: [unterminated\n  nested: true'
    expect(() => parseMetaFile(bad, 'bad.yaml')).toThrow()
  })
})
