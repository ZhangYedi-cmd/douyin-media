import { describe, expect, it } from 'vitest'
import { deriveHarnessTasks, parseTasksRegistry } from '../../derive/tasksRegistry.js'
import type { HarnessRun } from '@console/core'

const RAW = `# 治理任务注册表

\`\`\`yaml
tasks:
  - task: retro
    skill: douyin-retro
    enabled: true
    trigger: post-publish-window
    windows: [24h, 72h, 7d]

  - task: ideate
    skill: douyin-ideate
    enabled: true
    trigger: periodic:2d

  - task: disabled-task
    enabled: false
    trigger: periodic:1d
\`\`\`
`

describe('parseTasksRegistry', () => {
  it('解析 ```yaml 围栏块里的 tasks 数组', () => {
    const defs = parseTasksRegistry(RAW)
    expect(defs.map((d) => d.task)).toEqual(['retro', 'ideate', 'disabled-task'])
  })

  it('无 yaml 围栏块时返回空表，不抛异常', () => {
    expect(parseTasksRegistry('# 无内容')).toEqual([])
  })

  it('围栏块内容非法 YAML 时返回空表，不抛异常', () => {
    expect(parseTasksRegistry('```yaml\n: : :\n```')).toEqual([])
  })
})

describe('deriveHarnessTasks：lastRun/overdue 口径', () => {
  const now = new Date('2030-01-10T12:00:00Z')
  const harness: HarnessRun[] = [
    { ts: '2030-01-09T09:00:00', task: 'retro', result: 'report' },
    { ts: '2030-01-08T09:00:00', task: 'ideate', result: 'report' },
  ]

  it('periodic:2d 且距上次运行 >=2 天 → overdue true', () => {
    const rows = deriveHarnessTasks(RAW, harness, now)
    const ideate = rows.find((r) => r.name === 'ideate')!
    expect(ideate.lastRun).toBe('2030-01-08T09:00:00')
    expect(ideate.overdue).toBe(true)
  })

  it('post-publish-window 触发器恒不算 overdue（已知简化）', () => {
    const rows = deriveHarnessTasks(RAW, harness, now)
    const retro = rows.find((r) => r.name === 'retro')!
    expect(retro.overdue).toBe(false)
  })

  it('从未运行过的 periodic 任务 overdue true', () => {
    const rows = deriveHarnessTasks(RAW, [], now)
    const ideate = rows.find((r) => r.name === 'ideate')!
    expect(ideate.lastRun).toBeNull()
    expect(ideate.overdue).toBe(true)
  })

  it('disabled 任务恒不 overdue', () => {
    const rows = deriveHarnessTasks(RAW, [], now)
    const disabled = rows.find((r) => r.name === 'disabled-task')!
    expect(disabled.overdue).toBe(false)
  })
})
