import { describe, it, expect, afterEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { runCli, runCliJson, FIXTURE_REPO_ROOT } from '../../../__test__/helpers.js'

const tempDirs: string[] = []
function tempRepo(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'console-cli-nextup-'))
  fs.cpSync(FIXTURE_REPO_ROOT, dir, { recursive: true })
  tempDirs.push(dir)
  return dir
}
afterEach(() => {
  while (tempDirs.length > 0) fs.rmSync(tempDirs.pop()!, { recursive: true, force: true })
})

describe('media next-up', () => {
  it('set 一个 idea 条目成功，写入裸 id（非引号字符串）', () => {
    const root = tempRepo()
    const result = runCli(['next-up', 'set', '2026-06-14-006', '--root', root])
    expect(result.status).toBe(0)
    const backlog = fs.readFileSync(path.join(root, 'content/_backlog/backlog.yaml'), 'utf8')
    expect(backlog).toMatch(/^next_up: 2026-06-14-006$/m)
  })

  it('set 一个非 idea 条目 → E_BAD_STATUS', () => {
    const root = tempRepo()
    const { result, json } = runCliJson<{ error: { code: string } }>([
      'next-up',
      'set',
      '2026-06-14-003', // fixture 里是 picked
      '--json',
      '--root',
      root,
    ])
    expect(result.status).toBe(1)
    expect(json.error.code).toBe('E_BAD_STATUS')
  })

  it('set 不存在的 id → E_NOT_FOUND', () => {
    const root = tempRepo()
    const { result, json } = runCliJson<{ error: { code: string } }>([
      'next-up',
      'set',
      'not-exist-id',
      '--json',
      '--root',
      root,
    ])
    expect(result.status).toBe(1)
    expect(json.error.code).toBe('E_NOT_FOUND')
  })

  it('clear 写回裸 null 关键字（不是空字符串），且对已空指针幂等成功', () => {
    const root = tempRepo()
    const r1 = runCli(['next-up', 'clear', '--root', root])
    expect(r1.status).toBe(0)
    const backlog1 = fs.readFileSync(path.join(root, 'content/_backlog/backlog.yaml'), 'utf8')
    expect(backlog1).toMatch(/^next_up: null$/m)

    const r2 = runCli(['next-up', 'clear', '--root', root]) // 再来一次，幂等
    expect(r2.status).toBe(0)
  })

  it('set 后 clear，往返一致', () => {
    const root = tempRepo()
    runCli(['next-up', 'set', '2026-06-14-006', '--root', root])
    const { result, json } = runCliJson<{ data: { prev: string | null } }>([
      'next-up',
      'clear',
      '--json',
      '--root',
      root,
    ])
    expect(result.status).toBe(0)
    expect(json.data.prev).toBe('2026-06-14-006')
    const backlog = fs.readFileSync(path.join(root, 'content/_backlog/backlog.yaml'), 'utf8')
    expect(backlog).toMatch(/^next_up: null$/m)
  })

  it('--dry-run 零落盘', () => {
    const root = tempRepo()
    const before = fs.readFileSync(path.join(root, 'content/_backlog/backlog.yaml'), 'utf8')
    const result = runCli(['next-up', 'set', '2026-06-14-006', '--dry-run', '--root', root])
    expect(result.status).toBe(0)
    expect(fs.readFileSync(path.join(root, 'content/_backlog/backlog.yaml'), 'utf8')).toBe(before)
  })
})
