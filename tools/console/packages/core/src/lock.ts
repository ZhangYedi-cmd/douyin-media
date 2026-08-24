// 咨询锁：多写者互斥，拿不到锁直接报错退出，不排队（拍板 §11.1；位置/陈旧阈值见 §4 待定项 Q7「按预设」）。
import fs from 'node:fs'
import path from 'node:path'
import { MediaError } from './errors.js'

export interface LockInfo {
  pid: number
  ts: string
  cmd: string
}

export type Release = () => void

export interface AcquireResult {
  release: Release
  /** 非 null 表示本次拿锁前抢占了一把陈旧锁（进程已不存活、超过阈值未释放）——调用方应记一笔 audit（R5）。 */
  preempted: LockInfo | null
}

const STALE_MS = 30_000

function isPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch (err: unknown) {
    return (err as NodeJS.ErrnoException).code === 'EPERM'
  }
}

export function lockPath(root: string): string {
  return path.join(root, '.media.lock')
}

export function acquireLock(root: string, cmd: string): AcquireResult {
  const p = lockPath(root)
  const info: LockInfo = { pid: process.pid, ts: new Date().toISOString(), cmd }

  const tryCreate = (): boolean => {
    try {
      const fd = fs.openSync(p, 'wx')
      fs.writeFileSync(fd, JSON.stringify(info))
      fs.closeSync(fd)
      return true
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code === 'EEXIST') return false
      throw err
    }
  }

  if (tryCreate()) {
    return { release: () => release(p), preempted: null }
  }

  let existing: LockInfo | null = null
  try {
    existing = JSON.parse(fs.readFileSync(p, 'utf8')) as LockInfo
  } catch {
    // 锁文件存在但读不出结构——按不可判定处理，不做陈旧抢占（宁可保守报错）
  }

  const staleByTime = existing ? Date.now() - new Date(existing.ts).getTime() > STALE_MS : false
  const staleByPid = existing ? !isPidAlive(existing.pid) : false

  if (existing && staleByTime && staleByPid) {
    process.stderr.write(
      `⚠ 抢占陈旧锁：pid=${existing.pid} cmd=${existing.cmd} since=${existing.ts}（进程已不存活，超过 ${STALE_MS}ms 未释放）\n`,
    )
    fs.unlinkSync(p)
    if (tryCreate()) {
      return { release: () => release(p), preempted: existing }
    }
  }

  throw new MediaError(
    'E_LOCKED',
    existing
      ? `锁被占用：pid=${existing.pid} cmd=${existing.cmd} since=${existing.ts}`
      : '锁文件存在但无法解析，另一进程可能正在写入',
  )
}

function release(p: string): void {
  try {
    fs.unlinkSync(p)
  } catch {
    // 锁已被清理（如被陈旧抢占逻辑移除）——幂等，忽略
  }
}
