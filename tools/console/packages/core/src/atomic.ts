// 原子落盘：temp-then-rename（拍板 §11.3 / 05 §3 红线 5）。防常驻监听方（chokidar）读到半写文件。
import fs from 'node:fs'
import path from 'node:path'

function tmpName(target: string): string {
  const dir = path.dirname(target)
  const base = path.basename(target)
  return path.join(dir, `.tmp-${base}-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
}

export function writeFileAtomic(filePath: string, text: string): void {
  const tmp = tmpName(filePath)
  fs.writeFileSync(tmp, text, 'utf8')
  fs.renameSync(tmp, filePath)
}

/** 目录级原子创建：整目录先在临时名下拷好，再一次 rename 发布（rename 同文件系统内是原子操作）。 */
export function mkdirCopyAtomic(destDir: string, fromDir: string): void {
  const parent = path.dirname(destDir)
  fs.mkdirSync(parent, { recursive: true })
  const tmp = tmpName(destDir)
  fs.cpSync(fromDir, tmp, { recursive: true })
  fs.renameSync(tmp, destDir)
}
