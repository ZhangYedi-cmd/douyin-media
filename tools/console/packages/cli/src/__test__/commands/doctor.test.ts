import { describe, it, expect } from 'vitest'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { runCliJson, runCli } from '../../../__test__/helpers.js'

// doctor 有自己专属的 fixture 仓（core/__test__/fixtures/doctor-repo/），
// 不用 check.test.ts 复用的 core/__test__/fixtures/repo/——那份仓的 grok-build-teardown
// 4-publish.md 是空文件（专为 check 场景配的），拿来跑 doctor 会命中一堆非本命令测试目标的规则。
const here = path.dirname(fileURLToPath(import.meta.url))
const DOCTOR_FIXTURE_ROOT = path.resolve(here, '../../../../core/__test__/fixtures/doctor-repo')

interface Alert {
  rule: string
  level: string
  subject: string
}

describe('media doctor（命令级冒烟）', () => {
  it('--all：扫全部 fixture 条目，命中 DOC-04(info,系列豁免)/DOC-07/DOC-09/DOC-10/DOC-12，exit 1', () => {
    const { result, json } = runCliJson<{ data: { scanned: number; errors: number; warns: number; infos: number; alerts: Alert[] } }>([
      'doctor',
      '--all',
      '--json',
      '--root',
      DOCTOR_FIXTURE_ROOT,
    ])
    expect(result.status).toBe(1)
    expect(json.data.scanned).toBe(7)
    expect(json.data.errors).toBeGreaterThan(0)
    expect(json.data.infos).toBeGreaterThan(0)

    const rules = json.data.alerts.map((a) => a.rule)
    expect(rules).toContain('DOC-04')
    expect(rules).toContain('DOC-07')
    expect(rules).toContain('DOC-09')
    expect(rules).toContain('DOC-10')
    expect(rules).toContain('DOC-12')

    // series-episode 缺 1-brief.md 但走了系列豁免：DOC-04 命中 info 而非 error
    const seriesAlerts = json.data.alerts.filter((a) => a.subject === 'series-episode')
    expect(seriesAlerts.length).toBe(1)
    expect(seriesAlerts[0]!.rule).toBe('DOC-04')
    expect(seriesAlerts[0]!.level).toBe('info')

    // scheduled-missing-media：scheduled 状态下媒体缺失降级为 warn，不拉高 errors
    const scheduledAlerts = json.data.alerts.filter((a) => a.subject === 'scheduled-missing-media')
    expect(scheduledAlerts.length).toBe(1)
    expect(scheduledAlerts[0]!.rule).toBe('DOC-12')
    expect(scheduledAlerts[0]!.level).toBe('warn')
  })

  it('<slug> series-episode：只有系列豁免 info，errors=0，exit 0', () => {
    const { result, json } = runCliJson<{ data: { errors: number; warns: number; infos: number; alerts: Alert[] } }>([
      'doctor',
      'series-episode',
      '--json',
      '--root',
      DOCTOR_FIXTURE_ROOT,
    ])
    expect(result.status).toBe(0)
    expect(json.data.errors).toBe(0)
    expect(json.data.infos).toBe(1)
    expect(json.data.alerts[0]!.rule).toBe('DOC-04')
    expect(json.data.alerts[0]!.level).toBe('info')
  })

  it('<slug> scheduled-missing-media：仅 warn，errors=0，exit 0', () => {
    const { result, json } = runCliJson<{ data: { errors: number; warns: number; alerts: Alert[] } }>([
      'doctor',
      'scheduled-missing-media',
      '--json',
      '--root',
      DOCTOR_FIXTURE_ROOT,
    ])
    expect(result.status).toBe(0)
    expect(json.data.errors).toBe(0)
    expect(json.data.warns).toBe(1)
    expect(json.data.alerts[0]!.rule).toBe('DOC-12')
  })

  it('<slug>：单条体检全绿 → exit 0，alerts 为空', () => {
    const { result, json } = runCliJson<{ data: { errors: number; alerts: Alert[] } }>([
      'doctor',
      'legal-entry',
      '--json',
      '--root',
      DOCTOR_FIXTURE_ROOT,
    ])
    expect(result.status).toBe(0)
    expect(json.data.errors).toBe(0)
    expect(json.data.alerts).toEqual([])
  })

  it('<slug> 不存在 → E_NOT_FOUND', () => {
    const { result, json } = runCliJson<{ ok: false; error: { code: string } }>([
      'doctor',
      'ghost-slug',
      '--json',
      '--root',
      DOCTOR_FIXTURE_ROOT,
    ])
    expect(result.status).toBe(1)
    expect(json.error.code).toBe('E_NOT_FOUND')
  })

  it('既不给 slug 也不给 --all → E_BAD_ARG', () => {
    const { result, json } = runCliJson<{ ok: false; error: { code: string } }>(['doctor', '--json', '--root', DOCTOR_FIXTURE_ROOT])
    expect(result.status).toBe(1)
    expect(json.error.code).toBe('E_BAD_ARG')
  })

  it('人读格式：逐行 [LEVEL] slug RULE: message + 末行汇总', () => {
    const result = runCli(['doctor', 'bad-schedule', '--root', DOCTOR_FIXTURE_ROOT])
    expect(result.status).toBe(1)
    expect(result.stdout).toMatch(/\[ERROR\] bad-schedule DOC-10: /)
    expect(result.stdout).toMatch(/doctor 体检 1 条：\d+ error \/ \d+ warn \/ \d+ info/)
  })
})
