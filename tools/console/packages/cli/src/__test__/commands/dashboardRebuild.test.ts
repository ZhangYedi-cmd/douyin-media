import { describe, it, expect, afterEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { runCli, runCliJson, FIXTURE_REPO_ROOT } from '../../../__test__/helpers.js'

const tempDirs: string[] = []

function tempRepo(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'console-cli-dashboard-'))
  fs.cpSync(FIXTURE_REPO_ROOT, dir, { recursive: true })
  tempDirs.push(dir)
  return dir
}

afterEach(() => {
  while (tempDirs.length > 0) fs.rmSync(tempDirs.pop()!, { recursive: true, force: true })
})

describe('media dashboard rebuild', () => {
  it('--dry-run 不落盘，输出 diff', () => {
    const root = tempRepo()
    const before = fs.readFileSync(path.join(root, 'dashboard.md'), 'utf8')
    const { result } = runCliJson(['dashboard', 'rebuild', '--dry-run', '--json', '--root', root])
    expect(result.status).toBe(0)
    const after = fs.readFileSync(path.join(root, 'dashboard.md'), 'utf8')
    expect(after).toBe(before)
  })

  it('真实执行：写入三区，标记外内容不变；重跑一次是幂等的', () => {
    const root = tempRepo()
    const before = fs.readFileSync(path.join(root, 'dashboard.md'), 'utf8')

    const r1 = runCli(['dashboard', 'rebuild', '--root', root])
    expect(r1.status).toBe(0)
    const after1 = fs.readFileSync(path.join(root, 'dashboard.md'), 'utf8')
    expect(after1).not.toBe(before)
    expect(after1).toContain('## 待人确认 ⚠') // 人写区标题原样保留
    expect(after1).toContain('## 数据汇总（复盘线维护）')
    expect(after1).not.toContain('fixture 占位')

    const r2 = runCli(['dashboard', 'rebuild', '--root', root])
    expect(r2.status).toBe(0)
    const after2 = fs.readFileSync(path.join(root, 'dashboard.md'), 'utf8')
    expect(after2).toBe(after1) // 幂等
  })

  it('标记缺失的 dashboard.md → E_NO_MARKERS，exit 1，零落盘', () => {
    const root = tempRepo()
    fs.writeFileSync(path.join(root, 'dashboard.md'), '# no markers\n')
    const { result, json } = runCliJson<{ ok: boolean; error: { code: string } }>([
      'dashboard',
      'rebuild',
      '--json',
      '--root',
      root,
    ])
    expect(result.status).toBe(1)
    expect(json.ok).toBe(false)
    expect(json.error.code).toBe('E_NO_MARKERS')
    expect(fs.readFileSync(path.join(root, 'dashboard.md'), 'utf8')).toBe('# no markers\n')
  })
})
