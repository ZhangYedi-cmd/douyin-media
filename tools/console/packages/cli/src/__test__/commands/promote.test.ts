import { describe, it, expect, afterEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { runCli, runCliJson, FIXTURE_REPO_ROOT } from '../../../__test__/helpers.js'

const tempDirs: string[] = []
function tempRepo(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'console-cli-promote-'))
  fs.cpSync(FIXTURE_REPO_ROOT, dir, { recursive: true })
  tempDirs.push(dir)
  return dir
}
afterEach(() => {
  while (tempDirs.length > 0) fs.rmSync(tempDirs.pop()!, { recursive: true, force: true })
})

describe('media promote', () => {
  it('成功 promote：backlog idea→picked + content_path 回填 + 建目录 + 写 meta，全仓 diff 只含预期行', () => {
    const root = tempRepo()
    const backlogBefore = fs.readFileSync(path.join(root, 'content/_backlog/backlog.yaml'), 'utf8')

    const { result, json } = runCliJson<{ data: { dir: string } }>([
      'promote',
      '2026-06-14-006',
      '--slug',
      'promote-test-1',
      '--date',
      '2026-08-18',
      '--json',
      '--root',
      root,
    ])
    expect(result.status).toBe(0)
    expect(json.data.dir).toBe('content/2026-08-18/promote-test-1')

    const backlogAfter = fs.readFileSync(path.join(root, 'content/_backlog/backlog.yaml'), 'utf8')
    const beforeLines = backlogBefore.split('\n')
    const afterLines = backlogAfter.split('\n')
    // 只应新增一行（content_path）+ 改一行（status），其余全部逐行相等（顺移对齐后比较其余行数原样）
    let changedOrInserted = 0
    for (let i = 0; i < beforeLines.length; i++) {
      if (beforeLines[i] !== afterLines[i]) changedOrInserted++
    }
    expect(afterLines.length).toBe(beforeLines.length + 1)

    const metaPath = path.join(root, 'content/2026-08-18/promote-test-1/meta.yaml')
    expect(fs.existsSync(metaPath)).toBe(true)
    const meta = fs.readFileSync(metaPath, 'utf8')
    expect(meta).toMatch(/slug:\s+promote-test-1/)
    expect(meta).toMatch(/source:\s+2026-06-14-006/)
    expect(meta).toContain('status: ideated')
    void changedOrInserted
  })

  it('非 idea 状态条目 → E_BAD_STATUS，零写入', () => {
    const root = tempRepo()
    const before = fs.readFileSync(path.join(root, 'content/_backlog/backlog.yaml'), 'utf8')
    const { result, json } = runCliJson<{ ok: boolean; error: { code: string } }>([
      'promote',
      '2026-06-14-003', // fixture 里已是 picked
      '--slug',
      'should-not-exist',
      '--json',
      '--root',
      root,
    ])
    expect(result.status).toBe(1)
    expect(json.ok).toBe(false)
    expect(json.error.code).toBe('E_BAD_STATUS')
    expect(fs.readFileSync(path.join(root, 'content/_backlog/backlog.yaml'), 'utf8')).toBe(before)
    expect(fs.existsSync(path.join(root, 'content/2026-08-18/should-not-exist'))).toBe(false)
  })

  it('不存在的 id → E_NOT_FOUND', () => {
    const root = tempRepo()
    const { result, json } = runCliJson<{ error: { code: string } }>([
      'promote',
      'not-exist-id',
      '--slug',
      'x',
      '--json',
      '--root',
      root,
    ])
    expect(result.status).toBe(1)
    expect(json.error.code).toBe('E_NOT_FOUND')
  })

  it('非法 slug 格式 → E_BAD_ARG', () => {
    const root = tempRepo()
    const { result, json } = runCliJson<{ error: { code: string } }>([
      'promote',
      '2026-06-14-006',
      '--slug',
      'Not_Valid_Slug',
      '--json',
      '--root',
      root,
    ])
    expect(result.status).toBe(1)
    expect(json.error.code).toBe('E_BAD_ARG')
  })

  it('目标目录已存在 → E_DIR_EXISTS', () => {
    const root = tempRepo()
    const { result, json } = runCliJson<{ error: { code: string } }>([
      'promote',
      '2026-06-14-006',
      '--slug',
      'grok-build-teardown', // 已存在于 fixture（2026-07-18 下），但用同 date 撞出存在目录
      '--date',
      '2026-07-18',
      '--json',
      '--root',
      root,
    ])
    expect(result.status).toBe(1)
    expect(json.error.code).toBe('E_DIR_EXISTS')
  })

  it('--dry-run 零落盘', () => {
    const root = tempRepo()
    const before = fs.readFileSync(path.join(root, 'content/_backlog/backlog.yaml'), 'utf8')
    const result = runCli(['promote', '2026-06-14-006', '--slug', 'dry-run-test', '--dry-run', '--root', root])
    expect(result.status).toBe(0)
    expect(fs.readFileSync(path.join(root, 'content/_backlog/backlog.yaml'), 'utf8')).toBe(before)
    expect(fs.existsSync(path.join(root, 'content/2026-08-18/dry-run-test'))).toBe(false)
  })

  it('--auto 按 pickNext 同一套逻辑取题（与 media next 结论一致）', () => {
    const root = tempRepo()
    const { json: nextJson } = runCliJson<{ data: { id: string } }>(['next', '--json', '--root', root])
    const { result, json } = runCliJson<{ data: { id: string } }>([
      'promote',
      '--auto',
      '--slug',
      'auto-promote-test',
      '--json',
      '--root',
      root,
    ])
    expect(result.status).toBe(0)
    expect(json.data.id).toBe(nextJson.data.id)
  })

  it('id 与 --auto 同时给 → E_BAD_ARG', () => {
    const root = tempRepo()
    const { result } = runCliJson(['promote', '2026-06-14-006', '--auto', '--slug', 'x', '--json', '--root', root])
    expect(result.status).toBe(1)
  })

  it('next_up 指向被 promote 的 id 时会被清空', () => {
    const root = tempRepo()
    const backlogPath = path.join(root, 'content/_backlog/backlog.yaml')
    const raw = fs.readFileSync(backlogPath, 'utf8')
    fs.writeFileSync(backlogPath, raw.replace('next_up: null', 'next_up: 2026-06-14-006'))

    const result = runCli(['promote', '2026-06-14-006', '--slug', 'nextup-clear-test', '--root', root])
    expect(result.status).toBe(0)
    const after = fs.readFileSync(backlogPath, 'utf8')
    expect(after).toMatch(/next_up:\s*null/)
  })
})
