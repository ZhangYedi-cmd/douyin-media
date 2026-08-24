// media backlog sweep [--dry-run|--apply]（01-CLI执行方案.md §2.9）。机械规则清扫。写事务
// （CLAUDE.md 记账例外：规则化清扫视同记账）。缺省 --apply 走 dry-run——批量翻状态，安全默认朝只读倾斜。
import type { Command } from 'commander'
import { DEFAULT_ALERT_CFG, MediaError, expireRules } from '@console/core'
import type { AlertCfg, BacklogTopic, ExpireMatch, Snapshot } from '@console/core'
import { runTransaction } from '@console/core/writer'
import { editAppendComment, editScalarValue, findTopicNode, getMapValueNode } from '@console/core/writer'
import type { PlannedWrite } from '@console/core/writer'
import { addWriteOptions, getActor, getConsoleRoot, getRoot } from '../common.js'
import { emitErr, emitOk } from '../envelope.js'

const RELATIVE_BACKLOG = 'content/_backlog/backlog.yaml'

function today(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** JSON `rule` 字段用编码形式（`today>2d` / `timeliness4>7d`），与 --expiring 的 ExpiryPreview.rule 同形态；
 *  文件留痕注释用 ExpireMatch.ruleName 的中文描述（§2.9 示例 `# <date> 过期清扫(机械规则): <规则名>`）。 */
function codedRule(m: ExpireMatch, cfg: AlertCfg): string {
  return m.rule === 'R1' ? `today>${cfg.expireTodayDays}d` : `timeliness4>${cfg.expireTimelinessDays}d`
}

export function registerBacklogSweep(backlogGroup: Command): void {
  const cmd = backlogGroup.command('sweep').description('机械规则清扫 idea→expired（写事务；缺省 dry-run，--apply 才落盘）')
  addWriteOptions(cmd)
  cmd.option('--apply', '落盘（缺省 dry-run，二者二选一）')
  cmd.action((opts: { root?: string; json?: boolean; dryRun?: boolean; apply?: boolean }) => {
    const json = !!opts.json
    try {
      const root = getRoot(opts)
      const dryRun = !opts.apply // 无 flag 或显式 --dry-run 都归 dry-run；只有 --apply 才真落盘
      const cfg = DEFAULT_ALERT_CFG
      const stampDate = today()

      let expiredList: { id: string; title: string; rule: string; created: string }[] = []

      const result = runTransaction(
        { root, consoleRoot: getConsoleRoot(), cmd: 'backlog.sweep', argv: process.argv.slice(2), actor: getActor(), dryRun },
        (snap: Snapshot) => {
          expiredList = []
          const now = new Date()
          const hits: { topic: BacklogTopic; match: ExpireMatch }[] = []
          for (const t of snap.backlog.topics) {
            const matches = expireRules(t, now, cfg)
            if (matches.length > 0) hits.push({ topic: t, match: matches[0]! })
          }
          if (hits.length === 0) return []

          for (const h of hits) {
            expiredList.push({ id: h.topic.id, title: h.topic.title, rule: codedRule(h.match, cfg), created: h.topic.created })
          }

          const write: PlannedWrite = {
            path: RELATIVE_BACKLOG,
            op: 'yaml-edit',
            describe: `过期清扫（机械规则）：${hits.length} 条 idea→expired`,
            fields: ['topics[].status'],
            computeEdits: (doc, raw) => {
              const edits = []
              for (const h of hits) {
                const node = findTopicNode(doc, h.topic.id)
                // §2.9 失败行为：--apply 中途任一条目定位失败 → 整批零写入 exit 1（此处抛出，runTransaction 尚未落盘任何文件）
                if (!node) throw new MediaError('E_NOT_FOUND', `写入时 backlog 条目消失：${h.topic.id}`)
                const statusNode = getMapValueNode(node, 'status')!
                edits.push(editScalarValue(raw, statusNode, 'expired'))
                edits.push(editAppendComment(raw, statusNode, `${stampDate} 过期清扫(机械规则): ${h.match.ruleName}`))
              }
              return edits
            },
          }
          return [write]
        },
      )

      const data = { dryRun: result.dryRun, expired: expiredList, count: expiredList.length }
      emitOk(
        'backlog.sweep',
        json,
        data,
        () => {
          console.log(result.dryRun ? `（dry-run）命中 ${expiredList.length} 条` : `已清扫 ${expiredList.length} 条`)
          for (const e of expiredList) console.log(`  ${e.id}  ${e.rule}  ${e.title}`)
        },
        { writes: result.writes, alerts: result.alerts },
      )
    } catch (err) {
      emitErr('backlog.sweep', json, err)
    }
  })
}
