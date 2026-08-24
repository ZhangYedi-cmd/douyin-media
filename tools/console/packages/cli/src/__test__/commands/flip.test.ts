import { describe, it, expect, afterEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { parse as parseYaml } from 'yaml'
import { runCli, runCliJson, FIXTURE_REPO_ROOT } from '../../../__test__/helpers.js'

const tempDirs: string[] = []
function tempRepo(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'console-cli-flip-'))
  fs.cpSync(FIXTURE_REPO_ROOT, dir, { recursive: true })
  tempDirs.push(dir)
  return dir
}
afterEach(() => {
  while (tempDirs.length > 0) fs.rmSync(tempDirs.pop()!, { recursive: true, force: true })
})

function writeMeta(root: string, slug: string, extra: Record<string, string>): string {
  const dir = path.join(root, 'content/2026-08-01', slug)
  fs.mkdirSync(dir, { recursive: true })
  const lines = [
    'slug: ' + slug,
    'title: "x"',
    'type: kouban',
    'pillar: depth',
    `status: ${extra.status}`,
    'source:',
    'schedule:',
    'publish_url:',
    '',
    'timestamps:',
    '  ideated: 2026-08-01',
    '  drafting:',
    '  review:',
    '  approved:',
    '  published:',
    '  retro_done:',
    '',
  ]
  fs.writeFileSync(path.join(dir, 'meta.yaml'), lines.join('\n'))
  return path.join(dir, 'meta.yaml')
}

describe('media flip', () => {
  it('合法迁移 ideated→drafting，写入时间戳', () => {
    const root = tempRepo()
    const metaPath = writeMeta(root, 'flip-test-1', { status: 'ideated' })
    const { result, json } = runCliJson<{ data: { from: string; to: string } }>([
      'flip',
      'flip-test-1',
      'drafting',
      '--json',
      '--root',
      root,
    ])
    expect(result.status).toBe(0)
    expect(json.data.from).toBe('ideated')
    expect(json.data.to).toBe('drafting')
    const meta = fs.readFileSync(metaPath, 'utf8')
    expect(meta).toContain('status: drafting')
    expect(meta).toMatch(/drafting:\s+2026-\d{2}-\d{2} \d{2}:\d{2}/)
  })

  it('已有时间戳不覆盖（首次为准）', () => {
    const root = tempRepo()
    const dir = path.join(root, 'content/2026-08-01/flip-test-stamped')
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(
      path.join(dir, 'meta.yaml'),
      [
        'slug: flip-test-stamped',
        'title: "x"',
        'type: kouban',
        'pillar: depth',
        'status: review',
        'source:',
        '',
        'timestamps:',
        '  ideated: 2026-08-01',
        '  drafting: 2026-08-01',
        '  review: 2026-08-01 09:00',
        '  approved:',
        '  published:',
        '  retro_done:',
        '',
      ].join('\n'),
    )
    // review -> drafting（打回），drafting 已有旧值不应被覆盖
    const beforeMeta = fs.readFileSync(path.join(dir, 'meta.yaml'), 'utf8')
    const result = runCli(['flip', 'flip-test-stamped', 'drafting', '--root', root])
    expect(result.status).toBe(0)
    const after = fs.readFileSync(path.join(dir, 'meta.yaml'), 'utf8')
    expect(after).toContain('drafting: 2026-08-01\n') // 原值未变（不是今天新戳的时间）
    expect(after).not.toBe(beforeMeta) // 但 status 行确实变了
  })

  it('目标 published/scheduled 一律拒绝，提示走 publish-done', () => {
    const root = tempRepo()
    writeMeta(root, 'flip-test-2', { status: 'approved' })
    const { result, json } = runCliJson<{ error: { code: string; message: string } }>([
      'flip',
      'flip-test-2',
      'published',
      '--json',
      '--root',
      root,
    ])
    expect(result.status).toBe(1)
    expect(json.error.code).toBe('E_ILLEGAL_TRANSITION')
    expect(json.error.message).toContain('publish-done')
  })

  it('非法迁移（如 review 直达 published）→ E_ILLEGAL_TRANSITION', () => {
    const root = tempRepo()
    writeMeta(root, 'flip-test-3', { status: 'review' })
    const { result, json } = runCliJson<{ error: { code: string } }>([
      'flip',
      'flip-test-3',
      'published',
      '--json',
      '--root',
      root,
    ])
    expect(result.status).toBe(1)
    expect(json.error.code).toBe('E_ILLEGAL_TRANSITION')
  })

  it('rejected 无 --reason → E_MISSING_REASON', () => {
    const root = tempRepo()
    writeMeta(root, 'flip-test-4', { status: 'review' })
    const { result, json } = runCliJson<{ error: { code: string } }>([
      'flip',
      'flip-test-4',
      'rejected',
      '--json',
      '--root',
      root,
    ])
    expect(result.status).toBe(1)
    expect(json.error.code).toBe('E_MISSING_REASON')
  })

  it('rejected 带 --reason 成功，reason 写入 status 行注释', () => {
    const root = tempRepo()
    const metaPath = writeMeta(root, 'flip-test-5', { status: 'review' })
    const result = runCli(['flip', 'flip-test-5', 'rejected', '--reason', '钩子太弱重做', '--root', root])
    expect(result.status).toBe(0)
    const meta = fs.readFileSync(metaPath, 'utf8')
    expect(meta).toContain('status: rejected')
    expect(meta).toContain('钩子太弱重做')
  })

  it('published→retro_done 允许（治理线唯一迁移）', () => {
    const root = tempRepo()
    const metaPath = writeMeta(root, 'flip-test-6', { status: 'published' })
    const result = runCli(['flip', 'flip-test-6', 'retro_done', '--root', root])
    expect(result.status).toBe(0)
    expect(fs.readFileSync(metaPath, 'utf8')).toContain('status: retro_done')
  })

  it('未知状态名 → E_BAD_ARG', () => {
    const root = tempRepo()
    writeMeta(root, 'flip-test-7', { status: 'review' })
    const { result, json } = runCliJson<{ error: { code: string } }>([
      'flip',
      'flip-test-7',
      'bogus-status',
      '--json',
      '--root',
      root,
    ])
    expect(result.status).toBe(1)
    expect(json.error.code).toBe('E_BAD_ARG')
  })

  it('slug 不存在 → E_NOT_FOUND', () => {
    const root = tempRepo()
    const { result, json } = runCliJson<{ error: { code: string } }>([
      'flip',
      'not-exist',
      'drafting',
      '--json',
      '--root',
      root,
    ])
    expect(result.status).toBe(1)
    expect(json.error.code).toBe('E_NOT_FOUND')
  })

  it('rejected --reason 回归（R2 报告 repro）：真实模板两行式 status 注释 + timestamps 无 rejected 键，' +
    'diff 只落在白名单字段，产物仍是合法 YAML', () => {
    const root = tempRepo()
    const dir = path.join(root, 'content/2026-07-14/real-shape-repro')
    fs.mkdirSync(dir, { recursive: true })
    // 逐字照搬真实仓 meta.yaml 的写法：status 两行式续注释、timestamps 缺 rejected 键、
    // timestamps 块最后一个键（retro_done）留空后空一行接下一个顶层字段的整行前导注释再接该字段——
    // 这正是 R2 报告复现的两处损坏（① reason 拼进续注释文本中间、② 新键插过空行落进注释和字段中间）现场。
    const before = [
      '# 内容条目元数据 / 状态机',
      'slug: real-shape-repro',
      'title: "x"',
      'type: kouban',
      'pillar: depth',
      'status: review             # 生产线: ideated→drafting→review→approved→scheduled→published | rejected',
      '                           # retro_done 由治理线(harness/)复盘后置位，非生产线状态',
      'source: 2026-07-10-001',
      '',
      'schedule:',
      'publish_url:',
      '',
      'timestamps:',
      '  ideated: 2026-07-14',
      '  drafting: 2026-07-14',
      '  review: 2026-07-14',
      '  approved:',
      '  published:',
      '  retro_done:',
      '',
      '# 阻塞：无',
      'blocker: {}',
      '',
    ].join('\n')
    const metaPath = path.join(dir, 'meta.yaml')
    fs.writeFileSync(metaPath, before)

    const result = runCli(['flip', 'real-shape-repro', 'rejected', '--reason', '测试理由，含中文标点！', '--root', root])
    expect(result.status).toBe(0)

    const after = fs.readFileSync(metaPath, 'utf8')

    // 产物必须仍可被 yaml 重新 parse，且语义正确落账
    const parsed = parseYaml(after) as {
      status: string
      timestamps: Record<string, string | null>
      blocker: Record<string, unknown>
    }
    expect(parsed.status).toBe('rejected')
    expect(parsed.timestamps.rejected).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/)
    expect(parsed.blocker).toEqual({})

    // diff 白名单：只多一行（新增 timestamps.rejected），其余全部原始行逐一保留、顺序不变
    const beforeLines = before.split('\n')
    const afterLines = after.split('\n')
    expect(afterLines.length).toBe(beforeLines.length + 1)

    // 白名单行 1/2：status 值翻转 + 该行续注释追加理由（不拆词——旧 bug①：拼进 "retro_done" 词中间）
    expect(afterLines[5]).toMatch(/^status: rejected {13}# 生产线: ideated→drafting→review→approved→scheduled→published \| rejected$/)
    expect(afterLines[6]).toMatch(/^ {27}# retro_done 由治理线\(harness\/\)复盘后置位，非生产线状态\d{4}-\d{2}-\d{2} 测试理由，含中文标点！$/)

    // 白名单行 3：新增 timestamps.rejected 紧跟在 retro_done 之后（旧 bug②：越过空行插到别处）
    const retroIdx = afterLines.indexOf('  retro_done:')
    expect(afterLines[retroIdx + 1]).toMatch(/^ {2}rejected: \d{4}-\d{2}-\d{2} \d{2}:\d{2}$/)

    // 未受影响的字段原样保留在原位置（blocker 前导注释未被插入的新键顶开）
    expect(afterLines[retroIdx + 2]).toBe('')
    expect(afterLines[retroIdx + 3]).toBe('# 阻塞：无')
    expect(afterLines[retroIdx + 4]).toBe('blocker: {}')

    // 其余全部行（非白名单区）逐行与原文件字节相同（retro_done 之后因新插一行整体后移一位）
    for (let i = 0; i < beforeLines.length; i++) {
      if (i === 5 || i === 6) continue // status 行 + 续注释行：白名单内已单独断言
      const afterIdx = i <= retroIdx ? i : i + 1
      expect(afterLines[afterIdx]).toBe(beforeLines[i])
    }
  })

  it('--help 打印活文档迁移表', () => {
    const result = runCli(['flip', '--help'])
    expect(result.status).toBe(0)
    expect(result.stdout).toContain('media publish-done')
    expect(result.stdout).toContain('retro_done')
  })
})
