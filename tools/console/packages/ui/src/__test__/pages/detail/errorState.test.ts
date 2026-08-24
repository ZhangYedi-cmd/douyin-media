import { describe, expect, it } from 'vitest'
import { describeDetailError } from '../../../pages/detail/errorState'
import { ApiError } from '../../../lib/api'

// C1（P0）修复单测：加载详情失败时的文案分类。真正的「整页接管」（错误态优先于 data/loading，
// 不渲染任何陈旧内容）是纯 JSX 渲染顺序，本包无 jsdom 不写组件测试（packages/ui/CLAUDE.md）——
// 这里只覆盖抽出来的纯函数：给定 ApiError + slug，应该给出哪条「说人话」的错误说明。
describe('describeDetailError', () => {
  it('404：说清是哪条内容 + backlog 有/content 无的常见原因 + 返回看板的下一步', () => {
    const err = new ApiError('内容条目不存在：2026-06-10-001', 404)
    const view = describeDetailError(err, '2026-06-10-001')
    expect(view.heading).toBe('内容条目不存在：2026-06-10-001')
    expect(view.reasons.join('')).toMatch(/backlog\.yaml/)
    expect(view.reasons.join('')).toMatch(/content\//)
    expect(view.nextSteps.join('')).toMatch(/返回生产看板/)
  })

  it('status 0（网络/连接失败）：提示 server 可能没启动，而不是把空白 message 抛给用户', () => {
    const err = new ApiError('Failed to fetch', 0)
    const view = describeDetailError(err, 'x')
    expect(view.heading).toBe('无法连接看板服务')
    expect(view.reasons.join('')).toMatch(/5170/)
  })

  it('401/403：提示带 token 重开链接，而不是让人对着一句 HTTP 状态码发呆', () => {
    const err = new ApiError('token 校验失败', 401)
    const view = describeDetailError(err, 'x')
    expect(view.heading).toBe('鉴权失败，无法读取该内容')
    expect(view.nextSteps.join('')).toMatch(/token/)
  })

  it('其余状态码（如 500）：兜底展示 HTTP 状态 + server 原话，不吞信息', () => {
    const err = new ApiError('media 内部错误', 500)
    const view = describeDetailError(err, 'x')
    expect(view.heading).toBe('加载详情失败（HTTP 500）')
    expect(view.reasons).toContain('media 内部错误')
  })
})
