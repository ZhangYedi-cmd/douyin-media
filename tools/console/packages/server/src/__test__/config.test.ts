// config.ts 补测（C 验收跟进项②）：此前无独立单测，真正靠一次真实起服务才暴露过「相对层数写死成 2 层」
// 导致 .runtime/ 落错目录的 bug（见 config.ts 头注释）。本文件专盯这条回归线：
//   - consoleRoot 必须精确落在 tools/console（3 层，不是 2 层）；
//   - tokenPath 必须挂在 consoleRoot 下而不是 repoRoot 或别的层；
//   - repoRoot / CONSOLE_PORT 的默认值与 env 覆盖行为。
// 全部只读 loadConfig() 的返回值 + 真实仓目录结构断言，loadOrCreateToken 一律传临时路径，
// 绝不碰主仓 .runtime/token（红线：测试不许写主仓状态文件）。
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { loadConfig, loadOrCreateToken, mediaBinFallback } from '../config.js'

let envBackup: NodeJS.ProcessEnv

beforeEach(() => {
  envBackup = { ...process.env }
})

afterEach(() => {
  process.env = envBackup
})

describe('loadConfig：consoleRoot 落点（防「相对层数写死」回归）', () => {
  it('consoleRoot 精确落在 <repo>/tools/console，不多不少 3 层', () => {
    const cfg = loadConfig()
    expect(path.basename(cfg.consoleRoot)).toBe('console')
    expect(path.basename(path.dirname(cfg.consoleRoot))).toBe('tools')
    // 落点校验：consoleRoot 下必须真能找到 server 自己的 package.json（不是误落到 packages/ 或仓根）
    expect(fs.existsSync(path.join(cfg.consoleRoot, 'packages/server/package.json'))).toBe(true)
    expect(fs.existsSync(path.join(cfg.consoleRoot, 'package.json'))).toBe(true)
    const pkg = JSON.parse(fs.readFileSync(path.join(cfg.consoleRoot, 'package.json'), 'utf8')) as { name?: string }
    expect(pkg.name).toBe('console')
  })

  it('tokenPath = consoleRoot/.runtime/token（不是 repoRoot 下，两者在真实仓里是不同目录）', () => {
    const cfg = loadConfig()
    expect(cfg.tokenPath).toBe(path.join(cfg.consoleRoot, '.runtime', 'token'))
    expect(cfg.consoleRoot).not.toBe(cfg.repoRoot) // 真实仓里 tools/console ≠ 主仓根，两条路径不该被混用
  })
})

describe('loadConfig：repoRoot 解析（PIPELINE_REPO_ROOT 缺省 / 覆盖）', () => {
  it('未设 PIPELINE_REPO_ROOT 时，repoRoot = consoleRoot 上两级，且真落在主仓根（能找到 content/_backlog/backlog.yaml）', () => {
    delete process.env.PIPELINE_REPO_ROOT
    const cfg = loadConfig()
    expect(cfg.repoRoot).toBe(path.resolve(cfg.consoleRoot, '../..'))
    expect(fs.existsSync(path.join(cfg.repoRoot, 'content/_backlog/backlog.yaml'))).toBe(true)
  })

  it('设了 PIPELINE_REPO_ROOT（绝对路径）时，repoRoot 原样采用', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'console-config-repo-'))
    process.env.PIPELINE_REPO_ROOT = tmp
    const cfg = loadConfig()
    expect(cfg.repoRoot).toBe(tmp)
  })

  it('设了 PIPELINE_REPO_ROOT（相对路径）时，按 process.cwd() 解析', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'console-config-relroot-'))
    const rel = path.relative(process.cwd(), tmp)
    process.env.PIPELINE_REPO_ROOT = rel
    const cfg = loadConfig()
    expect(cfg.repoRoot).toBe(path.resolve(rel))
    expect(cfg.repoRoot).toBe(tmp)
  })
})

describe('loadConfig：CONSOLE_PORT 缺省 5170', () => {
  it('未设 CONSOLE_PORT → port=5170', () => {
    delete process.env.CONSOLE_PORT
    expect(loadConfig().port).toBe(5170)
  })

  it('CONSOLE_PORT 设为空字符串（假值）→ 仍缺省 5170', () => {
    process.env.CONSOLE_PORT = ''
    expect(loadConfig().port).toBe(5170)
  })

  it('CONSOLE_PORT 设为具体端口 → 按 Number() 转换采用', () => {
    process.env.CONSOLE_PORT = '8081'
    expect(loadConfig().port).toBe(8081)
  })
})

describe('loadConfig：mediaBin 缺省/覆盖', () => {
  it('未设 MEDIA_BIN → 缺省裸命令 "media"', () => {
    delete process.env.MEDIA_BIN
    expect(loadConfig().mediaBin).toBe('media')
  })

  it('设了 MEDIA_BIN → 原样采用', () => {
    process.env.MEDIA_BIN = '/opt/custom/media'
    expect(loadConfig().mediaBin).toBe('/opt/custom/media')
  })
})

describe('mediaBinFallback：cli/dist 绝对路径兜底', () => {
  it('拼出 <consoleRoot>/packages/cli/dist/index.js', () => {
    expect(mediaBinFallback('/x/y/console')).toBe(path.join('/x/y/console', 'packages/cli/dist/index.js'))
  })
})

describe('loadOrCreateToken：生成/复用/落盘（全程临时目录，不碰主仓 .runtime/token）', () => {
  it('目标路径的父目录尚不存在 → 自动 mkdir，生成非空 token 并以 0600 落盘', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'console-config-token-'))
    const tokenPath = path.join(tmp, '.runtime', 'token')
    expect(fs.existsSync(path.dirname(tokenPath))).toBe(false)

    const token = loadOrCreateToken(tokenPath)
    expect(token.length).toBeGreaterThan(0)
    expect(fs.existsSync(tokenPath)).toBe(true)
    expect(fs.readFileSync(tokenPath, 'utf8').trim()).toBe(token)
    const mode = fs.statSync(tokenPath).mode & 0o777
    expect(mode).toBe(0o600)
  })

  it('token 已存在且非空 → 复用原值，不重新生成（跨重启稳定）', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'console-config-token-'))
    const tokenPath = path.join(tmp, '.runtime', 'token')
    const first = loadOrCreateToken(tokenPath)
    const second = loadOrCreateToken(tokenPath)
    expect(second).toBe(first)
  })

  it('token 文件存在但内容为空白 → 视同未生成，重新生成一个新 token', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'console-config-token-'))
    const tokenDir = path.join(tmp, '.runtime')
    const tokenPath = path.join(tokenDir, 'token')
    fs.mkdirSync(tokenDir, { recursive: true })
    fs.writeFileSync(tokenPath, '   \n')

    const token = loadOrCreateToken(tokenPath)
    expect(token.length).toBeGreaterThan(0)
    expect(fs.readFileSync(tokenPath, 'utf8').trim()).toBe(token)
  })

  it('两次生成（不同 tokenPath）互不相同（crypto.randomBytes 随机性基本校验）', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'console-config-token-'))
    const a = loadOrCreateToken(path.join(tmp, 'a', 'token'))
    const b = loadOrCreateToken(path.join(tmp, 'b', 'token'))
    expect(a).not.toBe(b)
  })
})
