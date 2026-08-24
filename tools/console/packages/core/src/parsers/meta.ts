// content/<date>/<slug>/meta.yaml 解析（01-CLI执行方案.md §2.14）。
// 只读：把 Document 转 JS 摘要供 snapshot/state/alerts 消费；Document 本体留给 writer.ts 做点位编辑。
// 解析失败降级：调用方（snapshot.ts）catch 住本函数抛出的 Error，记 parseError，不抛穿（拍板 §3）。
import { parseDocument } from 'yaml'
import type { Document } from 'yaml'
import { META_STATUS_ORDER } from '../types.js'
import type { ContentMeta, MetaStatus } from '../types.js'

export interface ParsedMeta {
  doc: Document
  meta: ContentMeta
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim() !== ''
}

export function parseMetaFile(raw: string, filePath: string): ParsedMeta {
  const doc = parseDocument(raw)
  if (doc.errors.length > 0) {
    throw new Error(`${filePath} YAML 解析失败: ${doc.errors[0]!.message}`)
  }

  const obj = (doc.toJS() ?? {}) as Record<string, unknown>

  const statusRaw = obj.status
  const status: MetaStatus =
    typeof statusRaw === 'string' && (META_STATUS_ORDER as string[]).includes(statusRaw)
      ? (statusRaw as MetaStatus)
      : 'ideated'

  const timestampsRaw = (obj.timestamps ?? {}) as Record<string, unknown>
  const timestamps: Partial<Record<MetaStatus, string>> = {}
  for (const key of META_STATUS_ORDER) {
    const v = timestampsRaw[key]
    if (isNonEmptyString(v)) timestamps[key] = v
  }

  const blockerRaw = obj.blocker
  const blocker: Record<string, unknown> =
    blockerRaw !== null && typeof blockerRaw === 'object' ? (blockerRaw as Record<string, unknown>) : {}

  const meta: ContentMeta = {
    slug: isNonEmptyString(obj.slug) ? obj.slug : '',
    title: isNonEmptyString(obj.title) ? obj.title : '',
    type: obj.type === 'kouban' || obj.type === 'tuwen' ? obj.type : null,
    pillar: obj.pillar === 'depth' || obj.pillar === 'traffic' ? obj.pillar : null,
    status,
    source: isNonEmptyString(obj.source) ? obj.source : null,
    schedule: isNonEmptyString(obj.schedule) ? obj.schedule : null,
    publish_url: isNonEmptyString(obj.publish_url) ? obj.publish_url : null,
    timestamps,
    blocker,
  }

  return { doc, meta }
}
