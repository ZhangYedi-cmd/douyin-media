import { describe, it, expect, afterEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { runCli, runCliJson, FIXTURE_REPO_ROOT } from '../../../__test__/helpers.js'

const tempDirs: string[] = []
function tempRepo(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'console-cli-metrics-record-'))
  fs.cpSync(FIXTURE_REPO_ROOT, dir, { recursive: true })
  tempDirs.push(dir)
  return dir
}
afterEach(() => {
  while (tempDirs.length > 0) fs.rmSync(tempDirs.pop()!, { recursive: true, force: true })
})

/** 造一条指定 status 的最小 meta.yaml，供状态校验测试用（同 flip.test.ts 的 writeMeta 手法）。 */
function writeMeta(root: string, slug: string, status: string, source?: string): void {
  const dir = path.join(root, 'content/2026-08-01', slug)
  fs.mkdirSync(dir, { recursive: true })
  const lines = [
    `slug: ${slug}`,
    'title: "x"',
    'type: kouban',
    'pillar: depth',
    `status: ${status}`,
    `source: ${source ?? ''}`,
    'schedule:',
    'publish_url:',
    '',
    'timestamps:',
    '  ideated: 2026-08-01',
    '',
  ]
  fs.writeFileSync(path.join(dir, 'meta.yaml'), lines.join('\n'))
}

describe('media metrics record', () => {
  it('24h 窗口：只 append jsonl，不动 backlog', () => {
    const root = tempRepo()
    const backlogPath = path.join(root, 'content/_backlog/backlog.yaml')
    const before = fs.readFileSync(backlogPath, 'utf8')
    const jsonlPath = path.join(root, 'harness/logs/metrics.jsonl')
    expect(fs.existsSync(jsonlPath)).toBe(false)

    const { result, json } = runCliJson<{ data: { jsonlLine: number; backlogBackfilled: string | null } }>([
      'metrics',
      'record',
      'grok-build-teardown',
      '--window',
      '24h',
      '--json-data',
      '{"plays":5814,"completion_rate":"1.15%","audit":"公开正常分发"}',
      '--json',
      '--root',
      root,
    ])
    expect(result.status).toBe(0)
    expect(json.data.jsonlLine).toBe(1)
    expect(json.data.backlogBackfilled).toBeNull()
    expect(fs.readFileSync(backlogPath, 'utf8')).toBe(before)

    const line = JSON.parse(fs.readFileSync(jsonlPath, 'utf8').trim())
    expect(line.slug).toBe('grok-build-teardown')
    expect(line.window).toBe('24h')
    expect(line.data.plays).toBe(5814)
    expect(line.data.completion_rate).toBe('1.15%')
    expect(line.ts).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/)
  })

  it('7d 窗口：append jsonl 且回填 backlog metrics 字段（覆盖式，flow map 风格与仓库既有 scores 字段一致）', () => {
    const root = tempRepo()
    const backlogPath = path.join(root, 'content/_backlog/backlog.yaml')
    const before = fs.readFileSync(backlogPath, 'utf8')

    const { result, json } = runCliJson<{ data: { backlogBackfilled: string | null } }>([
      'metrics',
      'record',
      'grok-build-teardown',
      '--window',
      '7d',
      '--json-data',
      '{"plays":9000,"likes":71,"comments":2}',
      '--json',
      '--root',
      root,
    ])
    expect(result.status).toBe(0)
    expect(json.data.backlogBackfilled).toBe('2026-07-17-002')

    const after = fs.readFileSync(backlogPath, 'utf8')
    const beforeLines = before.split('\n')
    const afterLines = after.split('\n')
    expect(afterLines.length).toBe(beforeLines.length)
    let changed = 0
    for (let i = 0; i < beforeLines.length; i++) if (beforeLines[i] !== afterLines[i]) changed++
    expect(changed).toBe(1)
    expect(after).toContain('metrics: {plays: 9000, likes: 71, comments: 2}')
  })

  it('两次调用累加 jsonl 行号（多轮拉数天然多行快照）', () => {
    const root = tempRepo()
    runCli(['metrics', 'record', 'grok-build-teardown', '--window', '24h', '--json-data', '{"plays":1}', '--root', root])
    const { json } = runCliJson<{ data: { jsonlLine: number } }>([
      'metrics',
      'record',
      'grok-build-teardown',
      '--window',
      '72h',
      '--json-data',
      '{"plays":2}',
      '--json',
      '--root',
      root,
    ])
    expect(json.data.jsonlLine).toBe(2)
  })

  it('未发布状态（drafting）→ E_BAD_STATUS，零写入', () => {
    const root = tempRepo()
    writeMeta(root, 'metrics-drafting-test', 'drafting')
    const jsonlPath = path.join(root, 'harness/logs/metrics.jsonl')
    const { result, json } = runCliJson<{ error: { code: string } }>([
      'metrics',
      'record',
      'metrics-drafting-test',
      '--window',
      '24h',
      '--json-data',
      '{"plays":1}',
      '--json',
      '--root',
      root,
    ])
    expect(result.status).toBe(1)
    expect(json.error.code).toBe('E_BAD_STATUS')
    expect(fs.existsSync(jsonlPath)).toBe(false)
  })

  it('slug 不存在 → E_NOT_FOUND', () => {
    const root = tempRepo()
    const { result, json } = runCliJson<{ error: { code: string } }>([
      'metrics',
      'record',
      'not-exist-slug',
      '--window',
      '24h',
      '--json-data',
      '{"plays":1}',
      '--json',
      '--root',
      root,
    ])
    expect(result.status).toBe(1)
    expect(json.error.code).toBe('E_NOT_FOUND')
  })

  it('未知 --window → E_BAD_ARG', () => {
    const root = tempRepo()
    const { result, json } = runCliJson<{ error: { code: string } }>([
      'metrics',
      'record',
      'grok-build-teardown',
      '--window',
      '30d',
      '--json-data',
      '{"plays":1}',
      '--json',
      '--root',
      root,
    ])
    expect(result.status).toBe(1)
    expect(json.error.code).toBe('E_BAD_ARG')
  })

  it('--json-data 非法 JSON → E_BAD_ARG', () => {
    const root = tempRepo()
    const { result, json } = runCliJson<{ error: { code: string } }>([
      'metrics',
      'record',
      'grok-build-teardown',
      '--window',
      '24h',
      '--json-data',
      '{not valid json',
      '--json',
      '--root',
      root,
    ])
    expect(result.status).toBe(1)
    expect(json.error.code).toBe('E_BAD_ARG')
  })

  it('--json-data 为空对象 → E_BAD_ARG', () => {
    const root = tempRepo()
    const { result, json } = runCliJson<{ error: { code: string } }>([
      'metrics',
      'record',
      'grok-build-teardown',
      '--window',
      '24h',
      '--json-data',
      '{}',
      '--json',
      '--root',
      root,
    ])
    expect(result.status).toBe(1)
    expect(json.error.code).toBe('E_BAD_ARG')
  })

  it('7d 窗口但 meta.source 查无 backlog 条目 → E_NOT_FOUND，jsonl 也零写入（同事务）', () => {
    const root = tempRepo()
    writeMeta(root, 'metrics-orphan-test', 'published', 'not-exist-backlog-id')
    const jsonlPath = path.join(root, 'harness/logs/metrics.jsonl')
    const { result, json } = runCliJson<{ error: { code: string } }>([
      'metrics',
      'record',
      'metrics-orphan-test',
      '--window',
      '7d',
      '--json-data',
      '{"plays":1}',
      '--json',
      '--root',
      root,
    ])
    expect(result.status).toBe(1)
    expect(json.error.code).toBe('E_NOT_FOUND')
    expect(fs.existsSync(jsonlPath)).toBe(false)
  })

  it('--dry-run 零落盘', () => {
    const root = tempRepo()
    const jsonlPath = path.join(root, 'harness/logs/metrics.jsonl')
    const result = runCli(['metrics', 'record', 'grok-build-teardown', '--window', '7d', '--json-data', '{"plays":1}', '--dry-run', '--root', root])
    expect(result.status).toBe(0)
    expect(fs.existsSync(jsonlPath)).toBe(false)
  })
})
