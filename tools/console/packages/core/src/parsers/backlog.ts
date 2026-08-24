// content/_backlog/backlog.yaml 解析（01-CLI执行方案.md §2.14 / §2.15 点 5）。
import { parseDocument } from 'yaml'
import type { Document, YAMLMap, YAMLSeq } from 'yaml'
import { isMap, isSeq } from 'yaml'
import { BACKLOG_STATUS_ORDER } from '../types.js'
import type { BacklogStatus, BacklogTopic } from '../types.js'

export interface ParsedBacklog {
  doc: Document
  nextUp: string | null
  topics: BacklogTopic[]
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim() !== ''
}

function toStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.map((x) => String(x)) : []
}

export function parseBacklogFile(raw: string): ParsedBacklog {
  const doc = parseDocument(raw)
  if (doc.errors.length > 0) {
    throw new Error(`backlog.yaml YAML 解析失败: ${doc.errors[0]!.message}`)
  }

  const obj = (doc.toJS() ?? {}) as Record<string, unknown>
  const nextUp = isNonEmptyString(obj.next_up) ? obj.next_up : null

  const rawTopics = Array.isArray(obj.topics) ? (obj.topics as Record<string, unknown>[]) : []
  const topics: BacklogTopic[] = rawTopics.map((t) => {
    const status: BacklogStatus =
      typeof t.status === 'string' && (BACKLOG_STATUS_ORDER as string[]).includes(t.status)
        ? (t.status as BacklogStatus)
        : 'idea'
    const scores =
      t.scores !== null && typeof t.scores === 'object' ? (t.scores as Record<string, number>) : null
    const metrics =
      t.metrics !== null && typeof t.metrics === 'object' ? (t.metrics as Record<string, unknown>) : {}
    return {
      id: isNonEmptyString(t.id) ? t.id : '',
      title: isNonEmptyString(t.title) ? t.title : '',
      alt_titles: toStringArray(t.alt_titles),
      track: t.track === 'traffic' ? 'traffic' : 'depth',
      format: t.format === 'tuwen' ? 'tuwen' : 'kouban',
      status,
      content_path: isNonEmptyString(t.content_path) ? t.content_path : null,
      score: typeof t.score === 'number' ? t.score : null,
      tier: isNonEmptyString(t.tier) ? t.tier : null,
      scores,
      urgency: t.urgency === 'today' ? 'today' : 'queue',
      reason: typeof t.reason === 'string' ? t.reason : '',
      links: toStringArray(t.links),
      tags: toStringArray(t.tags),
      created: isNonEmptyString(t.created) ? t.created : '',
      metrics,
      plan_file: isNonEmptyString(t.plan_file) ? t.plan_file : null,
    }
  })

  return { doc, nextUp, topics }
}

/** 按 id 定位 topics 序列中的条目节点（禁按数组下标定位——§2.15 点 5）。 */
export function findTopicNode(doc: Document, id: string): YAMLMap | null {
  const seq = doc.getIn(['topics']) as unknown
  if (!isSeq(seq)) return null
  for (const item of (seq as YAMLSeq).items) {
    if (isMap(item) && (item as YAMLMap).get('id') === id) return item as YAMLMap
  }
  return null
}
