// 运行时配置解析（02-后端执行方案.md §2.8 / 上游拍板 §11）。
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// packages/server/dist/config.js → 上 3 层 = tools/console/（dist→server→packages→console）。
// 与 cli/src/common.ts 的 CONSOLE_ROOT 定位手法一致（§2.17 同款坑：dist 相对层数固定住，此前误写成 2 层，
// 真实起服务验证时发现 .runtime/ 落错目录才抓出来）。
function resolveConsoleRoot(): string {
  const here = path.dirname(fileURLToPath(import.meta.url))
  return path.resolve(here, '../../..')
}

export interface Config {
  /** tools/console 仓根（server 自身与 .runtime/、logs/ 的落点）。 */
  consoleRoot: string
  /** 主仓根（PIPELINE_REPO_ROOT；默认 = consoleRoot 上两级）。 */
  repoRoot: string
  port: number
  /** media 可执行文件；默认 "media"（PATH 需 npm link），兜底绝对路径见 resolveMediaBin。 */
  mediaBin: string
  tokenPath: string
}

/** `media` bin 解析：优先 env MEDIA_BIN；否则默认裸命令 "media"（PATH 差异对策见 execMedia 侧的 ENOENT 兜底重试）。 */
function resolveMediaBin(consoleRoot: string): string {
  if (process.env.MEDIA_BIN) return process.env.MEDIA_BIN
  return 'media'
}

export function loadConfig(): Config {
  const consoleRoot = resolveConsoleRoot()
  const repoRoot = process.env.PIPELINE_REPO_ROOT
    ? path.resolve(process.env.PIPELINE_REPO_ROOT)
    : path.resolve(consoleRoot, '../..')
  const port = process.env.CONSOLE_PORT ? Number(process.env.CONSOLE_PORT) : 5170
  return {
    consoleRoot,
    repoRoot,
    port,
    mediaBin: resolveMediaBin(consoleRoot),
    tokenPath: path.join(consoleRoot, '.runtime', 'token'),
  }
}

/** cli/dist/index.js 的绝对路径兜底（PATH 里没有 `media` 时用，02 §2.8）。 */
export function mediaBinFallback(consoleRoot: string): string {
  return path.join(consoleRoot, 'packages/cli/dist/index.js')
}

/** token 生成/复用：已存在则读取复用（跨重启稳定），否则新生成并落盘 0600（02 §2.0）。 */
export function loadOrCreateToken(tokenPath: string): string {
  if (fs.existsSync(tokenPath)) {
    const existing = fs.readFileSync(tokenPath, 'utf8').trim()
    if (existing.length > 0) return existing
  }
  const token = crypto.randomBytes(24).toString('base64url')
  fs.mkdirSync(path.dirname(tokenPath), { recursive: true })
  fs.writeFileSync(tokenPath, token, { mode: 0o600 })
  fs.chmodSync(tokenPath, 0o600)
  return token
}
