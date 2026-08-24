// media backlog apply <id> --action <merge|archive> --proposal <path>（01-CLI执行方案.md §2.10）。
// 落地 backlog-gardener 人审通过的提议。写事务。
import fs from 'node:fs'
import path from 'node:path'
import type { Command } from 'commander'
import { MediaError } from '@console/core'
import type { Snapshot } from '@console/core'
import { runTransaction } from '@console/core/writer'
import {
  appendSeqItems,
  editAppendComment,
  editInsertAfterNode,
  editScalarValue,
  findInsertAnchor,
  findTopicNode,
  formatScalarQuoted,
  getMapSeqNode,
  getMapValueNode,
} from '@console/core/writer'
import type { PlannedWrite, RawEdit, YAMLMap } from '@console/core/writer'
import { addWriteOptions, getActor, getConsoleRoot, getRoot } from '../common.js'
import { emitErr, emitOk } from '../envelope.js'

const RELATIVE_BACKLOG = 'content/_backlog/backlog.yaml'
// backlog 条目字段书写顺序（真实仓 fixture 逐条对照，供缺失字段时定位插入锚点用；与 backlogAdd.ts 保持一致）。
const CANONICAL_TOPIC_ORDER = [
  'id', 'title', 'alt_titles', 'track', 'format', 'status', 'content_path',
  'score', 'tier', 'scores', 'urgency', 'reason', 'links', 'tags', 'created', 'metrics',
]

function today(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * 把 newItems 去重并入 node[key]（links/alt_titles 这类块状列表）：
 * - 既有字段是非空块状序列：直接 appendSeqItems 追加；
 * - 字段整体缺失（真实仓部分老条目，如系列题，确无 alt_titles 键）：在 canonical 顺序前一个已存在的键之后插入整个新块；
 * - 字段存在但为空/flow 风格（真实仓未见此形态，暂不支持自动合并，明确报错而非产出破损 YAML）。
 */
function mergeSeqField(raw: string, node: YAMLMap, key: string, newItems: string[]): RawEdit[] {
  if (newItems.length === 0) return []
  const seqNode = getMapSeqNode(node, key)
  if (seqNode && seqNode.items.length > 0 && !seqNode.flow) {
    return [appendSeqItems(raw, seqNode, newItems)]
  }
  if (seqNode) {
    throw new MediaError(
      'E_SCHEMA',
      `backlog(${String(node.get('id'))}).${key} 为空或 flow 风格，暂不支持自动合并（需人工处理后重试）`,
    )
  }
  const anchor = findInsertAnchor(node, CANONICAL_TOPIC_ORDER, key)
  if (!anchor) throw new MediaError('E_SCHEMA', `backlog 条目缺少插入锚点，无法新增 ${key} 字段`)
  const block = `    ${key}:\n${newItems.map((it) => `      - ${formatScalarQuoted(it)}\n`).join('')}`
  return [editInsertAfterNode(raw, anchor, block)]
}

export function registerBacklogApply(backlogGroup: Command): void {
  const cmd = backlogGroup.command('apply <id>').description('落地 backlog-gardener 人审通过的提议（merge|archive，写事务）')
  addWriteOptions(cmd)
  cmd
    .requiredOption('--action <action>', 'merge|archive')
    .option('--into <id2>', 'merge 必填：合并目标条目 id')
    .requiredOption('--proposal <path>', 'gardener 报告路径（写入注释可溯源）')
  cmd.action((id: string, opts: { root?: string; json?: boolean; dryRun?: boolean; action: string; into?: string; proposal: string }) => {
    const json = !!opts.json
    try {
      if (opts.action !== 'merge' && opts.action !== 'archive') {
        throw new MediaError('E_BAD_ARG', `--action 须为 merge|archive：${opts.action}`)
      }
      if (opts.action === 'merge' && !opts.into) {
        throw new MediaError('E_BAD_ARG', 'merge 须带 --into <id2>')
      }
      if (opts.action === 'merge' && opts.into === id) {
        throw new MediaError('E_BAD_ARG', '--into 不能等于被处置条目自身')
      }

      const root = getRoot(opts)
      const proposalAbs = path.isAbsolute(opts.proposal) ? opts.proposal : path.join(root, opts.proposal)
      if (!fs.existsSync(proposalAbs)) {
        throw new MediaError('E_NOT_FOUND', `proposal 路径不存在：${opts.proposal}`)
      }
      const proposalRel = path.relative(root, proposalAbs)
      const stampDate = today()

      let absorbed: { links: number; alt_titles: number } | null = null

      const result = runTransaction(
        { root, consoleRoot: getConsoleRoot(), cmd: 'backlog.apply', argv: process.argv.slice(2), actor: getActor(), dryRun: !!opts.dryRun },
        (snap: Snapshot) => {
          const topic = snap.backlog.topics.find((t) => t.id === id)
          if (!topic) throw new MediaError('E_NOT_FOUND', `backlog 条目不存在：${id}`)
          if (topic.status !== 'idea') throw new MediaError('E_BAD_STATUS', `${id} 当前状态 ${topic.status}，backlog apply 仅作用于 status=idea 的条目`)

          let intoTopic: Snapshot['backlog']['topics'][number] | undefined
          if (opts.action === 'merge') {
            intoTopic = snap.backlog.topics.find((t) => t.id === opts.into)
            if (!intoTopic) throw new MediaError('E_NOT_FOUND', `--into 条目不存在：${opts.into}`)
            if (!['idea', 'picked', 'published'].includes(intoTopic.status)) {
              throw new MediaError('E_BAD_STATUS', `--into 条目 ${opts.into} 当前状态 ${intoTopic.status}，不能并入 expired/archived/rejected 条目`)
            }
          }

          const actionText = opts.action === 'merge' ? `merge 并入 ${opts.into}` : 'archive'
          const commentSuffix = `${stampDate} ${actionText}(人审通过): 提议 ${proposalRel}`

          const fields = [`topics[${id}].status`]
          if (opts.action === 'merge') fields.push(`topics[${opts.into}].links`, `topics[${opts.into}].alt_titles`)

          const write: PlannedWrite = {
            path: RELATIVE_BACKLOG,
            op: 'yaml-edit',
            describe: opts.action === 'merge' ? `backlog(${id})→archived，并入 ${opts.into}` : `backlog(${id})→archived`,
            fields,
            computeEdits: (doc, raw) => {
              const node = findTopicNode(doc, id)
              if (!node) throw new MediaError('E_NOT_FOUND', `写入时 backlog 条目消失：${id}`)
              const statusNode = getMapValueNode(node, 'status')!
              const edits = [editScalarValue(raw, statusNode, 'archived'), editAppendComment(raw, statusNode, commentSuffix)]

              if (opts.action === 'merge' && intoTopic) {
                const intoNode = findTopicNode(doc, opts.into!)
                if (!intoNode) throw new MediaError('E_NOT_FOUND', `写入时 --into 条目消失：${opts.into}`)
                const newLinks = topic.links.filter((l) => !intoTopic!.links.includes(l))
                const newAltTitles = topic.alt_titles.filter((t) => !intoTopic!.alt_titles.includes(t))
                absorbed = { links: newLinks.length, alt_titles: newAltTitles.length }
                edits.push(...mergeSeqField(raw, intoNode, 'links', newLinks))
                edits.push(...mergeSeqField(raw, intoNode, 'alt_titles', newAltTitles))
              }
              return edits
            },
          }
          return [write]
        },
      )

      const data = {
        id,
        action: opts.action,
        into: opts.action === 'merge' ? opts.into! : null,
        proposal: proposalRel,
        absorbed,
      }
      emitOk(
        'backlog.apply',
        json,
        data,
        () => {
          console.log(result.dryRun ? '（dry-run）' : `已处置：${id} → archived（${opts.action}）`)
          for (const w of result.writes) console.log(`  ${w.path}`)
        },
        { writes: result.writes, alerts: result.alerts },
      )
    } catch (err) {
      emitErr('backlog.apply', json, err)
    }
  })
}
