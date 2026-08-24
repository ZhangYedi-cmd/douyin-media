// API 层类型唯一宿主（02-后端执行方案.md §2.4 / §2.6，2026-08-18 拍板 待定项#3）。
// server → ui 单向 type-only 交接物：ui 对本文件只做 `import type`，不得 import 任何值。
// 领域类型（MetaStatus/Alert/ContentMeta/BacklogTopic/…）唯一真相源仍是 @console/core/src/types.ts，
// 本文件只放「API 传输层」才存在的形状（信封、Job、乙类轨迹派生结果等），不得重复定义领域字段。
import type { Alert, MetaStatus } from '@console/core'
import type { NormEvent } from '@console/cc-stream'

// ---------------------------------------------------------------------------
// 0. 横切信封 / 错误码（02 §2.0）
// ---------------------------------------------------------------------------

/** 全部读接口的响应信封。 */
export interface ApiEnvelope<T> {
  revision: number
  now: string
  data: T
}

/** 4 条快写动作的响应信封（02 §2.0：`result` = media --json 输出透传，`check` = 写后体检摘要）。 */
export interface ActionOkResponse {
  ok: true
  dryRun: boolean
  result: unknown
  check: { errors: number; warns: number; infos: number } | null
}

export type ApiErrorCode =
  | 'AUTH_BAD_TOKEN'
  | 'BAD_PARAM'
  | 'PATH_FORBIDDEN'
  | 'NOT_FOUND'
  | 'MEDIA_REJECTED'
  | 'JOB_DUPLICATE'
  | 'PRECONDITION_FAILED'
  | 'REWORK_LIMIT'
  | 'FILE_TOO_LARGE'
  | 'MEDIA_UNAVAILABLE'
  | 'INTERNAL'

export interface ApiErrorBody {
  error: { code: ApiErrorCode; message: string; detail?: string }
}

// ---------------------------------------------------------------------------
// 1. Job（job runner，02 §2.6）
// ---------------------------------------------------------------------------

// 2026-08-19 增补两型（用户走查提的手动触发能力，总指挥定契约、两个 agent 分头实现）：
// - 'harness-run'：手动跑一个治理任务（对应注册表里有 skill 的行），产报告 + 追加治理账本
// - 'create'：对 ideated 内容手动启动创作，停在出审（绝不发布，铁律见 CLAUDE.md 流程纪律）
export type JobType = 'publish' | 'rework' | 'apply-proposal' | 'harness-run' | 'create'
// 2026-08-19 增补 'cancelled'（看板「取消任务」能力，J 号执行；真实事故起因见 jobs/runner.ts
// cancelJob 头注）：刻意不复用 'failed'——「人主动停的」和「跑挂了的」混在一起，历史区就分不清
// 是需要复盘的故障还是操作员自己按停的，两者对治理线复盘的意义完全不同。
export type JobState = 'queued' | 'running' | 'verifying' | 'succeeded' | 'failed' | 'cancelled'

export interface JobMilestone {
  id: string
  label: string
  at: string
}

/** say 事件只展示、永不驱动状态（cc-stream §7.4 信任分级）。 */
export interface JobNarration {
  messageId: string
  text: string
}

export interface JobVerdict {
  ok: boolean
  metaStatus?: string
  expect?: string[]
  diff?: string
  note?: string
}

export interface Job {
  id: string // `${type}-${yyyyMMddHHmmss}-${4hex}`
  type: JobType
  slug?: string
  /** harness-run 专用：治理任务名（harness/tasks.md 注册表的 task 字段）。 */
  task?: string
  report?: string
  reason?: string
  state: JobState
  milestones: JobMilestone[]
  narration: JobNarration[]
  stalling: boolean
  /**
   * 2026-08-19 增补：取消信号已发出、但 state 还没翻到 'cancelled' 时为 true——running/verifying
   * 场景下杀子进程不是瞬时的（SIGTERM→10s 宽限→SIGKILL），这段过渡期用它让 UI 显示"正在停止"
   * 而不是让「取消」按钮看起来像没反应。终局落定（state 翻到 cancelled）后清空（见 runner.ts runOne）。
   */
  cancelRequested?: boolean
  costUsd?: number
  turns?: number
  durationMs?: number
  startedAt?: string
  endedAt?: string
  verdict?: JobVerdict
  error?: string
  logPath: string
}

/** POST 慢作业成功受理时的 202 响应体。 */
export interface JobSubmittedResponse {
  jobId: string
  statusUrl: string
  sseEvent: string
}

/** GET /api/jobs 出参 data（02 §2.3 增补）。 */
export interface JobsListData {
  active: Job | null
  queued: Job[]
  recent: Job[]
}

/**
 * GET /api/jobs/history?slug=<slug> | ?task=<task> 出参 data（2026-08-19 增补，详情页「执行记录」
 * tab 需求：验收 GET /api/jobs/:id/log 时发现 GET /api/jobs 的 recent 只兜底近 24h 内存表，磁盘全量
 * 重建又只在内存表整体为空时才触发——只要今天跑过任意任务，一周前的历史就永久不可见）。
 *
 * 刻意开新端点、不改 JobsListData.recent 的语义：`recent` 是 JobPanel「近期」列表该显示的东西，
 * 让它意外冒出一周前的任务是另一个 bug，不该借这次修复顺手引入——这个项目已经在「同一份数据
 * 两种口径」上栽过三次跟头（警报区 vs 待我处理、账本 vs 注册表、报告路径归一化），这里不重演第四次。
 */
export interface JobHistoryData {
  jobs: Job[]
}

// 2026-08-19 增补（看板「取消任务」能力，J 号执行）：
// POST /api/jobs/:id/cancel 与 POST /api/jobs/cancel-all 的成功响应体。取消是即时动作、不走
// 202+jobId+SSE 那套慢作业信封（JobSubmittedResponse）——这里直接 200 回真实结果，前端不必
// 另起一条追踪；后续状态变化仍旧全靠既有 SSE `job:<id>` 广播驱动界面刷新。

/** POST /api/jobs/:id/cancel 成功响应：立即回传这条 Job 的最新快照——queued 场景下 state 此时
 *  已经是 'cancelled'；running/verifying 场景下子进程可能还没真正退出，state 仍可能是原状态、
 *  只是 cancelRequested=true（终局翻转以后续 SSE 广播为准，见 jobs/runner.ts cancelJob 头注）。 */
export interface JobCancelResponse {
  ok: true
  job: Job
}

/** POST /api/jobs/cancel-all 成功响应：本次动作影响的任务数——不含此前已在终态（succeeded/
 *  failed/cancelled）的任务，那些本就不受「全部取消」影响。 */
export interface JobCancelAllResponse {
  ok: true
  cancelledQueued: number
  cancelledActive: string | null
}

// 2026-08-19 增补（用户需求"详情页看创作全链路"，K 号执行数据侧；总指挥已在 cc-stream 落地
// NormEvent 的展示字段扩容——thinking/at/toolDone.preview 等，见 @console/cc-stream types.ts）：
// GET /api/jobs/:id/log 回放端点 + job-log:<id> 实时 SSE 广播共用的两个类型。

/** GET /api/jobs/:id/log 出参 data：把 <id>.jsonl 整个文件喂给与实时路径完全相同的
 *  parseStream + createNormalizer 重放一遍（铁律：绝不写第二个解析器，见 routes/jobs.ts 头注），
 *  按到达顺序原样吐出——不分页（总指挥实测：现有归一层已把 350 事件/419KB 压到 107 事件/26KB，
 *  扩容后仍是同量级，一次性返回即可）。 */
export interface JobLogData {
  jobId: string
  events: NormEvent[]
}

/** SSE `job-log:<id>` 广播载荷：单条归一事件 + 序号。
 *
 * 为什么需要 seq：`job:<id>`（既有）是 Job 快照的**全量覆盖**语义——每次都发整个 Job，UI 直接
 * 拿新对象替换旧对象即可，不存在"漏了一条怎么办"的问题。但全链路日志需要的是**追加**语义
 * （像 tail -f 一条条吐出来，UI 应该是往列表末尾 append，不是每次整页重渲染）——这就引出一个
 * 全量快照场景不存在的新问题：客户端如果是"进入详情页时任务已经跑了一半"，需要先拉一次历史
 * （GET /api/jobs/:id/log）再接上后续的 SSE 增量，中间那个时刻边界在哪、会不会重复或漏掉，
 * 光凭 SSE 消息到达顺序本身无法回答。
 *
 * seq 就是这道边界线：它严格等于该事件在同一个 job 的 GET /api/jobs/:id/log 回放数组里的下标——
 * 两条路径（jobs/runner.ts execCcJob 的实时循环、routes/jobs.ts 的回放端点）喂的是同一份
 * <id>.jsonl 文件、走的是同一个 parseStream+createNormalizer，天然按到达顺序对齐编号，不需要
 * 额外同步机制。客户端协议（前端 L 号 agent 落地，这里只需知道契约）：先订阅 SSE 开始缓冲，
 * 再拉一次历史 events（长度记为 N）——历史即 0..N-1；后续 SSE 里 seq < N 的丢弃（已在历史里），
 * seq >= N 的按序 append。 */
export interface JobLogEvent {
  seq: number
  event: NormEvent
}

// ---------------------------------------------------------------------------
// 2. 乙类文件轨迹派生（02 §2.1 DailyRun / harnessToday，S6）
// ---------------------------------------------------------------------------

export type DailyRunPhase = 'idle' | 'picked' | 'scripted' | 'dubbing' | 'rendered' | 'review'

export interface DailyRunEvidence {
  phase: DailyRunPhase
  file: string
  mtime: string
}

export interface DailyRun {
  date: string
  phase: DailyRunPhase
  phaseLabel: string
  summary: string
  slug?: string
  logPath: string | null
  logTail: string[]
  evidence: DailyRunEvidence[]
}

export interface HarnessTodaySummary {
  ran: number
  reports: number
  pendingProposals: number
}

// ---------------------------------------------------------------------------
// 3. P1 总览 GET /api/overview
// ---------------------------------------------------------------------------

export interface Todo {
  kind: string
  severity: 'error' | 'warn' | 'info'
  slug?: string
  title: string
  since?: string
  deadline?: string
  to: string
}

export interface Heartbeat {
  task: string
  trigger: string
  intervalDays?: number
  lastRun: string | null
  overdue: boolean
}

export interface BacklogWater {
  ideaCount: number
  topScore: number | null
  topId: string | null
  daysSinceIdeate: number | null
}

export type WipCounts = Record<MetaStatus | 'rejected', number>

export interface OverviewData {
  dailyRun: DailyRun
  alerts: Alert[]
  wip: WipCounts
  todos: Todo[]
  heartbeat: Heartbeat[]
  backlogWater: BacklogWater
  harnessToday: HarnessTodaySummary
}

// ---------------------------------------------------------------------------
// 4. P2 列表 GET /api/contents
// ---------------------------------------------------------------------------

export interface ContentSummary {
  slug: string
  title: string
  type: 'kouban' | 'tuwen' | null
  pillar: 'depth' | 'traffic' | null
  series?: string
  status: MetaStatus
  dir: string
  source: string | null
  enteredAt: string | null
  scheduledAt?: string | null
  timestamps: Partial<Record<MetaStatus, string>>
  publishUrl?: string | null
  parseError?: string
}

export interface ContentsData {
  items: ContentSummary[]
  parseErrors: { path: string; raw: string }[]
  total: number
}

// ---------------------------------------------------------------------------
// 5. P3 详情 GET /api/content/:slug
// ---------------------------------------------------------------------------

export interface ContentFileRef {
  path: string
  role: string
  exists: boolean
  size?: number
  mtime?: string
}

export interface ContentCheck {
  label: string
  level: 'ok' | 'warn' | 'bad'
  note: string
}

export interface AllowedTransition {
  to: MetaStatus
  action: 'review'
}

export interface AuditTrailEntry {
  at: string | null
  text: string
  kind: string
}

export interface PublishInfo {
  title?: string
  desc?: string
  tags?: string[]
  visibility?: string
}

export interface ContentDetailData {
  meta: Record<string, unknown> | null
  dir: string
  timeline: { status: MetaStatus; at: string | null }[]
  files: ContentFileRef[]
  checks: ContentCheck[]
  allowedTransitions: AllowedTransition[]
  source: { backlogId: string } | null
  auditTrail: AuditTrailEntry[]
  publishInfo: PublishInfo | null
  reviewLog: string
  reworkCount: number
}

// ---------------------------------------------------------------------------
// 6. P4 选题池 GET /api/backlog
// ---------------------------------------------------------------------------

export interface BacklogCollision {
  a: string
  b: string
  similarity: number | null
  conclusion: string
  reportPath: string
}

export interface NextPick {
  id: string
  title: string
  why: string
  viaPointer: boolean
}

export interface BacklogData {
  stats: { idea: number; picked: number; published: number; expired: number }
  ideas: unknown[]
  picked: unknown[]
  published: unknown[]
  collisions: BacklogCollision[]
  nextPick: NextPick | null
  nextPickError?: string
  nextUpId: string | null
  parseErrors: { path: string; raw: string }[]
}

// ---------------------------------------------------------------------------
// 7. P5 治理 GET /api/harness
// ---------------------------------------------------------------------------

export interface HarnessTaskRow {
  name: string
  skill: string | null
  enabled: boolean
  trigger: string
  windows?: string[]
  lastRun: string | null
  overdue: boolean
}

export interface LedgerEntry {
  ts: string
  task: string
  target?: string
  result?: string
  findings?: number
  applied?: boolean
  reportPath?: string
}

export interface ProposalItem {
  reportPath: string
  taskLabel: string
  summary: string
  kind: 'structured' | 'prose'
  structured?: { backlogId: string; action: 'merge' | 'archive'; into?: string }
  brainTargets?: string[]
}

export interface RetroMatrixRow {
  slug: string
  title: string
  publishedAt: string | null
  windows: Record<'24h' | '72h' | '7d', 'ok' | 'miss' | 'pending'>
}

export interface HarnessData {
  tasks: HarnessTaskRow[]
  ledger: LedgerEntry[]
  todayRuns: LedgerEntry[]
  proposals: ProposalItem[]
  retroMatrix: RetroMatrixRow[]
  reports: { path: string; mtime: string }[]
}

// ---------------------------------------------------------------------------
// 8. P6 数据 GET /api/metrics
// ---------------------------------------------------------------------------

export interface MetricsSnapshotRow {
  slug: string
  title: string | null
  publishedAt: string | null
  window: string
  plays?: number
  completion?: number
  likes?: number
  comments?: number
  shares?: number
}

export interface MetricsTrendPoint {
  date: string
  slug: string
  completion: number | null
}

export interface FunnelQuote {
  slug: string
  window: string
  excerpt: string
  reportPath: string
}

export interface MetricsData {
  available: boolean
  summary: { published: number; withSnapshot: number; avgCompletion?: number; totalPlays?: number }
  snapshots: MetricsSnapshotRow[]
  trend: MetricsTrendPoint[]
  funnelQuotes: FunnelQuote[]
}

// ---------------------------------------------------------------------------
// 9. G1 健康灯 GET /api/health
// ---------------------------------------------------------------------------

export interface HealthLight {
  id: string
  label: string
  level: 'ok' | 'warn' | 'bad'
  tip: string
}

export interface HealthData {
  ok: true
  revision: number
  now: string
  lights: HealthLight[]
  uptimeSec: number
  snapshot: { builtAt: string; buildMs: number; parseErrors: number }
  watcher: { watching: boolean; lastEventAt: string | null }
  jobs: { active: string | null; queued: number }
  tick: { lastAt: string | null }
}

// ---------------------------------------------------------------------------
// 10. /api/file /api/asset
// ---------------------------------------------------------------------------

export interface FileReadData {
  path: string
  content: string
  size: number
  mtime: string
  truncated: boolean
}
