// media flip <slug> <status>（01-CLI执行方案.md §2.6）。meta 状态翻转 + 时间戳。写事务。
import path from 'node:path'
import type { Command } from 'commander'
import { MediaError, META_STATUS_ORDER, assertMetaTransition, findContentDirBySlug, renderTransitionTable } from '@console/core'
import type { MetaStatus, Snapshot } from '@console/core'
import { runTransaction } from '@console/core/writer'
import { editAppendComment, editInsertAfterNode, editScalarValue, getMapValueNode } from '@console/core/writer'
import type { PlannedWrite, YAMLMap } from '@console/core/writer'
import { addWriteOptions, getActor, getConsoleRoot, getRoot } from '../common.js'
import { emitErr, emitOk } from '../envelope.js'

function nowStamp(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function registerFlip(program: Command): void {
  const cmd = program.command('flip <slug> <status>').description('meta 状态翻转 + 时间戳（写事务）')
  addWriteOptions(cmd)
  cmd.option('--reason <text>', 'rejected 必填：写入 status 行尾注释')
  cmd.addHelpText('after', `\n${renderTransitionTable()}\n`)
  cmd.action((slug: string, status: string, opts: { root?: string; json?: boolean; dryRun?: boolean; reason?: string }) => {
    const json = !!opts.json
    try {
      if (!(META_STATUS_ORDER as readonly string[]).includes(status)) {
        throw new MediaError('E_BAD_ARG', `未知状态：${status}（合法值：${META_STATUS_ORDER.join('|')}）`)
      }
      const targetStatus = status as MetaStatus

      const root = getRoot(opts)
      let fromStatus = ''

      const result = runTransaction(
        { root, consoleRoot: getConsoleRoot(), cmd: 'flip', argv: process.argv.slice(2), actor: getActor(), dryRun: !!opts.dryRun },
        (snap: Snapshot) => {
          const entry = snap.contents.find((c) => c.slug === slug)
          if (!entry || !entry.meta) throw new MediaError('E_NOT_FOUND', `内容条目不存在或解析失败：${slug}`)
          const meta = entry.meta
          fromStatus = meta.status

          const spec = assertMetaTransition(meta.status, targetStatus)
          if (spec.viaCommand !== 'flip') {
            throw new MediaError(
              'E_ILLEGAL_TRANSITION',
              `${meta.status} → ${targetStatus} 须走 media publish-done（三翻齐事务）；flip 只做单文件状态迁移`,
              { rule: 'state:meta' },
            )
          }
          if (spec.requiresReason && !opts.reason) {
            throw new MediaError('E_MISSING_REASON', `${meta.status} → ${targetStatus} 需要 --reason`)
          }

          const dirAbs = findContentDirBySlug(root, slug)
          if (!dirAbs) throw new MediaError('E_NOT_FOUND', `定位不到内容目录：${slug}`)
          const relMeta = path.relative(root, path.join(dirAbs, 'meta.yaml'))
          const stamp = nowStamp()

          const write: PlannedWrite = {
            path: relMeta,
            op: 'yaml-edit',
            describe: `status ${meta.status}→${targetStatus}`,
            fields: ['status', `timestamps.${targetStatus}`, ...(opts.reason ? ['status#comment'] : [])],
            computeEdits: (doc, raw) => {
              const map = doc.contents as YAMLMap
              const statusNode = getMapValueNode(map, 'status')!
              const edits = [editScalarValue(raw, statusNode, targetStatus)]
              if (opts.reason) {
                edits.push(editAppendComment(raw, statusNode, `${nowStamp().slice(0, 10)} ${opts.reason}`))
              }
              const ts = doc.getIn(['timestamps']) as YAMLMap | undefined
              if (ts) {
                const existingTsNode = getMapValueNode(ts, targetStatus)
                if (existingTsNode) {
                  // 已有值不覆盖——首次时间为准，重入历史靠 audit.jsonl（§2.6）
                  const raw0 = existingTsNode.range![0]
                  const raw1 = existingTsNode.range![1]
                  const alreadyStamped = raw0 !== raw1
                  if (!alreadyStamped) edits.push(editScalarValue(raw, existingTsNode, stamp))
                } else {
                  const idx = META_STATUS_ORDER.indexOf(targetStatus)
                  let anchor: ReturnType<typeof getMapValueNode> | undefined
                  for (let i = idx - 1; i >= 0; i--) {
                    anchor = getMapValueNode(ts, META_STATUS_ORDER[i]!)
                    if (anchor) break
                  }
                  if (anchor) edits.push(editInsertAfterNode(raw, anchor, `  ${targetStatus}: ${stamp}\n`))
                }
              }
              return edits
            },
          }
          return [write]
        },
      )

      const data = { slug, from: fromStatus, to: targetStatus, stamped: nowStamp() }
      emitOk(
        'flip',
        json,
        data,
        () => {
          console.log(result.dryRun ? '（dry-run）' : `flip 完成：${slug} ${fromStatus} → ${targetStatus}`)
          for (const w of result.writes) console.log(`  ${w.path}`)
        },
        { writes: result.writes, alerts: result.alerts },
      )
    } catch (err) {
      emitErr('flip', json, err)
    }
  })
}
