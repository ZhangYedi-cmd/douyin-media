import { describe, it, expect, afterEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { runCli, runCliJson, FIXTURE_REPO_ROOT } from '../../../__test__/helpers.js'

const tempDirs: string[] = []
function tempRepo(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'console-cli-publishdone-'))
  fs.cpSync(FIXTURE_REPO_ROOT, dir, { recursive: true })
  tempDirs.push(dir)
  return dir
}
afterEach(() => {
  while (tempDirs.length > 0) fs.rmSync(tempDirs.pop()!, { recursive: true, force: true })
})

describe('media publish-done：历史事故回归（EP04 scheduled 超时收尾）', () => {
  it('scheduled→published 完成收口：meta 三翻齐（status/timestamps/backlog）', () => {
    const root = tempRepo()
    const { result, json } = runCliJson<{
      data: { mode: string; metaStatus: string; backlogId: string; backlogStatus: string }
    }>(['publish-done', 'ep04-esc-abort-chain', '--url', 'https://v.douyin.com/ep04', '--json', '--root', root])
    expect(result.status).toBe(0)
    expect(json.data.mode).toBe('scheduled-done')
    expect(json.data.metaStatus).toBe('published')
    expect(json.data.backlogId).toBe('2026-06-10-004')
    expect(json.data.backlogStatus).toBe('published')

    const meta = fs.readFileSync(path.join(root, 'content/2026-06-18/ep04-esc-abort-chain/meta.yaml'), 'utf8')
    expect(meta).toContain('status: published')
    expect(meta).toMatch(/publish_url:\s+https:\/\/v\.douyin\.com\/ep04/)
    expect(meta).toMatch(/published:\s+2026-\d{2}-\d{2} \d{2}:\d{2}/)

    const backlog = fs.readFileSync(path.join(root, 'content/_backlog/backlog.yaml'), 'utf8')
    const idx = backlog.indexOf('id: 2026-06-10-004')
    const chunk = backlog.slice(idx, idx + 300)
    expect(chunk).toContain('status: published')
  })
})

describe('media publish-done：published 补填语义（历史事故回归：published 无链接）', () => {
  it('已 published + --url → 仅回填链接，不动状态/backlog', () => {
    const root = tempRepo()
    const { result, json } = runCliJson<{ data: { mode: string; backlogId: string | null } }>([
      'publish-done',
      'grok-build-teardown',
      '--url',
      'https://v.douyin.com/grok',
      '--json',
      '--root',
      root,
    ])
    expect(result.status).toBe(0)
    expect(json.data.mode).toBe('backfill')
    expect(json.data.backlogId).toBeNull()
    const meta = fs.readFileSync(path.join(root, 'content/2026-07-18/grok-build-teardown/meta.yaml'), 'utf8')
    expect(meta).toMatch(/publish_url:\s+https:\/\/v\.douyin\.com\/grok/)
  })

  it('已 published 但不带 --url → E_ALREADY_PUBLISHED', () => {
    const root = tempRepo()
    const { result, json } = runCliJson<{ error: { code: string } }>([
      'publish-done',
      'grok-build-teardown',
      '--json',
      '--root',
      root,
    ])
    expect(result.status).toBe(1)
    expect(json.error.code).toBe('E_ALREADY_PUBLISHED')
  })
})

describe('media publish-done：approved 正常发布', () => {
  it('approved→published 直达 + backlog 同步', () => {
    const root = tempRepo()
    // hy3-moe-teardown 是 fixture 里的 review 状态，改造一份 approved 状态的 fixture 场景：借用 open-weight-5 的 backlog 关系不合适（已是 scheduled）
    // 用 grok 的 backlog id 但新建一个 approved 状态 meta 测试正常发布路径
    const dir = path.join(root, 'content/2026-08-01/approved-test-topic')
    fs.mkdirSync(path.join(dir, 'assets'), { recursive: true })
    fs.writeFileSync(
      path.join(dir, 'meta.yaml'),
      [
        'slug: approved-test-topic',
        'title: "测试标题"',
        'type: kouban',
        'pillar: depth',
        'status: approved',
        'source: 2026-06-14-006',
        'schedule:',
        'publish_url:',
        '',
        'timestamps:',
        '  ideated: 2026-08-01',
        '  drafting: 2026-08-01',
        '  review: 2026-08-01',
        '  approved: 2026-08-01 10:00',
        '  published:',
        '  retro_done:',
        '',
      ].join('\n'),
    )
    // backlog 2026-06-14-006 目前是 idea；先手工置成 picked 模拟已 promote（测试只关心 publish-done 自己的行为）
    const backlogPath = path.join(root, 'content/_backlog/backlog.yaml')
    let backlog = fs.readFileSync(backlogPath, 'utf8')
    backlog = backlog.replace(
      /(id: 2026-06-14-006[\s\S]*?status:) idea/,
      '$1 picked',
    )
    fs.writeFileSync(backlogPath, backlog)

    const { result, json } = runCliJson<{ data: { mode: string; metaStatus: string; backlogStatus: string } }>([
      'publish-done',
      'approved-test-topic',
      '--json',
      '--root',
      root,
    ])
    expect(result.status).toBe(0)
    expect(json.data.mode).toBe('normal')
    expect(json.data.metaStatus).toBe('published')
    expect(json.data.backlogStatus).toBe('published')

    const meta = fs.readFileSync(path.join(dir, 'meta.yaml'), 'utf8')
    expect(meta).toContain('status: published')
  })

  it('approved + --scheduled → meta 转 scheduled，backlog 保持 picked', () => {
    const root = tempRepo()
    const dir = path.join(root, 'content/2026-08-01/approved-sched-topic')
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(
      path.join(dir, 'meta.yaml'),
      [
        'slug: approved-sched-topic',
        'title: "测试标题2"',
        'type: kouban',
        'pillar: depth',
        'status: approved',
        'source: 2026-06-14-007',
        'schedule:',
        'publish_url:',
        '',
        'timestamps:',
        '  ideated: 2026-08-01',
        '  drafting: 2026-08-01',
        '  review: 2026-08-01',
        '  approved: 2026-08-01 10:00',
        '  published:',
        '  retro_done:',
        '',
      ].join('\n'),
    )
    const backlogPath = path.join(root, 'content/_backlog/backlog.yaml')
    let backlog = fs.readFileSync(backlogPath, 'utf8')
    backlog = backlog.replace(/(id: 2026-06-14-007[\s\S]*?status:) idea/, '$1 picked')
    fs.writeFileSync(backlogPath, backlog)

    const future = new Date(Date.now() + 3 * 86400_000)
    const stamp = `${future.getFullYear()}-${String(future.getMonth() + 1).padStart(2, '0')}-${String(future.getDate()).padStart(2, '0')} 20:00`

    const { result, json } = runCliJson<{ data: { metaStatus: string; backlogStatus: string | null } }>([
      'publish-done',
      'approved-sched-topic',
      '--scheduled',
      stamp,
      '--json',
      '--root',
      root,
    ])
    expect(result.status).toBe(0)
    expect(json.data.metaStatus).toBe('scheduled')
    expect(json.data.backlogStatus).toBeNull() // backlog 保持 picked，不写

    const meta = fs.readFileSync(path.join(dir, 'meta.yaml'), 'utf8')
    expect(meta).toContain('status: scheduled')
    expect(meta).toMatch(new RegExp(`schedule:\\s+${stamp.replace(/[:.]/g, '\\$&')}`))

    const backlogAfter = fs.readFileSync(backlogPath, 'utf8')
    const idx = backlogAfter.indexOf('id: 2026-06-14-007')
    expect(backlogAfter.slice(idx, idx + 200)).toContain('status: picked')
  })
})

describe('media publish-done：校验拒绝路径（零写入）', () => {
  it('非 approved/scheduled/published 状态（review）→ E_BAD_STATUS，零写入', () => {
    const root = tempRepo()
    const dir = path.join(root, 'content/2026-08-01/review-status-topic')
    fs.mkdirSync(dir, { recursive: true })
    const metaPath = path.join(dir, 'meta.yaml')
    fs.writeFileSync(
      metaPath,
      ['slug: review-status-topic', 'title: "x"', 'type: kouban', 'pillar: depth', 'status: review', 'source:', ''].join('\n'),
    )
    const before = fs.readFileSync(metaPath, 'utf8')
    const { result, json } = runCliJson<{ error: { code: string } }>([
      'publish-done',
      'review-status-topic',
      '--json',
      '--root',
      root,
    ])
    expect(result.status).toBe(1)
    expect(json.error.code).toBe('E_BAD_STATUS')
    expect(fs.readFileSync(metaPath, 'utf8')).toBe(before)
  })

  it('slug 不存在 → E_NOT_FOUND', () => {
    const root = tempRepo()
    const { result, json } = runCliJson<{ error: { code: string } }>([
      'publish-done',
      'not-exist-slug',
      '--json',
      '--root',
      root,
    ])
    expect(result.status).toBe(1)
    expect(json.error.code).toBe('E_NOT_FOUND')
  })

  it('--url 非法格式 → E_BAD_ARG', () => {
    const root = tempRepo()
    const { result, json } = runCliJson<{ error: { code: string } }>([
      'publish-done',
      'grok-build-teardown',
      '--url',
      'not-a-url',
      '--json',
      '--root',
      root,
    ])
    expect(result.status).toBe(1)
    expect(json.error.code).toBe('E_BAD_ARG')
  })

  it('--scheduled 早于当前时间 → E_BAD_ARG', () => {
    const root = tempRepo()
    const { result, json } = runCliJson<{ error: { code: string } }>([
      'publish-done',
      'ep04-esc-abort-chain',
      '--scheduled',
      '2020-01-01 00:00',
      '--json',
      '--root',
      root,
    ])
    expect(result.status).toBe(1)
    expect(json.error.code).toBe('E_BAD_ARG')
  })

  it('--dry-run 零落盘', () => {
    const root = tempRepo()
    const before = fs.readFileSync(path.join(root, 'content/2026-06-18/ep04-esc-abort-chain/meta.yaml'), 'utf8')
    const result = runCli(['publish-done', 'ep04-esc-abort-chain', '--url', 'https://x', '--dry-run', '--root', root])
    expect(result.status).toBe(0)
    expect(fs.readFileSync(path.join(root, 'content/2026-06-18/ep04-esc-abort-chain/meta.yaml'), 'utf8')).toBe(before)
  })
})
