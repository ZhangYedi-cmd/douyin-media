// 领域类型唯一定义处（01-CLI执行方案.md §2.14）。
// server/ui 对本包只做 type-only import（总览契约 6），故本文件字段形状即三方契约。

export type MetaStatus =
  | 'ideated'
  | 'drafting'
  | 'review'
  | 'approved'
  | 'scheduled'
  | 'published'
  | 'retro_done'
  | 'rejected'

export type BacklogStatus = 'idea' | 'picked' | 'published' | 'expired' | 'rejected' | 'archived'

// 状态机顺序唯一定义处：既用于 union 类型也用于运行时遍历（parsers 的已知键校验、writer 的新键插入锚点）。
export const META_STATUS_ORDER: readonly MetaStatus[] = [
  'ideated',
  'drafting',
  'review',
  'approved',
  'scheduled',
  'published',
  'retro_done',
  'rejected',
]

export const BACKLOG_STATUS_ORDER: readonly BacklogStatus[] = [
  'idea',
  'picked',
  'published',
  'expired',
  'rejected',
  'archived',
]

export interface ContentMeta {
  slug: string
  title: string
  type: 'kouban' | 'tuwen' | null
  pillar: 'depth' | 'traffic' | null
  status: MetaStatus
  source: string | null
  schedule: string | null
  publish_url: string | null
  timestamps: Partial<Record<MetaStatus, string>>
  blocker: Record<string, unknown>
}

export interface ContentEntry {
  slug: string
  dir: string
  meta: ContentMeta | null
  parseError?: string
  deliverables: { video: boolean; cover: boolean; script: boolean; publish: boolean }
}

export interface BacklogTopic {
  id: string
  title: string
  alt_titles: string[]
  track: 'depth' | 'traffic'
  format: 'kouban' | 'tuwen'
  status: BacklogStatus
  content_path: string | null
  score: number | null
  tier: string | null
  scores: Record<string, number> | null
  urgency: 'queue' | 'today'
  reason: string
  links: string[]
  tags: string[]
  created: string
  metrics: Record<string, unknown>
  /** 系列剧集专用：外部 plan repo 的 epXX 脚本+源码导读路径。非系列条目为 null。
   *  pipeline/2-create.md 输入节：系列剧集用它当 1-brief 等价物，生产仍落本仓，不落外部 repo。 */
  plan_file: string | null
}

export interface HarnessRun {
  ts: string
  task: string
  target?: string
  window?: string
  result?: string
  report?: string
  findings?: number
  applied?: boolean
  [key: string]: unknown
}

export interface MetricsRecord {
  ts: string
  slug: string
  window: '24h' | '72h' | '7d' | string
  actor: string
  data: Record<string, unknown>
}

export interface Snapshot {
  generatedAt: string
  root: string
  contents: ContentEntry[]
  backlog: { nextUp: string | null; topics: BacklogTopic[] }
  harness: HarnessRun[]
  metrics: MetricsRecord[]
  parseErrors: { path: string; error: string }[]
}

// 三方唯一 Alert 定义（2026-08-18 冲突 #4 裁定）：02/03 不得另设本地形状；
// UI 色档由 level 映射（error→danger / warn→warn / info→默认）。
export interface Alert {
  key: string // `<rule>:<subject>`，去抖与列表 key（02 server / 03 AlertCard 共用）
  rule: string
  level: 'error' | 'warn' | 'info'
  subject: string
  message: string
  since?: string
  count?: number // 同类合并计数（>1 时 UI 尾缀 ×N）
  evidencePath?: string // 证据文件仓内相对路径（看板 FileDrawer 打开）
  action?: { label: string; to: string } // 建议动作跳转
}

export interface AuditEntry {
  ts: string
  actor: string
  cmd: string
  argv: string[]
  result: 'ok' | 'error'
  files: { path: string; fields: string[] }[]
  summary?: string
}
