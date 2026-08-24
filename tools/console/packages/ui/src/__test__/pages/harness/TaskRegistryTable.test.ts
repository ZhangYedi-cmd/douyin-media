import { describe, expect, it } from 'vitest'
import { harnessRunSummaryLines, runButtonState } from '../../../pages/harness/TaskRegistryTable'
import type { HarnessTaskRow } from '@console/server/api-types'

// TaskRegistryTable.tsx 的「运行」列纯逻辑（本包无 jsdom，见 lib/api.test.ts 顶部说明）：直接从
// 源文件（.tsx）导入这两个纯函数——已实测过 node 环境下 import 一个引入 antd 的 .tsx 模块、
// 只取纯函数不渲染 JSX 不会报错，不必为此另建 harnessHelpers.ts 之外的文件（白名单只列了
// TaskRegistryTable.tsx / index.tsx 两个文件，见任务卡铁律 1）。

function task(overrides: Partial<HarnessTaskRow>): HarnessTaskRow {
  return { name: 'x', skill: 'x', enabled: true, trigger: 'periodic:7d', lastRun: null, overdue: false, ...overrides }
}

describe('runButtonState', () => {
  it('check 任务（无 skill）：禁用，提示体检由看板持续进行', () => {
    expect(runButtonState(task({ name: 'check', skill: null, enabled: true }))).toEqual({
      enabled: false,
      tooltip: '体检由看板持续进行，无需手动运行',
    })
  })

  it('有 skill 且 enabled：可点', () => {
    expect(runButtonState(task({ name: 'retro', skill: 'douyin-retro', enabled: true }))).toEqual({ enabled: true })
  })

  it('无 skill 的 TODO 任务（非 check）：禁用，提示尚未接入执行技能', () => {
    expect(runButtonState(task({ name: 'link-rot-checker', skill: null, enabled: false }))).toEqual({
      enabled: false,
      tooltip: '尚未接入执行技能',
    })
  })

  it('harness/tasks.md 当前注册表全量核对：5 个可点（retro/benchmark-refresher/ideate/backlog-gardener/account-audit），6 个禁用', () => {
    const rows: HarnessTaskRow[] = [
      task({ name: 'retro', skill: 'douyin-retro', enabled: true }),
      task({ name: 'benchmark-refresher', skill: 'benchmark-refresher', enabled: true }),
      task({ name: 'ideate', skill: 'douyin-ideate', enabled: true }),
      task({ name: 'backlog-gardener', skill: 'backlog-gardener', enabled: true }),
      task({ name: 'check', skill: null, enabled: true }),
      task({ name: 'retro-debt-collector', skill: null, enabled: false }),
      task({ name: 'link-rot-checker', skill: null, enabled: false }),
      task({ name: 'sop-doc-sync', skill: null, enabled: false }),
      task({ name: 'stale-fact-auditor', skill: null, enabled: false }),
      task({ name: 'cover-style-normalizer', skill: null, enabled: false }),
      task({ name: 'account-audit', skill: 'account-audit', enabled: true }),
    ]
    const states = rows.map(runButtonState)
    expect(states.filter((s) => s.enabled)).toHaveLength(5)
    expect(states.filter((s) => !s.enabled)).toHaveLength(6)
  })
})

describe('harnessRunSummaryLines', () => {
  it('普通任务（retro）：只有通用规则，无例外提示', () => {
    const { base, exception } = harnessRunSummaryLines(task({ name: 'retro', skill: 'douyin-retro' }))
    expect(base).toContain('后台 Claude Code 进程')
    expect(base).toContain('只产报告')
    expect(base).toContain('人审通过后才会应用到 brain/')
    expect(exception).toBeNull()
  })

  it('ideate：追加直接写 backlog.yaml 的既定例外提示', () => {
    const { exception } = harnessRunSummaryLines(task({ name: 'ideate', skill: 'douyin-ideate' }))
    expect(exception).toContain('content/_backlog/backlog.yaml')
    expect(exception).toContain('既定例外')
  })

  it('backlog-gardener：同样追加例外提示', () => {
    const { exception } = harnessRunSummaryLines(task({ name: 'backlog-gardener', skill: 'backlog-gardener' }))
    expect(exception).toContain('content/_backlog/backlog.yaml')
  })

  it('benchmark-refresher / account-audit：不属于例外，不出现该提示', () => {
    expect(harnessRunSummaryLines(task({ name: 'benchmark-refresher', skill: 'benchmark-refresher' })).exception).toBeNull()
    expect(harnessRunSummaryLines(task({ name: 'account-audit', skill: 'account-audit' })).exception).toBeNull()
  })
})
