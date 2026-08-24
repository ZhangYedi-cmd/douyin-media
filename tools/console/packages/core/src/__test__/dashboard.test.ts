import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import { hasAllMarkers, renderZone, replaceZones } from '../dashboard.js'
import { buildSnapshot } from '../snapshot.js'
import { computeAlerts } from '../alerts.js'
import { fixturePath, FIXTURE_REPO_ROOT } from '../../__test__/fixtures.js'

describe('dashboard markers', () => {
  it('fixture dashboard.md 三对标记齐全', () => {
    const raw = fs.readFileSync(fixturePath('dashboard.md'), 'utf8')
    expect(hasAllMarkers(raw)).toBe(true)
  })

  it('缺任一标记时 hasAllMarkers=false', () => {
    expect(hasAllMarkers('<!-- auto:wip:begin -->x<!-- auto:wip:end -->')).toBe(false)
  })
})

describe('replaceZones', () => {
  it('只替换标记内内容，标记外一个字节不动', () => {
    const raw = fs.readFileSync(fixturePath('dashboard.md'), 'utf8')
    const out = replaceZones(raw, { wip: '\nNEW WIP CONTENT\n' })
    expect(out).toContain('NEW WIP CONTENT')
    expect(out).toContain('## 待人确认 ⚠') // 标记外内容原样保留
    expect(out).toContain('## 数据汇总（复盘线维护）')
    // 除 wip 区外，其余字节完全一致
    const before = raw.replace(/<!-- auto:wip:begin -->[\s\S]*?<!-- auto:wip:end -->/, 'X')
    const after = out.replace(/<!-- auto:wip:begin -->[\s\S]*?<!-- auto:wip:end -->/, 'X')
    expect(after).toBe(before)
  })

  it('目标区标记缺失 → E_NO_MARKERS，整体拒绝', () => {
    const raw = '# no markers here\n'
    expect(() => replaceZones(raw, { wip: 'x' })).toThrow(/E_NO_MARKERS|缺少/)
  })

  it('可同时替换多个区', () => {
    const raw = fs.readFileSync(fixturePath('dashboard.md'), 'utf8')
    const out = replaceZones(raw, { wip: '\nA\n', backlog: '\nB\n', alerts: '\nC\n' })
    expect(out).toContain('\nA\n')
    expect(out).toContain('\nB\n')
    expect(out).toContain('\nC\n')
  })
})

describe('renderZone', () => {
  const snap = buildSnapshot(FIXTURE_REPO_ROOT)
  const now = new Date('2026-08-18T21:00:00')
  const alerts = computeAlerts(snap, now)

  it('wip 区列出在制条目（open-weight-5 / ep04 均 scheduled）', () => {
    const zone = renderZone('wip', snap, alerts)
    expect(zone).toContain('open-weight-5')
    expect(zone).toContain('ep04-esc-abort-chain')
    expect(zone).toContain('scheduled')
  })

  it('backlog 区含计数与 next_up', () => {
    const zone = renderZone('backlog', snap, alerts)
    expect(zone).toMatch(/idea/)
    expect(zone).toContain('next_up')
  })

  it('alerts 区含 CHK-03/CHK-05 条目', () => {
    const zone = renderZone('alerts', snap, alerts)
    expect(zone).toContain('CHK-03')
    expect(zone).toContain('CHK-05')
  })

  it('空快照时 wip/alerts 区给出空态提示，不留标记冲突字符', () => {
    const emptySnap = { ...snap, contents: [] }
    const zone = renderZone('wip', emptySnap, [])
    expect(zone).toContain('无在制条目')
    const azone = renderZone('alerts', emptySnap, [])
    expect(azone).toContain('无警报')
  })
})
