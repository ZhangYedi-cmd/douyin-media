import { describe, expect, it } from 'vitest'
import { isCancellable, isTerminal, jobTitleSuffix } from '../../../components/JobPanel/JobCard'

// JobCard.tsx 标题后缀纯函数单测（本包无 jsdom，见 lib/api.test.ts 顶部说明）：直接从源文件
// （.tsx）导入，只取纯函数、不渲染 JSX——已实测 node 环境下可行（白名单只列了本文件，不新建
// components/JobPanel 下的其它文件）。

describe('jobTitleSuffix', () => {
  it('有 slug（publish/rework/create）：用 slug', () => {
    expect(jobTitleSuffix({ slug: 'ep19', report: undefined, task: undefined })).toBe(' · ep19')
  })

  it('无 slug 有 report（apply-proposal）：用 report', () => {
    expect(jobTitleSuffix({ slug: undefined, report: '2026-08-19-retro.md', task: undefined })).toBe(' · 2026-08-19-retro.md')
  })

  it('无 slug 无 report 有 task（harness-run）：用 task', () => {
    expect(jobTitleSuffix({ slug: undefined, report: undefined, task: 'ideate' })).toBe(' · ideate')
  })

  it('三者都没有：空字符串（不加后缀）', () => {
    expect(jobTitleSuffix({ slug: undefined, report: undefined, task: undefined })).toBe('')
  })

  it('优先级 slug > report > task：都有时只取 slug', () => {
    expect(jobTitleSuffix({ slug: 'ep19', report: 'r.md', task: 'ideate' })).toBe(' · ep19')
  })
})

// 2026-08-19 增补（看板「取消任务」能力，J 号执行）：isTerminal/isCancellable 是「取消按钮该不该
// 出现」「历史区该不该显示裁定/成本」的实际业务判定，单独锁定，避免以后加新 JobState 时漏改。
describe('isTerminal', () => {
  it('succeeded/failed/cancelled 均为终结态', () => {
    expect(isTerminal('succeeded')).toBe(true)
    expect(isTerminal('failed')).toBe(true)
    expect(isTerminal('cancelled')).toBe(true)
  })

  it('queued/running/verifying 均非终结态', () => {
    expect(isTerminal('queued')).toBe(false)
    expect(isTerminal('running')).toBe(false)
    expect(isTerminal('verifying')).toBe(false)
  })
})

describe('isCancellable', () => {
  it('queued/running/verifying 可取消', () => {
    expect(isCancellable('queued')).toBe(true)
    expect(isCancellable('running')).toBe(true)
    expect(isCancellable('verifying')).toBe(true)
  })

  it('succeeded/failed/cancelled 已终结，不可再取消（与 server 端 precheck 一致）', () => {
    expect(isCancellable('succeeded')).toBe(false)
    expect(isCancellable('failed')).toBe(false)
    expect(isCancellable('cancelled')).toBe(false)
  })
})
