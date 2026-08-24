// safeResolve：/api/file /api/asset 的路径逃逸防护唯一实现（02-后端执行方案.md §2.1，沿 ADR 决策5）。
import fs from 'node:fs'
import path from 'node:path'

export interface SafeResolveOptions {
  /** 允许的目录白名单（相对 root），额外允许单文件路径见 allowFiles。 */
  allowDirs: string[]
  /** 允许的单文件路径（相对 root）。 */
  allowFiles?: string[]
  /** 允许的扩展名（含点，小写）。 */
  allowExt: string[]
}

export type SafeResolveResult = { ok: true; abs: string } | { ok: false; reason: 'forbidden' | 'not_found' }

/**
 * 校验 `relPath`（仓库相对路径）落在白名单目录/文件内且扩展名合法，返回真实路径（realpath 复核防符号链接逃逸）。
 * 顺序：拒绝空/绝对路径穿越 → path.resolve 落点必须在 root 内 → 命中白名单目录或文件 → 扩展名白名单 →
 * 若文件存在则 realpath 复核前缀仍在 root 内（symlink 逃逸的最后一道）。
 */
export function safeResolve(root: string, relPath: string, opts: SafeResolveOptions): SafeResolveResult {
  if (!relPath || relPath.trim() === '') return { ok: false, reason: 'forbidden' }
  // 拒绝显式绝对路径输入（仅接受仓库相对路径语义）
  if (path.isAbsolute(relPath)) return { ok: false, reason: 'forbidden' }

  const rootAbs = path.resolve(root)
  const targetAbs = path.resolve(rootAbs, relPath)

  // 必须仍落在 root 内（防 ../../ 穿越）
  const rootWithSep = rootAbs.endsWith(path.sep) ? rootAbs : rootAbs + path.sep
  if (targetAbs !== rootAbs && !targetAbs.startsWith(rootWithSep)) {
    return { ok: false, reason: 'forbidden' }
  }

  const relFromRoot = path.relative(rootAbs, targetAbs).split(path.sep).join('/')

  const inAllowedDir = opts.allowDirs.some((d) => {
    const norm = d.replace(/\/+$/, '')
    return relFromRoot === norm || relFromRoot.startsWith(`${norm}/`)
  })
  const inAllowedFile = (opts.allowFiles ?? []).some((f) => relFromRoot === f)
  if (!inAllowedDir && !inAllowedFile) return { ok: false, reason: 'forbidden' }

  const ext = path.extname(targetAbs).toLowerCase()
  if (!opts.allowExt.includes(ext)) return { ok: false, reason: 'forbidden' }

  if (!fs.existsSync(targetAbs)) return { ok: false, reason: 'not_found' }

  // realpath 复核：symlink 最终落点仍须在 root 内
  let real: string
  try {
    real = fs.realpathSync(targetAbs)
  } catch {
    return { ok: false, reason: 'not_found' }
  }
  const realRootAbs = fs.realpathSync(rootAbs)
  const realRootWithSep = realRootAbs.endsWith(path.sep) ? realRootAbs : realRootAbs + path.sep
  if (real !== realRootAbs && !real.startsWith(realRootWithSep)) {
    return { ok: false, reason: 'forbidden' }
  }

  return { ok: true, abs: targetAbs }
}
