import { describe, it, expect, afterEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { runTransaction } from '../writer.js'
import type { PlannedWrite } from '../writer.js'
import { editScalarValue, getMapValueNode } from '../yaml-edit.js'
import type { YAMLMap } from '../yaml-edit.js'
import { lockPath } from '../lock.js'
import { auditLogPath } from '../audit.js'
import { copyFixtureRepoToTemp } from '../../__test__/fixtures.js'

const tempDirs: string[] = []

function tempRepo(): string {
  const dir = copyFixtureRepoToTemp()
  tempDirs.push(dir)
  return dir
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const d = tempDirs.pop()!
    fs.rmSync(d, { recursive: true, force: true })
  }
})

function ctx(root: string, overrides: Partial<Parameters<typeof runTransaction>[0]> = {}) {
  return {
    root,
    consoleRoot: root, // 测试里借用同一临时目录当 consoleRoot，简化 audit 路径断言
    cmd: 'test-cmd',
    argv: ['test-cmd'],
    actor: 'test-actor',
    dryRun: false,
    ...overrides,
  }
}

describe('runTransaction：yaml-edit 单字段', () => {
  it('flip grok status → retro_done，只改这一行，其余字节不动；audit 落一行；dashboard 机器区更新', () => {
    const root = tempRepo()
    const relMeta = 'content/2026-07-18/grok-build-teardown/meta.yaml'
    const before = fs.readFileSync(path.join(root, relMeta), 'utf8')

    const plan: PlannedWrite[] = [
      {
        path: relMeta,
        op: 'yaml-edit',
        describe: 'status published -> retro_done',
        fields: ['status'],
        computeEdits: (doc) => {
          const node = getMapValueNode(doc.contents as YAMLMap, 'status')!
          return [editScalarValue(before, node, 'retro_done')]
        },
      },
    ]

    const result = runTransaction(ctx(root), () => plan)
    expect(result.ok).toBe(true)
    expect(result.dryRun).toBe(false)
    expect(result.writes.some((w) => w.path === relMeta)).toBe(true)

    const after = fs.readFileSync(path.join(root, relMeta), 'utf8')
    expect(after).toContain('status: retro_done')
    const beforeLines = before.split('\n')
    const afterLines = after.split('\n')
    let diffCount = 0
    for (let i = 0; i < beforeLines.length; i++) if (beforeLines[i] !== afterLines[i]) diffCount++
    expect(diffCount).toBe(1)

    // audit 落一行
    const auditRaw = fs.readFileSync(auditLogPath(root), 'utf8')
    const lines = auditRaw.trim().split('\n')
    expect(lines.length).toBe(1)
    const entry = JSON.parse(lines[0]!)
    expect(entry.cmd).toBe('test-cmd')
    expect(entry.actor).toBe('test-actor')
    expect(entry.result).toBe('ok')

    // dashboard 机器区更新（fixture dashboard.md 已有三对标记）
    const dash = fs.readFileSync(path.join(root, 'dashboard.md'), 'utf8')
    expect(dash).not.toContain('fixture 占位')

    // 锁已释放
    expect(fs.existsSync(lockPath(root))).toBe(false)
  })

  it('--dry-run：零落盘，返回 diff 预览', () => {
    const root = tempRepo()
    const relMeta = 'content/2026-07-18/grok-build-teardown/meta.yaml'
    const before = fs.readFileSync(path.join(root, relMeta), 'utf8')

    const plan: PlannedWrite[] = [
      {
        path: relMeta,
        op: 'yaml-edit',
        describe: 'x',
        fields: ['status'],
        computeEdits: (doc) => {
          const node = getMapValueNode(doc.contents as YAMLMap, 'status')!
          return [editScalarValue(before, node, 'retro_done')]
        },
      },
    ]

    const result = runTransaction(ctx(root, { dryRun: true }), () => plan)
    expect(result.dryRun).toBe(true)
    expect(result.writes[0]!.diff).toContain('retro_done')

    const after = fs.readFileSync(path.join(root, relMeta), 'utf8')
    expect(after).toBe(before) // 零落盘
    expect(fs.existsSync(auditLogPath(root))).toBe(false) // dry-run 不写 audit
    expect(fs.existsSync(lockPath(root))).toBe(false)
  })

  it('plan() 校验失败抛错 → 零写入（其余文件、audit 均不受影响）', () => {
    const root = tempRepo()
    const relMeta = 'content/2026-07-18/grok-build-teardown/meta.yaml'
    const before = fs.readFileSync(path.join(root, relMeta), 'utf8')

    expect(() =>
      runTransaction(ctx(root), () => {
        throw new Error('校验失败：非法状态')
      }),
    ).toThrow(/校验失败/)

    const after = fs.readFileSync(path.join(root, relMeta), 'utf8')
    expect(after).toBe(before)
    expect(fs.existsSync(lockPath(root))).toBe(false) // 锁必须释放
    // 失败也记一笔 audit（result:error），供追溯被拒绝的写尝试
    const auditRaw = fs.readFileSync(auditLogPath(root), 'utf8')
    const entry = JSON.parse(auditRaw.trim().split('\n')[0]!)
    expect(entry.result).toBe('error')
  })
})

describe('runTransaction：mkdir-copy + 后续 yaml-edit（promote 场景原型）', () => {
  it('复制模板目录并编辑新 meta.yaml，一次 rename 发布', () => {
    const root = tempRepo()
    const newRel = 'content/2026-08-18/new-topic-fixture'

    const plan: PlannedWrite[] = [
      {
        path: newRel,
        op: 'mkdir-copy',
        describe: '复制 _template',
        fields: [],
        from: 'content/_template',
      },
      {
        path: `${newRel}/meta.yaml`,
        op: 'yaml-edit',
        describe: '写入 slug/title',
        fields: ['slug', 'title'],
        computeEdits: (doc, raw) => {
          const map = doc.contents as YAMLMap
          const slugNode = getMapValueNode(map, 'slug')!
          const titleNode = getMapValueNode(map, 'title')!
          return [editScalarValue(raw, slugNode, 'new-topic-fixture'), editScalarValue(raw, titleNode, '测试标题')]
        },
      },
    ]

    const result = runTransaction(ctx(root), () => plan)
    expect(result.ok).toBe(true)

    const metaPath = path.join(root, newRel, 'meta.yaml')
    expect(fs.existsSync(metaPath)).toBe(true)
    const content = fs.readFileSync(metaPath, 'utf8')
    expect(content).toMatch(/slug:\s+new-topic-fixture/)
    expect(content).toMatch(/title:\s+测试标题/)
    // 模板其余骨架文件也一并复制
    expect(fs.existsSync(path.join(root, newRel, '1-brief.md'))).toBe(true)
    expect(fs.existsSync(path.join(root, newRel, '2-script.md'))).toBe(true)
  })

  it('dry-run 下 mkdir-copy 不建目录，yaml-edit 预演读 from 目录的模板内容', () => {
    const root = tempRepo()
    const newRel = 'content/2026-08-18/new-topic-fixture-2'
    const plan: PlannedWrite[] = [
      { path: newRel, op: 'mkdir-copy', describe: '复制 _template', fields: [], from: 'content/_template' },
      {
        path: `${newRel}/meta.yaml`,
        op: 'yaml-edit',
        describe: 'x',
        fields: ['slug'],
        computeEdits: (doc, raw) => {
          const node = getMapValueNode(doc.contents as YAMLMap, 'slug')!
          return [editScalarValue(raw, node, 'preview-slug')]
        },
      },
    ]
    const result = runTransaction(ctx(root, { dryRun: true }), () => plan)
    expect(result.dryRun).toBe(true)
    expect(fs.existsSync(path.join(root, newRel))).toBe(false)
    expect(result.writes.find((w) => w.path.endsWith('meta.yaml'))!.diff).toContain('preview-slug')
  })
})

describe('runTransaction：jsonl-append', () => {
  it('追加一行到新文件（含尾随换行），已有内容时正确拼接', () => {
    const root = tempRepo()
    const rel = 'harness/logs/metrics.jsonl'
    const plan1: PlannedWrite[] = [{ path: rel, op: 'jsonl-append', describe: 'x', fields: ['+1 line'], content: '{"a":1}' }]
    runTransaction(ctx(root), () => plan1)
    let content = fs.readFileSync(path.join(root, rel), 'utf8')
    expect(content).toBe('{"a":1}\n')

    const plan2: PlannedWrite[] = [{ path: rel, op: 'jsonl-append', describe: 'x', fields: ['+1 line'], content: '{"a":2}' }]
    runTransaction(ctx(root), () => plan2)
    content = fs.readFileSync(path.join(root, rel), 'utf8')
    expect(content).toBe('{"a":1}\n{"a":2}\n')
  })
})

describe('runTransaction：锁冲突', () => {
  it('陈旧但存活进程持有的锁 → E_LOCKED，不阻塞重试排队', () => {
    const root = tempRepo()
    fs.writeFileSync(lockPath(root), JSON.stringify({ pid: process.pid, ts: new Date().toISOString(), cmd: 'other' }))
    expect(() => runTransaction(ctx(root), () => [])).toThrow(/E_LOCKED|锁被占用/)
    fs.rmSync(lockPath(root))
  })

  it('陈旧且进程已不存活的锁被自动抢占，抢占记入 audit', () => {
    const root = tempRepo()
    const deadPid = 999999 // 几乎不可能存活的 pid
    const staleTs = new Date(Date.now() - 60_000).toISOString() // 超过 30s 阈值
    fs.writeFileSync(lockPath(root), JSON.stringify({ pid: deadPid, ts: staleTs, cmd: 'stale-cmd' }))
    const result = runTransaction(ctx(root), () => [])
    expect(result.ok).toBe(true)
    const auditRaw = fs.readFileSync(auditLogPath(root), 'utf8')
    expect(auditRaw).toContain('lock-preempt')
  })
})
