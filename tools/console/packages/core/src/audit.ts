// 审计账本：tools/console/logs/audit.jsonl（拍板 §11.2）。全部写者天然经此过闸（放 CLI 而非 server 的理由）。
import fs from 'node:fs'
import path from 'node:path'
import { writeFileAtomic } from './atomic.js'
import type { AuditEntry } from './types.js'

export function auditLogPath(consoleRoot: string): string {
  return path.join(consoleRoot, 'logs', 'audit.jsonl')
}

/** append 一行；红线 3「temp-then-rename」在此实现为「读全量+拼接+整体原子重写」，不用裸 appendFileSync。 */
export function appendAudit(consoleRoot: string, entry: AuditEntry): void {
  const p = auditLogPath(consoleRoot)
  fs.mkdirSync(path.dirname(p), { recursive: true })
  const existing = fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : ''
  const line = JSON.stringify(entry)
  const next = existing.length > 0 && !existing.endsWith('\n') ? `${existing}\n${line}\n` : `${existing}${line}\n`
  writeFileAtomic(p, next)
}
