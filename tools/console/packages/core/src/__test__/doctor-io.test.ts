// gatherDoctorInput / runDoctor 的 IO 层测试：真实文件系统读，用专属 fixture 仓
// packages/core/__test__/fixtures/doctor-repo/（独立于 alerts/snapshot 共用的 fixtures/repo，
// 避免污染那边 snapshot.test.ts 的 contents.length 精确断言）。
import { describe, it, expect } from 'vitest'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildSnapshot } from '../snapshot.js'
import { runDoctor, gatherDoctorInput } from '../doctor.js'

const here = path.dirname(fileURLToPath(import.meta.url))
const DOCTOR_FIXTURE_ROOT = path.join(here, '../../__test__/fixtures/doctor-repo')

describe('gatherDoctorInput（真实文件读）', () => {
  it('legal-entry：读出的字段与路径存在性均正确', () => {
    const snap = buildSnapshot(DOCTOR_FIXTURE_ROOT)
    const entry = snap.contents.find((c) => c.slug === 'legal-entry')!
    const dInput = gatherDoctorInput(DOCTOR_FIXTURE_ROOT, entry)
    expect(dInput.rawStatus).toBe('published')
    expect(dInput.brief.nonEmpty).toBe(true)
    expect(dInput.script.hasH1).toBe(true)
    expect(dInput.publish.fields['标题']).toBe('一个体检全绿的样例条目')
    expect(dInput.publish.coverPath).toBe('assets/cover.png')
    expect(dInput.publish.coverPathExists).toBe(true)
    expect(dInput.publish.mediaPath).toBe('assets/legal-entry.mp4')
    expect(dInput.publish.mediaPathExists).toBe(true)
  })

  it('missing-publish：4-publish.md 真实不存在', () => {
    const snap = buildSnapshot(DOCTOR_FIXTURE_ROOT)
    const entry = snap.contents.find((c) => c.slug === 'missing-publish')!
    const dInput = gatherDoctorInput(DOCTOR_FIXTURE_ROOT, entry)
    expect(dInput.publish.exists).toBe(false)
  })

  it('series-episode：真实反查 backlog.yaml 里对应条目的 plan_file', () => {
    const snap = buildSnapshot(DOCTOR_FIXTURE_ROOT)
    const entry = snap.contents.find((c) => c.slug === 'series-episode')!
    const dInput = gatherDoctorInput(DOCTOR_FIXTURE_ROOT, entry, snap.backlog.topics)
    expect(dInput.seriesPlanFile).toBe('/plan/doctor-fixture-series/episodes/ep-x.md')
    expect(dInput.brief.exists).toBe(false)
  })

  it('不传 backlogTopics 时 seriesPlanFile 恒为 null（豁免默认不生效，保底安全）', () => {
    const snap = buildSnapshot(DOCTOR_FIXTURE_ROOT)
    const entry = snap.contents.find((c) => c.slug === 'series-episode')!
    const dInput = gatherDoctorInput(DOCTOR_FIXTURE_ROOT, entry)
    expect(dInput.seriesPlanFile).toBeNull()
  })
})

describe('runDoctor（core + IO 全链路，对全部 7 个 fixture 条目）', () => {
  it('端到端汇总：每个 fixture 条目命中预期规则', () => {
    const snap = buildSnapshot(DOCTOR_FIXTURE_ROOT)
    const alerts = runDoctor(DOCTOR_FIXTURE_ROOT, snap.contents, snap.backlog.topics)
    const bySlug = (slug: string) => alerts.filter((a) => a.subject === slug)

    expect(bySlug('legal-entry')).toEqual([])

    const missing = bySlug('missing-publish')
    expect(missing.some((a) => a.rule === 'DOC-07' && a.level === 'error')).toBe(true)

    const sixTags = bySlug('six-tags')
    expect(sixTags.some((a) => a.rule === 'DOC-09' && a.message.includes('6'))).toBe(true)

    const badSchedule = bySlug('bad-schedule')
    expect(badSchedule.some((a) => a.rule === 'DOC-10' && a.level === 'error')).toBe(true)

    const archived = bySlug('archived-published')
    expect(archived.some((a) => a.rule === 'DOC-12' && a.level === 'warn')).toBe(true)
    expect(archived.some((a) => a.rule === 'DOC-12' && a.level === 'error')).toBe(false)

    const series = bySlug('series-episode')
    expect(series.some((a) => a.rule === 'DOC-04' && a.level === 'info')).toBe(true)
    expect(series.some((a) => a.rule === 'DOC-04' && a.level === 'error')).toBe(false)

    const scheduledMissing = bySlug('scheduled-missing-media')
    expect(scheduledMissing.some((a) => a.rule === 'DOC-12' && a.level === 'warn')).toBe(true)
    expect(scheduledMissing.some((a) => a.rule === 'DOC-12' && a.level === 'error')).toBe(false)
  })

  it('不传 backlogTopics 时 series-episode 的 DOC-04 退回 error（豁免关闭时的保底行为)', () => {
    const snap = buildSnapshot(DOCTOR_FIXTURE_ROOT)
    const alerts = runDoctor(DOCTOR_FIXTURE_ROOT, snap.contents)
    const series = alerts.filter((a) => a.subject === 'series-episode')
    expect(series.some((a) => a.rule === 'DOC-04' && a.level === 'error')).toBe(true)
  })
})
