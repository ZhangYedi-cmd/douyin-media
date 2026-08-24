import { describe, it, expect, afterEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { runCli, runCliJson, FIXTURE_REPO_ROOT } from '../../../__test__/helpers.js'

const tempDirs: string[] = []
function tempRepo(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'console-cli-backlog-add-'))
  fs.cpSync(FIXTURE_REPO_ROOT, dir, { recursive: true })
  // 撞题去重是 30 天「区间」窗（相对墙钟）：fixture 里对照条目 2026-07-19-00x 的 created
  // 在 2026-08-19 起会滑出窗外，导致撞车断言跨天翻车（2026-08-19 零点实翻过一次）。
  // 刷新为「5 天前」保证永在窗内；条目 id 不变（窗口判定用 created 字段，与 id 无关）。
  const recent = new Date(Date.now() - 5 * 86_400_000).toISOString().slice(0, 10)
  const backlogPath = path.join(dir, 'content/_backlog/backlog.yaml')
  fs.writeFileSync(backlogPath, fs.readFileSync(backlogPath, 'utf8').replaceAll('created: 2026-07-19', `created: ${recent}`))
  tempDirs.push(dir)
  return dir
}
const tempFiles: string[] = []
function candidatesFile(content: string): string {
  const p = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'console-cli-candidates-')), 'candidates.yaml')
  fs.writeFileSync(p, content)
  tempFiles.push(p)
  return p
}
afterEach(() => {
  while (tempDirs.length > 0) fs.rmSync(tempDirs.pop()!, { recursive: true, force: true })
  while (tempFiles.length > 0) fs.rmSync(path.dirname(tempFiles.pop()!), { recursive: true, force: true })
})

const VALID_ONE = `
candidates:
  - title: "全新测试选题：一个完全不相关的话题"
    track: depth
    format: kouban
    score: 3.5
    tier: A
    scores: {practical: 3, social: 3, emotion: 3, hook: 3, timeliness: 3, trigger: 3}
    urgency: queue
    reason: "测试用途"
    links: ["https://example.com/unrelated-1"]
    tags: [unrelated-topic-x, unrelated-topic-y]
    created: 2026-08-18
`

describe('media backlog add', () => {
  it('非撞车候选正常入池：diff 只含追加行，自动编号 <created>-NNN', () => {
    const root = tempRepo()
    const backlogPath = path.join(root, 'content/_backlog/backlog.yaml')
    const before = fs.readFileSync(backlogPath, 'utf8')

    const { result, json } = runCliJson<{ data: { added: { id: string }[]; rejected: unknown[] } }>([
      'backlog',
      'add',
      candidatesFile(VALID_ONE),
      '--json',
      '--root',
      root,
    ])
    expect(result.status).toBe(0)
    expect(json.data.rejected).toEqual([])
    expect(json.data.added).toHaveLength(1)
    expect(json.data.added[0]!.id).toBe('2026-08-18-001')

    const after = fs.readFileSync(backlogPath, 'utf8')
    const beforeLines = before.split('\n')
    const afterLines = after.split('\n')
    // 纯追加：前 N 行逐一相等，新增内容只出现在文件末尾
    for (let i = 0; i < beforeLines.length - 1; i++) expect(afterLines[i]).toBe(beforeLines[i])
    expect(after).toContain('id: 2026-08-18-001')
    expect(after).toContain('title: "全新测试选题：一个完全不相关的话题"')
  })

  it('撞车条目（tags 交集≥2）默认拒收，非撞车条目照常入池；自动编号在同批次内续位', () => {
    const root = tempRepo()
    const file = candidatesFile(`
candidates:
  - title: "无关话题 A"
    track: depth
    format: kouban
    score: 3.5
    tier: A
    scores: {practical: 3, social: 3, emotion: 3, hook: 3, timeliness: 3, trigger: 3}
    urgency: queue
    reason: "r1"
    links: ["https://example.com/a"]
    tags: [unrelated-a, unrelated-b]
    created: 2026-08-18
  - title: "撞车候选：claude-code permission"
    track: depth
    format: kouban
    score: 3.9
    tier: A
    scores: {practical: 4, social: 4, emotion: 3, hook: 4, timeliness: 4, trigger: 4}
    urgency: queue
    reason: "r2"
    links: ["https://example.com/b"]
    tags: [claude-code, permission, unrelated-z]
    created: 2026-08-18
  - title: "无关话题 C"
    track: traffic
    format: tuwen
    score: 3.0
    tier: B
    scores: {practical: 3, social: 3, emotion: 3, hook: 3, timeliness: 3, trigger: 3}
    urgency: queue
    reason: "r3"
    links: ["https://example.com/c"]
    tags: [unrelated-c, unrelated-d]
    created: 2026-08-18
`)
    const { result, json } = runCliJson<{
      data: { added: { index: number; id: string }[]; rejected: { index: number; conflictWith: string; sharedTags: string[] }[] }
    }>(['backlog', 'add', file, '--json', '--root', root])
    expect(result.status).toBe(0)
    expect(json.data.rejected).toHaveLength(1)
    expect(json.data.rejected[0]!.index).toBe(2)
    expect(json.data.rejected[0]!.conflictWith).toBe('2026-07-19-001')
    expect(json.data.rejected[0]!.sharedTags.sort()).toEqual(['claude-code', 'permission'])
    expect(json.data.added).toHaveLength(2)
    expect(json.data.added.map((a) => a.id)).toEqual(['2026-08-18-001', '2026-08-18-002'])
  })

  it('--force 放行指定 1-based 序号的撞车候选', () => {
    const root = tempRepo()
    const file = candidatesFile(`
candidates:
  - title: "撞车但强制放行"
    track: depth
    format: kouban
    score: 3.9
    tier: A
    scores: {practical: 4, social: 4, emotion: 3, hook: 4, timeliness: 4, trigger: 4}
    urgency: queue
    reason: "r"
    links: ["https://example.com/forced"]
    tags: [claude-code, permission]
    created: 2026-08-18
`)
    const { result, json } = runCliJson<{ data: { added: unknown[]; rejected: unknown[] } }>([
      'backlog',
      'add',
      file,
      '--force',
      '1',
      '--json',
      '--root',
      root,
    ])
    expect(result.status).toBe(0)
    expect(json.data.rejected).toEqual([])
    expect(json.data.added).toHaveLength(1)
  })

  it('schema 不合格（缺 links）→ E_SCHEMA 整文件零写入', () => {
    const root = tempRepo()
    const backlogPath = path.join(root, 'content/_backlog/backlog.yaml')
    const before = fs.readFileSync(backlogPath, 'utf8')
    const file = candidatesFile(`
candidates:
  - title: "缺字段"
    track: depth
    format: kouban
    score: 3.5
    tier: A
    scores: {practical: 3, social: 3, emotion: 3, hook: 3, timeliness: 3, trigger: 3}
    urgency: queue
    reason: "r"
    tags: [x, y]
`)
    const { result, json } = runCliJson<{ error: { code: string } }>(['backlog', 'add', file, '--json', '--root', root])
    expect(result.status).toBe(1)
    expect(json.error.code).toBe('E_SCHEMA')
    expect(fs.readFileSync(backlogPath, 'utf8')).toBe(before)
  })

  it('候选文件不存在 → E_NOT_FOUND', () => {
    const root = tempRepo()
    const { result, json } = runCliJson<{ error: { code: string } }>([
      'backlog',
      'add',
      '/tmp/does-not-exist-candidates.yaml',
      '--json',
      '--root',
      root,
    ])
    expect(result.status).toBe(1)
    expect(json.error.code).toBe('E_NOT_FOUND')
  })

  it('--dry-run 零落盘', () => {
    const root = tempRepo()
    const backlogPath = path.join(root, 'content/_backlog/backlog.yaml')
    const before = fs.readFileSync(backlogPath, 'utf8')
    const result = runCli(['backlog', 'add', candidatesFile(VALID_ONE), '--dry-run', '--root', root])
    expect(result.status).toBe(0)
    expect(fs.readFileSync(backlogPath, 'utf8')).toBe(before)
  })

  it('全部候选撞车（无 --force）→ 零写入但仍 exit 0（拒收非错误）', () => {
    const root = tempRepo()
    const backlogPath = path.join(root, 'content/_backlog/backlog.yaml')
    const before = fs.readFileSync(backlogPath, 'utf8')
    const file = candidatesFile(`
candidates:
  - title: "全撞车"
    track: depth
    format: kouban
    score: 3.9
    tier: A
    scores: {practical: 4, social: 4, emotion: 3, hook: 4, timeliness: 4, trigger: 4}
    urgency: queue
    reason: "r"
    links: ["https://example.com/x"]
    tags: [claude-code, permission]
    created: 2026-08-18
`)
    const { result, json } = runCliJson<{ data: { added: unknown[]; rejected: unknown[] } }>(['backlog', 'add', file, '--json', '--root', root])
    expect(result.status).toBe(0)
    expect(json.data.added).toEqual([])
    expect(json.data.rejected).toHaveLength(1)
    expect(fs.readFileSync(backlogPath, 'utf8')).toBe(before)
  })
})
