import { describe, it, expect, afterEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { runCli, runCliJson, FIXTURE_REPO_ROOT } from '../../../__test__/helpers.js'

const tempDirs: string[] = []
function tempRepo(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'console-cli-backlog-apply-'))
  fs.cpSync(FIXTURE_REPO_ROOT, dir, { recursive: true })
  const proposalDir = path.join(dir, 'harness/logs')
  fs.mkdirSync(proposalDir, { recursive: true })
  fs.writeFileSync(path.join(proposalDir, '2026-08-18-fake-proposal.md'), '# fake gardener proposal\n')
  tempDirs.push(dir)
  return dir
}
afterEach(() => {
  while (tempDirs.length > 0) fs.rmSync(tempDirs.pop()!, { recursive: true, force: true })
})

const PROPOSAL = 'harness/logs/2026-08-18-fake-proposal.md'

describe('media backlog apply', () => {
  it('archive：status idea→archived + 留痕注释，diff 只含这一行', () => {
    const root = tempRepo()
    const backlogPath = path.join(root, 'content/_backlog/backlog.yaml')
    const before = fs.readFileSync(backlogPath, 'utf8')

    const { result, json } = runCliJson<{ data: { id: string; action: string; into: string | null; absorbed: unknown } }>([
      'backlog',
      'apply',
      '2026-06-14-008',
      '--action',
      'archive',
      '--proposal',
      PROPOSAL,
      '--json',
      '--root',
      root,
    ])
    expect(result.status).toBe(0)
    expect(json.data.action).toBe('archive')
    expect(json.data.into).toBeNull()
    expect(json.data.absorbed).toBeNull()

    const after = fs.readFileSync(backlogPath, 'utf8')
    const beforeLines = before.split('\n')
    const afterLines = after.split('\n')
    expect(afterLines.length).toBe(beforeLines.length)
    let changed = 0
    for (let i = 0; i < beforeLines.length; i++) if (beforeLines[i] !== afterLines[i]) changed++
    expect(changed).toBe(1)
    expect(after).toContain(`archive(人审通过): 提议 ${PROPOSAL}`)
  })

  it('merge：被并条目 archived + 目标条目去重吸收 links/alt_titles，其余字段不动', () => {
    const root = tempRepo()
    const backlogPath = path.join(root, 'content/_backlog/backlog.yaml')

    const { result, json } = runCliJson<{ data: { absorbed: { links: number; alt_titles: number } } }>([
      'backlog',
      'apply',
      '2026-06-14-007',
      '--action',
      'merge',
      '--into',
      '2026-06-14-006',
      '--proposal',
      PROPOSAL,
      '--json',
      '--root',
      root,
    ])
    expect(result.status).toBe(0)
    expect(json.data.absorbed).toEqual({ links: 1, alt_titles: 1 })

    const after = fs.readFileSync(backlogPath, 'utf8')
    expect(after).toContain('merge 并入 2026-06-14-006')
    // 目标条目吸收了被并条目的 link/alt_title 原文
    expect(after).toContain('MCP 是传输与发现契约：function calling 和它差在哪')
    expect(after).toContain('https://x.com/search?q=MCP%20server%20protocol')
  })

  it('merge 目标条目缺 alt_titles 整字段（真实系列题历史数据）：插入新块而非破坏 YAML', () => {
    const root = tempRepo()
    const backlogPath = path.join(root, 'content/_backlog/backlog.yaml')

    const { result } = runCliJson(['backlog', 'apply', '2026-06-14-010', '--action', 'merge', '--into', '2026-06-10-001', '--proposal', PROPOSAL, '--json', '--root', root])
    expect(result.status).toBe(0)

    const after = fs.readFileSync(backlogPath, 'utf8')
    // 产出必须仍是合法 YAML，且新字段的值原样可见
    expect(after).toContain('Nemotron 3 Ultra 架构拆解')
    expect(after).toContain('https://huggingface.co/nvidia/Nemotron-3-Ultra')
    // YAML 合法性验证：借道任何一条真实读命令重新解析全量 backlog，解析炸了会以 E_PARSE(exit 4) 现形
    const { result: lsResult, json: lsJson } = runCliJson<{ data: { count: Record<string, number> } }>([
      'backlog',
      'ls',
      '--status',
      'idea',
      'picked',
      'published',
      'expired',
      'rejected',
      'archived',
      '--json',
      '--root',
      root,
    ])
    expect(lsResult.status).toBe(0)
    const total = Object.values(lsJson.data.count).reduce((a, b) => a + b, 0)
    expect(total).toBe(55)
  })

  it('非 idea 状态 → E_BAD_STATUS，零写入', () => {
    const root = tempRepo()
    const before = fs.readFileSync(path.join(root, 'content/_backlog/backlog.yaml'), 'utf8')
    const { result, json } = runCliJson<{ error: { code: string } }>([
      'backlog',
      'apply',
      '2026-06-14-003', // fixture 里已是 picked
      '--action',
      'archive',
      '--proposal',
      PROPOSAL,
      '--json',
      '--root',
      root,
    ])
    expect(result.status).toBe(1)
    expect(json.error.code).toBe('E_BAD_STATUS')
    expect(fs.readFileSync(path.join(root, 'content/_backlog/backlog.yaml'), 'utf8')).toBe(before)
  })

  it('proposal 路径不存在 → E_NOT_FOUND', () => {
    const root = tempRepo()
    const { result, json } = runCliJson<{ error: { code: string } }>([
      'backlog',
      'apply',
      '2026-06-14-008',
      '--action',
      'archive',
      '--proposal',
      'harness/logs/does-not-exist.md',
      '--json',
      '--root',
      root,
    ])
    expect(result.status).toBe(1)
    expect(json.error.code).toBe('E_NOT_FOUND')
  })

  it('merge 缺 --into → E_BAD_ARG', () => {
    const root = tempRepo()
    const { result, json } = runCliJson<{ error: { code: string } }>([
      'backlog',
      'apply',
      '2026-06-14-007',
      '--action',
      'merge',
      '--proposal',
      PROPOSAL,
      '--json',
      '--root',
      root,
    ])
    expect(result.status).toBe(1)
    expect(json.error.code).toBe('E_BAD_ARG')
  })

  it('--into 等于自身 → E_BAD_ARG', () => {
    const root = tempRepo()
    const { result, json } = runCliJson<{ error: { code: string } }>([
      'backlog',
      'apply',
      '2026-06-14-007',
      '--action',
      'merge',
      '--into',
      '2026-06-14-007',
      '--proposal',
      PROPOSAL,
      '--json',
      '--root',
      root,
    ])
    expect(result.status).toBe(1)
    expect(json.error.code).toBe('E_BAD_ARG')
  })

  it('--into 指向 expired 条目 → E_BAD_STATUS（不能并入已过期/归档条目）', () => {
    const root = tempRepo()
    const { result, json } = runCliJson<{ error: { code: string } }>([
      'backlog',
      'apply',
      '2026-06-14-007',
      '--action',
      'merge',
      '--into',
      '2026-06-14-001', // fixture 里已是 expired
      '--proposal',
      PROPOSAL,
      '--json',
      '--root',
      root,
    ])
    expect(result.status).toBe(1)
    expect(json.error.code).toBe('E_BAD_STATUS')
  })

  it('id 不存在 → E_NOT_FOUND', () => {
    const root = tempRepo()
    const { result, json } = runCliJson<{ error: { code: string } }>([
      'backlog',
      'apply',
      'not-exist-id',
      '--action',
      'archive',
      '--proposal',
      PROPOSAL,
      '--json',
      '--root',
      root,
    ])
    expect(result.status).toBe(1)
    expect(json.error.code).toBe('E_NOT_FOUND')
  })

  it('--dry-run 零落盘', () => {
    const root = tempRepo()
    const before = fs.readFileSync(path.join(root, 'content/_backlog/backlog.yaml'), 'utf8')
    const result = runCli(['backlog', 'apply', '2026-06-14-008', '--action', 'archive', '--proposal', PROPOSAL, '--dry-run', '--root', root])
    expect(result.status).toBe(0)
    expect(fs.readFileSync(path.join(root, 'content/_backlog/backlog.yaml'), 'utf8')).toBe(before)
  })
})
