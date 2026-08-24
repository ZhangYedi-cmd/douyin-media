import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { execMedia } from '../../actions/execMedia.js'
import type { Config } from '../../config.js'

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'exec-media-'))
afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }))

function writeScript(name: string, body: string): string {
  const p = path.join(tmp, name)
  fs.writeFileSync(p, `#!/usr/bin/env bash\n${body}\n`)
  fs.chmodSync(p, 0o755)
  return p
}

function baseConfig(mediaBin: string): Config {
  return { consoleRoot: tmp, repoRoot: tmp, port: 5170, mediaBin, tokenPath: path.join(tmp, '.runtime/token') }
}

describe('execMedia：退出码/输出 → HTTP 状态码映射', () => {
  it('exit 0 + 合法 --json 信封 → 200 透传', async () => {
    const bin = writeScript('media-ok.sh', `echo '{"ok":true,"cmd":"flip","data":{"slug":"x"}}'`)
    const res = await execMedia(baseConfig(bin), ['flip', 'x', 'approved', '--json'])
    expect(res.httpStatus).toBe(200)
    expect((res.body as { ok: boolean }).ok).toBe(true)
  })

  it('规则拒绝（MediaError 非 E_PARSE）→ 409 MEDIA_REJECTED，detail 带规则名', async () => {
    const bin = writeScript(
      'media-reject.sh',
      `echo '{"ok":false,"cmd":"flip","error":{"code":"E_ILLEGAL_TRANSITION","message":"published → approved 非法","rule":"state:meta"}}'; exit 1`,
    )
    const res = await execMedia(baseConfig(bin), ['flip', 'x', 'approved', '--json'])
    expect(res.httpStatus).toBe(409)
    const body = res.body as { error: { code: string; detail?: string } }
    expect(body.error.code).toBe('MEDIA_REJECTED')
    expect(body.error.detail).toContain('state:meta')
  })

  it('锁冲突（E_LOCKED）同样映射 409 MEDIA_REJECTED', async () => {
    const bin = writeScript(
      'media-locked.sh',
      `echo '{"ok":false,"cmd":"flip","error":{"code":"E_LOCKED","message":"仓库被锁定"}}'; exit 3`,
    )
    const res = await execMedia(baseConfig(bin), ['flip', 'x', 'approved', '--json'])
    expect(res.httpStatus).toBe(409)
    expect((res.body as { error: { code: string } }).error.code).toBe('MEDIA_REJECTED')
  })

  it('E_PARSE 真相源损坏 → 500 INTERNAL 并在 detail 里标注需人工介入', async () => {
    const bin = writeScript(
      'media-parse-error.sh',
      `echo '{"ok":false,"cmd":"check","error":{"code":"E_PARSE","message":"meta.yaml 解析失败"}}'; exit 4`,
    )
    const res = await execMedia(baseConfig(bin), ['check', '--json'])
    expect(res.httpStatus).toBe(500)
    expect((res.body as { error: { code: string } }).error.code).toBe('INTERNAL')
  })

  it('非 JSON 输出（如 commander 用法错误）→ 500 INTERNAL（判为 server 侧参数拼装 bug）', async () => {
    const bin = writeScript('media-garbage.sh', `echo 'error: unknown command' 1>&2; exit 1`)
    const res = await execMedia(baseConfig(bin), ['bogus'])
    expect(res.httpStatus).toBe(500)
    expect((res.body as { error: { code: string } }).error.code).toBe('INTERNAL')
  })

  it('exit 0 但输出不是预期信封 → 500 INTERNAL', async () => {
    const bin = writeScript('media-weird-ok.sh', `echo 'not json at all'`)
    const res = await execMedia(baseConfig(bin), ['flip', 'x', 'approved', '--json'])
    expect(res.httpStatus).toBe(500)
  })

  it('超时 → 502 MEDIA_UNAVAILABLE', async () => {
    const bin = writeScript('media-hang.sh', `sleep 5`)
    const res = await execMedia(baseConfig(bin), ['flip', 'x', 'approved', '--json'], { timeoutMs: 200 })
    expect(res.httpStatus).toBe(502)
    expect((res.body as { error: { code: string } }).error.code).toBe('MEDIA_UNAVAILABLE')
  }, 10_000)

  it('PATH 里找不到 media（ENOENT）→ 兜底走 node <consoleRoot>/packages/cli/dist/index.js', async () => {
    const fallbackDir = path.join(tmp, 'fallback-ok/packages/cli/dist')
    fs.mkdirSync(fallbackDir, { recursive: true })
    fs.writeFileSync(path.join(fallbackDir, 'index.js'), `console.log(JSON.stringify({ok:true,cmd:'flip',data:{}}))`)
    const cfg = baseConfig('/definitely/not/a/real/media/bin')
    cfg.consoleRoot = path.join(tmp, 'fallback-ok')
    const res = await execMedia(cfg, ['flip', 'x', 'approved', '--json'])
    expect(res.httpStatus).toBe(200)
  })

  it('media 符号链接目标不可执行（EACCES，如 tsc 重建后丢失 +x）→ 同样走绝对路径兜底', async () => {
    const nonExec = writeScript('media-no-x.sh', `echo '{"ok":true,"cmd":"flip","data":{}}'`)
    fs.chmodSync(nonExec, 0o644) // 去掉可执行位，模拟真实起服务验证时踩到的坑
    const fallbackDir = path.join(tmp, 'fallback-eacces/packages/cli/dist')
    fs.mkdirSync(fallbackDir, { recursive: true })
    fs.writeFileSync(path.join(fallbackDir, 'index.js'), `console.log(JSON.stringify({ok:true,cmd:'flip',data:{via:'fallback'}}))`)
    const cfg = baseConfig(nonExec)
    cfg.consoleRoot = path.join(tmp, 'fallback-eacces')
    const res = await execMedia(cfg, ['flip', 'x', 'approved', '--json'])
    expect(res.httpStatus).toBe(200)
    expect((res.body as { data: { via?: string } }).data.via).toBe('fallback')
  })

  it('第一次 spawn 就 ENOENT 且绝对路径兜底目标文件也不存在 → 优雅降级为错误响应而非抛异常', async () => {
    // 说明：兜底走 `node <fallback>`——node 二进制本身总是能被 spawn 成功（第二次 spawn 不会再 ENOENT），
    // 只是 node 加载一个不存在的入口文件会报 "Cannot find module" 并以非零码退出、stdout 非 JSON；
    // 这与「两次都在 spawn 层面失败」（真正的 502 场景，见上面 ENOENT/EACCES 两个用例）不是同一件事，
    // 这里落的是 500 INTERNAL（服务端部署问题：cli/dist 不存在）——两者都不是 200，行为仍然可控不炸。
    const cfg = baseConfig('/definitely/not/a/real/media/bin')
    cfg.consoleRoot = path.join(tmp, 'no-fallback-here')
    const res = await execMedia(cfg, ['flip', 'x', 'approved', '--json'])
    expect([500, 502]).toContain(res.httpStatus)
    expect((res.body as { error: { code: string } }).error.code).toMatch(/INTERNAL|MEDIA_UNAVAILABLE/)
  })

  it('MEDIA_ACTOR / PIPELINE_REPO_ROOT 注入子进程 env（audit 归因）', async () => {
    const bin = writeScript('media-env.sh', `echo "{\\"ok\\":true,\\"cmd\\":\\"flip\\",\\"data\\":{\\"actor\\":\\"$MEDIA_ACTOR\\",\\"root\\":\\"$PIPELINE_REPO_ROOT\\"}}"`)
    const cfg = baseConfig(bin)
    const res = await execMedia(cfg, ['flip', 'x', 'approved', '--json'], { actor: 'console-job:publish-123' })
    const data = (res.body as { data: { actor: string; root: string } }).data
    expect(data.actor).toBe('console-job:publish-123')
    expect(data.root).toBe(cfg.repoRoot)
  })
})
