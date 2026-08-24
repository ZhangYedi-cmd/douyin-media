import { describe, it, expect } from 'vitest'
import { runCliJson, FIXTURE_REPO_ROOT } from '../../../__test__/helpers.js'

interface Alert {
  rule: string
  level: string
  subject: string
}

describe('media check（fixture 仓，三个历史事故回归）', () => {
  it('命中 CHK-03（EP04 + open-weight-5 scheduled 超时）与 CHK-05（grok published 无链接），exit 1', () => {
    const { result, json } = runCliJson<{ data: { errors: number; warns: number; alerts: Alert[] } }>([
      'check',
      '--json',
      '--root',
      FIXTURE_REPO_ROOT,
    ])
    expect(result.status).toBe(1)
    expect(json.data.errors).toBeGreaterThan(0)

    const chk03Subjects = json.data.alerts.filter((a) => a.rule === 'CHK-03').map((a) => a.subject)
    expect(chk03Subjects).toContain('ep04-esc-abort-chain')
    expect(chk03Subjects).toContain('open-weight-5')

    const chk05Subjects = json.data.alerts.filter((a) => a.rule === 'CHK-05').map((a) => a.subject)
    expect(chk05Subjects).toContain('grok-build-teardown')
  })
})
