import { describe, it, expect, afterEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { runCli, runCliJson, FIXTURE_REPO_ROOT } from '../../../__test__/helpers.js'

const tempDirs: string[] = []
function tempRepo(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'console-cli-backlog-sweep-'))
  fs.cpSync(FIXTURE_REPO_ROOT, dir, { recursive: true })
  tempDirs.push(dir)
  return dir
}
afterEach(() => {
  while (tempDirs.length > 0) fs.rmSync(tempDirs.pop()!, { recursive: true, force: true })
})

interface SweepData {
  dryRun: boolean
  expired: { id: string; title: string; rule: string; created: string }[]
  count: number
}

describe('media backlog sweep', () => {
  it('无 flag 缺省 dry-run：命中列表非空但零落盘', () => {
    const root = tempRepo()
    const backlogPath = path.join(root, 'content/_backlog/backlog.yaml')
    const before = fs.readFileSync(backlogPath, 'utf8')

    const { result, json } = runCliJson<{ data: SweepData }>(['backlog', 'sweep', '--json', '--root', root])
    expect(result.status).toBe(0)
    expect(json.data.dryRun).toBe(true)
    expect(json.data.count).toBeGreaterThan(0)
    // 命中的历史标杆样例（拍板 §2.9 JSON 示例同一条）：timeliness4>7d 规则命中
    expect(json.data.expired.some((e) => e.id === '2026-07-13-004')).toBe(true)

    expect(fs.readFileSync(backlogPath, 'utf8')).toBe(before)
  })

  it('显式 --dry-run 与 --apply 命中同一份候选清单（决策一致，只是落盘与否不同）', () => {
    const root1 = tempRepo()
    const root2 = tempRepo()
    const { json: dryJson } = runCliJson<{ data: SweepData }>(['backlog', 'sweep', '--dry-run', '--json', '--root', root1])
    const { json: applyJson } = runCliJson<{ data: SweepData }>(['backlog', 'sweep', '--apply', '--json', '--root', root2])
    expect(dryJson.data.expired.map((e) => e.id).sort()).toEqual(applyJson.data.expired.map((e) => e.id).sort())
    expect(dryJson.data.dryRun).toBe(true)
    expect(applyJson.data.dryRun).toBe(false)
  })

  it('--apply 落盘：每条命中只改 status 一行 + 留痕注释，其余字节不动', () => {
    const root = tempRepo()
    const backlogPath = path.join(root, 'content/_backlog/backlog.yaml')
    const before = fs.readFileSync(backlogPath, 'utf8')

    const { result, json } = runCliJson<{ data: SweepData }>(['backlog', 'sweep', '--apply', '--json', '--root', root])
    expect(result.status).toBe(0)
    expect(json.data.dryRun).toBe(false)
    const hitCount = json.data.count
    expect(hitCount).toBeGreaterThan(0)

    const after = fs.readFileSync(backlogPath, 'utf8')
    const beforeLines = before.split('\n')
    const afterLines = after.split('\n')
    expect(afterLines.length).toBe(beforeLines.length) // 只改行不增删行
    let changed = 0
    for (let i = 0; i < beforeLines.length; i++) if (beforeLines[i] !== afterLines[i]) changed++
    expect(changed).toBe(hitCount)
    expect(after).toMatch(/status: expired # \d{4}-\d{2}-\d{2} 过期清扫\(机械规则\): timeliness4超7天/)

    // 命中条目状态确实翻了
    for (const e of json.data.expired) {
      const re = new RegExp(`id: ${e.id}[\\s\\S]*?status: expired`)
      expect(after).toMatch(re)
    }
  })

  it('无候选命中时输出 0 条、exit 0（不是错误）', () => {
    const root = tempRepo()
    // 先真实清扫一轮，清完当前 fixture 里全部机械命中的 idea 条目
    runCli(['backlog', 'sweep', '--apply', '--root', root])
    const backlogPath = path.join(root, 'content/_backlog/backlog.yaml')
    const before = fs.readFileSync(backlogPath, 'utf8')

    const { result, json } = runCliJson<{ data: SweepData }>(['backlog', 'sweep', '--apply', '--json', '--root', root])
    expect(result.status).toBe(0)
    expect(json.data.count).toBe(0)
    expect(fs.readFileSync(backlogPath, 'utf8')).toBe(before)
  })
})
