import { describe, it, expect } from 'vitest'
import { isMarkdownPath } from '../../../components/FileDrawer/isMarkdownPath'

// 04-P0：FileDrawer 只有 markdown 文件才走 MarkdownView 预览，其余仍走等宽源码——
// 覆盖 .md/.markdown/.yaml/.json/.log/无扩展名，见任务卡「单测」要求。
describe('isMarkdownPath', () => {
  it('.md → true', () => {
    expect(isMarkdownPath('content/2026-08-18-x/2-script.md')).toBe(true)
  })

  it('.markdown → true', () => {
    expect(isMarkdownPath('docs/notes/README.markdown')).toBe(true)
  })

  it('大小写不敏感：.MD → true', () => {
    expect(isMarkdownPath('README.MD')).toBe(true)
  })

  it('.yaml → false', () => {
    expect(isMarkdownPath('content/2026-08-18-x/meta.yaml')).toBe(false)
  })

  it('.json → false', () => {
    expect(isMarkdownPath('harness/logs/index.json')).toBe(false)
  })

  it('.log → false', () => {
    expect(isMarkdownPath('pipeline/logs/2026-08-18.log')).toBe(false)
  })

  it('.jsonl → false', () => {
    expect(isMarkdownPath('harness/logs/index.jsonl')).toBe(false)
  })

  it('无扩展名 → false', () => {
    expect(isMarkdownPath('pipeline/tasks')).toBe(false)
  })

  it('目录名带点、文件名无扩展名 → false', () => {
    expect(isMarkdownPath('content/2026-08-18-x/tasks')).toBe(false)
  })

  it('隐藏文件（点号在开头）→ false', () => {
    expect(isMarkdownPath('.gitignore')).toBe(false)
  })
})
