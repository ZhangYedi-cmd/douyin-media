// 事务写入引擎：全仓唯一落盘实现（01-CLI执行方案.md §2.0 写命令事务序 / §2.14）。
// 只从 '@console/core/writer' 深路径导出——cli 是唯一 import 本文件的包（server 禁止 import，§2.17 包边界）。
//
// 落盘顺序：拿锁 → buildSnapshot → plan(snap) 构建写计划（全部校验在此完成，任一失败 = 零写入）
//   → --dry-run 则打印计划退出 → 内存中算出全部新内容 → 逐文件 temp-then-rename 原子落盘
//   → 重生成 dashboard 机器区（同一事务同一锁内）→ append audit.jsonl → 释放锁 → 跑 check 附尾输出。
import fs from 'node:fs'
import path from 'node:path'
import { parseDocument } from 'yaml'
import type { Document } from 'yaml'
import { acquireLock } from './lock.js'
import { writeFileAtomic } from './atomic.js'
import { appendAudit } from './audit.js'
import { applyEdits } from './yaml-edit.js'
import type { RawEdit } from './yaml-edit.js'
import { buildSnapshot } from './snapshot.js'
import { computeAlerts } from './alerts.js'
import { dashboardPath } from './paths.js'
import { hasAllMarkers, renderZone, replaceZones } from './dashboard.js'
import type { Alert, Snapshot } from './types.js'

// ---- 写面工具重导出：cli 是唯一 import '@console/core/writer' 的包，命令实现需要这些底层原语 ----
export {
  applyEdits,
  appendSeqItems,
  editAppendComment,
  editInsertAfterNode,
  editNodeRange,
  editScalarValue,
  findInsertAnchor,
  formatScalar,
  formatScalarQuoted,
  getMapAnyNode,
  getMapSeqNode,
  getMapValueNode,
} from './yaml-edit.js'
export type { RawEdit, Document, Node, YAMLMap, YAMLSeq, Scalar } from './yaml-edit.js'
export { findTopicNode } from './parsers/backlog.js'
export { parseMetaFile } from './parsers/meta.js'
export { parseBacklogFile } from './parsers/backlog.js'
export { acquireLock } from './lock.js'
export { writeFileAtomic, mkdirCopyAtomic } from './atomic.js'
export { appendAudit, auditLogPath } from './audit.js'

export interface PlannedWrite {
  /** 相对 root 的路径（audit / --json writes / dry-run 展示用）。 */
  path: string
  op: 'yaml-edit' | 'file-write' | 'jsonl-append' | 'mkdir-copy'
  /** dry-run 人读描述；mkdir-copy 用它概述「复制了什么」（新目录没有可 diff 的旧内容）。 */
  describe: string
  /** 该命令允许改动的点位清单——round-trip 测试据此断言 diff ⊆ fields（§2.15 点 7）。 */
  fields: string[]
  /**
   * yaml-edit 专用：在已解析的 Document 上定位节点、算出原始字节区间编辑。
   * 不调用 doc.toString()——见 yaml-edit.ts 头注（R1 实测：真实文件零改动往返在朴素 stringify 路径下 0/25 通过）。
   */
  computeEdits?: (doc: Document, raw: string) => RawEdit[]
  /** file-write 全量新内容 / jsonl-append 待追加的一行（不含尾随换行）。 */
  content?: string
  /** mkdir-copy 源目录（相对 root）。 */
  from?: string
}

export interface WriteSummary {
  path: string
  fields: string[]
  diff?: string
}

export interface TxResult {
  ok: true
  dryRun: boolean
  writes: WriteSummary[]
  alerts: Alert[]
}

export interface TxContext {
  root: string
  consoleRoot: string
  cmd: string
  argv: string[]
  actor: string
  dryRun: boolean
}

function unifiedDiff(relPath: string, before: string, after: string): string {
  const a = before.split('\n')
  const b = after.split('\n')
  let start = 0
  while (start < a.length && start < b.length && a[start] === b[start]) start++
  let endA = a.length
  let endB = b.length
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA--
    endB--
  }
  const removed = a.slice(start, endA)
  const added = b.slice(start, endB)
  const lines = [`--- a/${relPath}`, `+++ b/${relPath}`, `@@ -${start + 1},${removed.length} +${start + 1},${added.length} @@`]
  for (const l of removed) lines.push(`-${l}`)
  for (const l of added) lines.push(`+${l}`)
  return lines.join('\n')
}

export function runTransaction(ctx: TxContext, plan: (snap: Snapshot) => PlannedWrite[]): TxResult {
  const { release, preempted } = acquireLock(ctx.root, ctx.cmd)
  try {
    const snap = buildSnapshot(ctx.root)
    // 全部校验在 plan() 内完成：非法状态 / 参数在这里抛 MediaError，下面任何一行都不会执行到——零写入。
    const writes = plan(snap)

    const stagedDirs: { finalAbs: string; stagingAbs: string }[] = []
    const resolveActual = (relPath: string): string => {
      const abs = path.join(ctx.root, relPath)
      for (const s of stagedDirs) {
        if (abs === s.finalAbs || abs.startsWith(s.finalAbs + path.sep)) {
          return s.stagingAbs + abs.slice(s.finalAbs.length)
        }
      }
      return abs
    }

    if (!ctx.dryRun) {
      for (const w of writes) {
        if (w.op !== 'mkdir-copy') continue
        const finalAbs = path.join(ctx.root, w.path)
        const fromAbs = path.join(ctx.root, w.from!)
        const stagingAbs = `${finalAbs}.tmp-${process.pid}-${Date.now()}`
        fs.mkdirSync(path.dirname(finalAbs), { recursive: true })
        fs.cpSync(fromAbs, stagingAbs, { recursive: true })
        stagedDirs.push({ finalAbs, stagingAbs })
      }
    }

    const fileWrites: { targetAbs: string; content: string }[] = []
    const writeSummaries: WriteSummary[] = []

    for (const w of writes) {
      if (w.op === 'mkdir-copy') {
        writeSummaries.push({ path: w.path, fields: w.fields, diff: ctx.dryRun ? w.describe : undefined })
        continue
      }

      if (w.op === 'yaml-edit') {
        let raw: string
        let actualAbs: string
        if (ctx.dryRun) {
          actualAbs = path.join(ctx.root, w.path)
          if (!fs.existsSync(actualAbs)) {
            // 该文件靠同一计划里的 mkdir-copy 尚未真正发生而产生——预演读 from 目录里的同名文件
            const owner = writes.find((x) => x.op === 'mkdir-copy' && w.path.startsWith(`${x.path}/`))
            if (!owner) throw new Error(`writer: yaml-edit 目标 ${w.path} 不存在且找不到对应 mkdir-copy 计划`)
            const relInside = w.path.slice(owner.path.length + 1)
            raw = fs.readFileSync(path.join(ctx.root, owner.from!, relInside), 'utf8')
          } else {
            raw = fs.readFileSync(actualAbs, 'utf8')
          }
        } else {
          actualAbs = resolveActual(w.path)
          raw = fs.readFileSync(actualAbs, 'utf8')
        }
        const doc = parseDocument(raw)
        const edits = w.computeEdits!(doc, raw)
        const newContent = applyEdits(raw, edits)
        if (!ctx.dryRun) fileWrites.push({ targetAbs: actualAbs, content: newContent })
        writeSummaries.push({ path: w.path, fields: w.fields, diff: ctx.dryRun ? unifiedDiff(w.path, raw, newContent) : undefined })
        continue
      }

      if (w.op === 'file-write') {
        const actualAbs = ctx.dryRun ? path.join(ctx.root, w.path) : resolveActual(w.path)
        if (!ctx.dryRun) {
          fileWrites.push({ targetAbs: actualAbs, content: w.content! })
        } else {
          const before = fs.existsSync(actualAbs) ? fs.readFileSync(actualAbs, 'utf8') : ''
          writeSummaries.push({ path: w.path, fields: w.fields, diff: unifiedDiff(w.path, before, w.content ?? '') })
          continue
        }
        writeSummaries.push({ path: w.path, fields: w.fields })
        continue
      }

      // jsonl-append
      const actualAbs = ctx.dryRun ? path.join(ctx.root, w.path) : resolveActual(w.path)
      writeSummaries.push({ path: w.path, fields: w.fields, diff: ctx.dryRun ? `+1 line: ${w.content}` : undefined })
      if (!ctx.dryRun) {
        const existing = fs.existsSync(actualAbs) ? fs.readFileSync(actualAbs, 'utf8') : ''
        const sep = existing.length > 0 && !existing.endsWith('\n') ? '\n' : ''
        fileWrites.push({ targetAbs: actualAbs, content: `${existing}${sep}${w.content}\n` })
      }
    }

    if (ctx.dryRun) {
      return { ok: true, dryRun: true, writes: writeSummaries, alerts: [] }
    }

    for (const fw of fileWrites) writeFileAtomic(fw.targetAbs, fw.content)
    for (const s of stagedDirs) fs.renameSync(s.stagingAbs, s.finalAbs)

    // 重生成 dashboard 机器区（同一事务同一锁内；标记缺失时静默跳过——不是这条命令的错，见 §4 R3）。
    const dashAbs = dashboardPath(ctx.root)
    if (fs.existsSync(dashAbs)) {
      const dashRaw = fs.readFileSync(dashAbs, 'utf8')
      if (hasAllMarkers(dashRaw)) {
        const postWriteSnap = buildSnapshot(ctx.root)
        const now = new Date()
        const alertsForDash = computeAlerts(postWriteSnap, now)
        const newDash = replaceZones(dashRaw, {
          wip: renderZone('wip', postWriteSnap, alertsForDash),
          backlog: renderZone('backlog', postWriteSnap, alertsForDash),
          alerts: renderZone('alerts', postWriteSnap, alertsForDash),
        })
        if (newDash !== dashRaw) {
          writeFileAtomic(dashAbs, newDash)
          writeSummaries.push({ path: path.relative(ctx.root, dashAbs), fields: ['auto:wip', 'auto:backlog', 'auto:alerts'] })
        }
      }
    }

    if (preempted) {
      appendAudit(ctx.consoleRoot, {
        ts: new Date().toISOString(),
        actor: ctx.actor,
        cmd: 'lock-preempt',
        argv: [],
        result: 'ok',
        files: [],
        summary: `抢占陈旧锁 pid=${preempted.pid} cmd=${preempted.cmd} since=${preempted.ts}`,
      })
    }
    appendAudit(ctx.consoleRoot, {
      ts: new Date().toISOString(),
      actor: ctx.actor,
      cmd: ctx.cmd,
      argv: ctx.argv,
      result: 'ok',
      files: writeSummaries.map((w) => ({ path: w.path, fields: w.fields })),
    })

    const finalSnap = buildSnapshot(ctx.root)
    const alerts = computeAlerts(finalSnap, new Date())

    return { ok: true, dryRun: false, writes: writeSummaries, alerts }
  } catch (err) {
    appendAudit(ctx.consoleRoot, {
      ts: new Date().toISOString(),
      actor: ctx.actor,
      cmd: ctx.cmd,
      argv: ctx.argv,
      result: 'error',
      files: [],
      summary: err instanceof Error ? err.message : String(err),
    })
    throw err
  } finally {
    release()
  }
}
