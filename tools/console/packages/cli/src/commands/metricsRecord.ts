// media metrics record <slug> --window <24h|72h|7d> --json-data '<payload>'（01-CLI执行方案.md §2.13）。
// 复盘拉数落账：append harness/logs/metrics.jsonl 一行 + 仅 7d 回填 backlog.metrics。写事务。
import path from 'node:path'
import type { Command } from 'commander'
import { MediaError, metricsLogPath } from '@console/core'
import type { Snapshot } from '@console/core'
import { runTransaction } from '@console/core/writer'
import { editNodeRange, formatScalarQuoted, getMapAnyNode, findInsertAnchor, editInsertAfterNode, findTopicNode } from '@console/core/writer'
import type { PlannedWrite } from '@console/core/writer'
import { addWriteOptions, getActor, getConsoleRoot, getRoot } from '../common.js'
import { emitErr, emitOk } from '../envelope.js'

const KNOWN_WINDOWS = ['24h', '72h', '7d'] as const
const RELATIVE_BACKLOG = 'content/_backlog/backlog.yaml'
const CANONICAL_TOPIC_ORDER = [
  'id', 'title', 'alt_titles', 'track', 'format', 'status', 'content_path',
  'score', 'tier', 'scores', 'urgency', 'reason', 'links', 'tags', 'created', 'metrics',
]

function isoWithOffset(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  const offsetMin = -d.getTimezoneOffset()
  const sign = offsetMin >= 0 ? '+' : '-'
  const abs = Math.abs(offsetMin)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
}

/** payload flow map 渲染：数字/布尔/null 裸写，字符串强制双引号，嵌套结构退化用 yaml 自身 flow 序列化。 */
function renderFlowValue(v: unknown): string {
  if (v === null || v === undefined) return 'null'
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  if (typeof v === 'string') return formatScalarQuoted(v)
  if (Array.isArray(v)) return `[${v.map(renderFlowValue).join(', ')}]`
  if (typeof v === 'object') return renderFlowMap(v as Record<string, unknown>)
  return formatScalarQuoted(String(v))
}

function renderFlowMap(obj: Record<string, unknown>): string {
  const parts = Object.entries(obj).map(([k, v]) => `${k}: ${renderFlowValue(v)}`)
  return `{${parts.join(', ')}}`
}

export function registerMetricsRecord(metricsGroup: Command): void {
  const cmd = metricsGroup.command('record <slug>').description('复盘拉数落账：append metrics.jsonl（+7d 回填 backlog.metrics，写事务）')
  addWriteOptions(cmd)
  cmd.requiredOption('--window <window>', '24h|72h|7d').requiredOption('--json-data <json>', '创作者中心数据对象（JSON 字符串）')
  cmd.action((slug: string, opts: { root?: string; json?: boolean; dryRun?: boolean; window: string; jsonData: string }) => {
    const json = !!opts.json
    try {
      if (!(KNOWN_WINDOWS as readonly string[]).includes(opts.window)) {
        throw new MediaError('E_BAD_ARG', `--window 须为 24h|72h|7d：${opts.window}`)
      }
      let payload: unknown
      try {
        payload = JSON.parse(opts.jsonData)
      } catch (e) {
        throw new MediaError('E_BAD_ARG', `--json-data 不是合法 JSON：${e instanceof Error ? e.message : String(e)}`)
      }
      if (typeof payload !== 'object' || payload === null || Array.isArray(payload) || Object.keys(payload).length === 0) {
        throw new MediaError('E_BAD_ARG', '--json-data 须为非空 JSON object')
      }
      const payloadObj = payload as Record<string, unknown>

      const root = getRoot(opts)
      const actor = getActor()
      const now = new Date()

      let backlogBackfilled: string | null = null
      let jsonlLine = 0

      const result = runTransaction(
        { root, consoleRoot: getConsoleRoot(), cmd: 'metrics.record', argv: process.argv.slice(2), actor, dryRun: !!opts.dryRun },
        (snap: Snapshot) => {
          const entry = snap.contents.find((c) => c.slug === slug)
          if (!entry || !entry.meta) throw new MediaError('E_NOT_FOUND', `内容条目不存在或解析失败：${slug}`)
          const meta = entry.meta
          if (!['published', 'scheduled', 'retro_done'].includes(meta.status)) {
            throw new MediaError('E_BAD_STATUS', `${slug} 当前状态 ${meta.status}，未发布条目无数可记（须 published/scheduled/retro_done）`)
          }

          jsonlLine = snap.metrics.length + 1
          const record = { ts: isoWithOffset(now), slug, window: opts.window, actor, data: payloadObj }

          const writes: PlannedWrite[] = [
            {
              path: path.relative(root, metricsLogPath(root)),
              op: 'jsonl-append',
              describe: `append metrics.jsonl（${opts.window}）`,
              fields: ['+1 line'],
              content: JSON.stringify(record),
            },
          ]

          if (opts.window === '7d') {
            if (!meta.source) throw new MediaError('E_NOT_FOUND', `${slug} meta.source 为空，7d 回填需要对应 backlog 条目`)
            const topic = snap.backlog.topics.find((t) => t.id === meta.source)
            if (!topic) throw new MediaError('E_NOT_FOUND', `backlog 查无 source 对应条目：${meta.source}`)
            backlogBackfilled = topic.id
            writes.push({
              path: RELATIVE_BACKLOG,
              op: 'yaml-edit',
              describe: `backlog(${topic.id}).metrics 回填`,
              fields: [`topics[${topic.id}].metrics`],
              computeEdits: (doc, raw) => {
                const node = findTopicNode(doc, topic.id)
                if (!node) throw new MediaError('E_NOT_FOUND', `写入时 backlog 条目消失：${topic.id}`)
                const replacement = renderFlowMap(payloadObj)
                const metricsNode = getMapAnyNode(node, 'metrics')
                if (metricsNode) return [editNodeRange(metricsNode, replacement)]
                const anchor = findInsertAnchor(node, CANONICAL_TOPIC_ORDER, 'metrics')
                if (!anchor) throw new MediaError('E_SCHEMA', `backlog(${topic.id}) 缺少插入锚点，无法新增 metrics 字段`)
                return [editInsertAfterNode(raw, anchor, `    metrics: ${replacement}\n`)]
              },
            })
          }

          return writes
        },
      )

      const data = { slug, window: opts.window, jsonlLine, backlogBackfilled }
      emitOk(
        'metrics.record',
        json,
        data,
        () => {
          console.log(result.dryRun ? '（dry-run）' : `已记账：${slug} window=${opts.window}`)
          for (const w of result.writes) console.log(`  ${w.path}`)
        },
        { writes: result.writes, alerts: result.alerts },
      )
    } catch (err) {
      emitErr('metrics.record', json, err)
    }
  })
}
