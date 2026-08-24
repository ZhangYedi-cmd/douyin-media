// 6 快照读接口的纯投影函数（02-后端执行方案.md §2.1）。从 Store 持有的 Snapshot 计算响应 data，
// 不做现场 IO——例外两处已在函数注释里标注：content/:slug 的 files/auditTrail/reviewLog/publishInfo
// 需要 3-review.md/4-publish.md 原文与各交付物文件的 size/mtime，Snapshot 当前不携带这些字段，
// 遂对「该一条目录」做有界现场读（≤10 次 stat/读文件，量级与 /api/file 单次读相当，不是 N+1 扫描）。
import fs from 'node:fs'
import path from 'node:path'
import {
  legalNext,
  META_STATUS_ORDER,
  META_TRANSITIONS,
  parseYamlValue,
  pickNext,
} from '@console/core'
import type { Alert, ContentEntry, MetaStatus, Snapshot, TransitionSpec } from '@console/core'
import { countRework } from '../util/reviewLog.js'
import { normalizeHarnessReportPath } from '../util/harnessPath.js'
import type {
  AllowedTransition,
  AuditTrailEntry,
  BacklogCollision,
  BacklogData,
  ContentCheck,
  ContentDetailData,
  ContentFileRef,
  ContentsData,
  ContentSummary,
  FunnelQuote,
  HarnessData,
  LedgerEntry,
  MetricsData,
  MetricsSnapshotRow,
  NextPick,
  OverviewData,
  ProposalItem,
  PublishInfo,
  RetroMatrixRow,
  Todo,
  WipCounts,
} from '../api-types.js'
import type { Store } from '../store.js'

// ---------------------------------------------------------------------------
// P1 总览
// ---------------------------------------------------------------------------

function computeWip(snapshot: Snapshot): WipCounts {
  const wip = Object.fromEntries(META_STATUS_ORDER.map((s) => [s, 0])) as WipCounts
  for (const c of snapshot.contents) {
    if (!c.meta) continue
    wip[c.meta.status] = (wip[c.meta.status] ?? 0) + 1
  }
  return wip
}

function alertsToTodos(alerts: Alert[]): Todo[] {
  return alerts
    .filter((a) => a.level !== 'info')
    .map((a) => ({
      kind: a.rule,
      severity: a.level,
      slug: /^[a-z0-9-]+$/.test(a.subject) ? a.subject : undefined,
      title: a.message,
      since: a.since,
      to: a.action?.to ?? (a.evidencePath ? `/api/file?path=${encodeURIComponent(a.evidencePath)}` : '/contents'),
    }))
}

function computeBacklogWater(snapshot: Snapshot): OverviewData['backlogWater'] {
  const ideas = snapshot.backlog.topics.filter((t) => t.status === 'idea')
  if (ideas.length === 0) return { ideaCount: 0, topScore: null, topId: null, daysSinceIdeate: null }
  const sorted = [...ideas].sort((a, b) => (b.score ?? -Infinity) - (a.score ?? -Infinity))
  const top = sorted[0]!
  let daysSinceIdeate: number | null = null
  const latestCreated = ideas.map((t) => t.created).filter(Boolean).sort().at(-1)
  if (latestCreated) {
    const d = new Date(latestCreated)
    if (!Number.isNaN(d.getTime())) daysSinceIdeate = Math.floor((Date.now() - d.getTime()) / 86_400_000)
  }
  return { ideaCount: ideas.length, topScore: top.score, topId: top.id, daysSinceIdeate }
}

export function projectOverview(store: Store): OverviewData {
  const { snapshot, alerts } = store
  return {
    dailyRun: store.dailyRun,
    alerts,
    wip: computeWip(snapshot),
    todos: alertsToTodos(alerts),
    heartbeat: store.harnessTasks.map((t) => ({
      task: t.name,
      trigger: t.trigger,
      lastRun: t.lastRun,
      overdue: t.overdue,
    })),
    backlogWater: computeBacklogWater(snapshot),
    harnessToday: store.harnessToday,
  }
}

// ---------------------------------------------------------------------------
// P2 列表
// ---------------------------------------------------------------------------

function toContentSummary(c: ContentEntry): ContentSummary {
  if (!c.meta) {
    return {
      slug: c.slug,
      title: c.slug,
      type: null,
      pillar: null,
      status: 'ideated',
      dir: c.dir,
      source: null,
      enteredAt: null,
      timestamps: {},
      parseError: c.parseError,
    }
  }
  const m = c.meta
  return {
    slug: c.slug,
    title: m.title || c.slug,
    type: m.type,
    pillar: m.pillar,
    status: m.status,
    dir: c.dir,
    source: m.source,
    enteredAt: m.timestamps[m.status] ?? null,
    scheduledAt: m.schedule,
    timestamps: m.timestamps,
    publishUrl: m.publish_url,
  }
}

export interface ContentsQuery {
  status?: string[]
  limit?: number
}

export function projectContents(store: Store, query: ContentsQuery): ContentsData {
  const { snapshot } = store
  let items = snapshot.contents.map(toContentSummary)
  if (query.status && query.status.length > 0) {
    const set = new Set(query.status)
    items = items.filter((i) => set.has(i.status))
  }
  items = [...items].sort((a, b) => (a.dir < b.dir ? 1 : a.dir > b.dir ? -1 : 0))
  const total = items.length
  const limit = query.limit ?? 100
  items = items.slice(0, limit)
  const parseErrors = snapshot.parseErrors
    .filter((pe) => pe.path.startsWith('content/'))
    .map((pe) => ({ path: pe.path, raw: pe.error }))
  return { items, parseErrors, total }
}

// ---------------------------------------------------------------------------
// P3 详情（有界现场 IO：见文件头注释）
// ---------------------------------------------------------------------------

const KNOWN_ROLE_FILES = ['1-brief.md', '2-script.md', '3-review.md', '4-publish.md', '5-retro.md', 'meta.yaml']

function statRef(root: string, relPath: string): ContentFileRef {
  const abs = path.join(root, relPath)
  try {
    const st = fs.statSync(abs)
    return { path: relPath, role: path.basename(relPath), exists: true, size: st.size, mtime: st.mtime.toISOString() }
  } catch {
    return { path: relPath, role: path.basename(relPath), exists: false }
  }
}

function findFirstMatch(dirAbs: string, re: RegExp): string | null {
  try {
    return fs.readdirSync(dirAbs).find((f) => re.test(f)) ?? null
  } catch {
    return null
  }
}

function probeContentFiles(root: string, relDir: string): ContentFileRef[] {
  const dirAbs = path.join(root, relDir)
  const refs = KNOWN_ROLE_FILES.map((f) => statRef(root, `${relDir}/${f}`))
  const assetsDir = path.join(dirAbs, 'assets')
  const cover = findFirstMatch(assetsDir, /^cover\.[a-z0-9]+$/i)
  if (cover) refs.push({ ...statRef(root, `${relDir}/assets/${cover}`), role: 'cover' })
  const mp4 = findFirstMatch(assetsDir, /\.mp4$/i)
  if (mp4) refs.push({ ...statRef(root, `${relDir}/assets/${mp4}`), role: 'video' })
  return refs
}

function readTextIfExists(root: string, relPath: string): string {
  try {
    return fs.readFileSync(path.join(root, relPath), 'utf8')
  } catch {
    return ''
  }
}

/** 沿 tools/feishu-bot/server.py `_append_review` 同一留痕格式：`- [<stamp>] <text>`。 */
function parseAuditTrail(raw: string): AuditTrailEntry[] {
  const lines = raw.split('\n')
  const entries: AuditTrailEntry[] = []
  for (const line of lines) {
    const m = /^-\s*\[([^\]]*)\]\s*(.+)$/.exec(line.trim())
    if (!m) continue
    const [, at, text] = m
    let kind = 'note'
    if (text!.includes('打回·重做')) kind = 'rework'
    else if (text!.includes('打回·待办')) kind = 'todo'
    else if (text!.includes('上限留痕') || text!.includes('转人工')) kind = 'rework-limit'
    else if (text!.includes('飞书审核')) kind = 'feishu'
    entries.push({ at: at || null, text: text!, kind })
  }
  return entries
}

/** 4-publish.md 字段解析：`- **键**：值`（沿 tools/feishu-bot/meta.py `_FIELD_RE` 同一格式约定）。 */
function parsePublishInfo(raw: string): PublishInfo | null {
  if (!raw.trim()) return null
  const info: PublishInfo = {}
  const lines = raw.split('\n')
  for (const line of lines) {
    const m = /^-\s*\*\*([^*]+)\*\*[：:]\s*(.*)$/.exec(line.trim())
    if (!m) continue
    const [, key, value] = m
    const v = value!.trim()
    if (key === '标题') info.title = v
    else if (key === '正文/简介') info.desc = v
    else if (key === '话题标签') info.tags = v.split(/\s+/).filter((t) => t.startsWith('#'))
  }
  return Object.keys(info).length > 0 ? info : null
}

export function projectContentDetail(store: Store, slug: string): ContentDetailData | null {
  const entry = store.snapshot.contents.find((c) => c.slug === slug)
  if (!entry) return null

  const root = store.root
  const meta = entry.meta

  const timeline = META_STATUS_ORDER.map((status) => ({
    status,
    at: meta?.timestamps[status] ?? null,
  }))

  const files = entry.meta || entry.parseError ? probeContentFiles(root, entry.dir) : probeContentFiles(root, entry.dir)

  const relevantAlerts = store.alerts.filter((a) => a.subject === slug)
  const checks: ContentCheck[] = relevantAlerts.map((a) => ({
    label: a.rule,
    level: a.level === 'error' ? 'bad' : a.level === 'warn' ? 'warn' : 'ok',
    note: a.message,
  }))
  checks.push(
    { label: '成片', level: entry.deliverables.video ? 'ok' : 'warn', note: entry.deliverables.video ? '已出' : '未出' },
    { label: '封面', level: entry.deliverables.cover ? 'ok' : 'warn', note: entry.deliverables.cover ? '已出' : '未出' },
    { label: '口播稿', level: entry.deliverables.script ? 'ok' : 'warn', note: entry.deliverables.script ? '已出' : '未出' },
    { label: '发布物料', level: entry.deliverables.publish ? 'ok' : 'warn', note: entry.deliverables.publish ? '已出' : '未出' },
  )

  // 只透出生产线迁移：治理线迁移（如 published→retro_done）不经看板动作层达成，
  // 透出会在 P3 渲染出「点了必 400」的幽灵项（C 包验收发现项 #1，2026-08-18 修正）。
  const allowedTransitions: AllowedTransition[] = meta
    ? (Object.entries(META_TRANSITIONS[meta.status] ?? {}) as [MetaStatus, TransitionSpec][])
        .filter(([, spec]) => spec.line === 'production')
        .map(([to]) => ({ to, action: 'review' as const }))
    : []

  const reviewLog = readTextIfExists(root, `${entry.dir}/3-review.md`)
  const publishRaw = readTextIfExists(root, `${entry.dir}/4-publish.md`)

  return {
    meta: meta as unknown as Record<string, unknown> | null,
    dir: entry.dir,
    timeline,
    files,
    checks,
    allowedTransitions,
    source: meta?.source ? { backlogId: meta.source } : null,
    auditTrail: parseAuditTrail(reviewLog),
    publishInfo: parsePublishInfo(publishRaw),
    reviewLog,
    reworkCount: countRework(reviewLog),
  }
}

// ---------------------------------------------------------------------------
// P4 选题池
// ---------------------------------------------------------------------------

/** 最近一份 backlog-gardener 报告里的「撞题结论」表——best-effort 正则摘取，解析不出不报错，返回空表。 */
function parseCollisionsFromLatestGardenerReport(store: Store): BacklogCollision[] {
  const reportsDir = path.join(store.root, 'harness/logs')
  let files: string[] = []
  try {
    files = fs.readdirSync(reportsDir).filter((f) => /backlog-gardener\.md$/.test(f))
  } catch {
    return []
  }
  if (files.length === 0) return []
  const latest = files.sort().at(-1)!
  const raw = readTextIfExists(store.root, `harness/logs/${latest}`)
  const collisions: BacklogCollision[] = []
  // 约定格式（gardener 报告惯例）：`- 撞题：<a> vs <b>（相似度 0.xx）—— 结论：...`
  // 逐行三次独立匹配（而非一个大正则一次吃三个捕获组）：id 对、相似度、结论三者在行内的相对位置不完全
  // 固定（全角括号/破折号夹在中间），一个正则里让「相似度」可选、「结论」必选会被回溯引擎跳过可选组
  // 抢先满足整体匹配，导致 similarity 假性丢失（真实断言跑出来才发现，逐行拆开彻底避开这个坑）。
  for (const line of raw.split('\n')) {
    if (!line.includes('撞题')) continue
    const idsMatch = /撞题[：:]\s*([\w-]+)\s*(?:vs|与)\s*([\w-]+)/.exec(line)
    if (!idsMatch) continue
    const simMatch = /相似度\s*([\d.]+)/.exec(line)
    const conclMatch = /结论[：:]\s*(.+)$/.exec(line)
    collisions.push({
      a: idsMatch[1]!,
      b: idsMatch[2]!,
      similarity: simMatch ? Number(simMatch[1]) : null,
      conclusion: conclMatch ? conclMatch[1]!.trim() : '',
      reportPath: `harness/logs/${latest}`,
    })
  }
  return collisions
}

export interface BacklogQuery {
  status?: string
  sort?: string
  expiring?: boolean
}

export function projectBacklog(store: Store, _query: BacklogQuery): BacklogData {
  const { snapshot } = store
  const ideas = snapshot.backlog.topics.filter((t) => t.status === 'idea')
  const picked = snapshot.backlog.topics.filter((t) => t.status === 'picked')
  const published = snapshot.backlog.topics.filter((t) => t.status === 'published')
  const expired = snapshot.backlog.topics.filter((t) => t.status === 'expired')

  let nextPick: NextPick | null = null
  let nextPickError: string | undefined
  try {
    const decision = pickNext(snapshot.backlog)
    if (decision.decision !== 'empty' && decision.id) {
      nextPick = {
        id: decision.id,
        title: decision.title ?? decision.id,
        why: decision.reason ?? (decision.decision === 'next_up' ? '人钦点 next_up 指针' : '选题池 score 最高'),
        viaPointer: decision.decision === 'next_up',
      }
    }
  } catch (err) {
    nextPickError = err instanceof Error ? err.message : String(err)
  }

  const parseErrors = snapshot.parseErrors
    .filter((pe) => pe.path.includes('backlog.yaml'))
    .map((pe) => ({ path: pe.path, raw: pe.error }))

  return {
    stats: { idea: ideas.length, picked: picked.length, published: published.length, expired: expired.length },
    ideas,
    picked,
    published,
    collisions: parseCollisionsFromLatestGardenerReport(store),
    nextPick,
    nextPickError,
    nextUpId: snapshot.backlog.nextUp,
    parseErrors,
  }
}

// ---------------------------------------------------------------------------
// P5 治理
// ---------------------------------------------------------------------------

function harnessRunToLedgerEntry(r: Snapshot['harness'][number], root: string): LedgerEntry {
  return {
    ts: r.ts,
    task: r.task,
    target: r.target,
    result: r.result,
    findings: r.findings,
    applied: r.applied,
    reportPath: typeof r.report === 'string' ? normalizeHarnessReportPath(r.report, root) : undefined,
  }
}

function todayStr(now: Date): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

/** ProposalItem 来源：index.jsonl 中 applied:false 且 findings>0 的条目（02 §2.1 原文）。 */
function deriveProposals(snapshot: Snapshot, root: string): ProposalItem[] {
  return snapshot.harness
    .filter((r) => r.applied === false && (r.findings ?? 0) > 0 && typeof r.report === 'string')
    .map((r) => ({
      reportPath: normalizeHarnessReportPath(r.report!, root),
      taskLabel: r.task,
      summary: `${r.task}${r.target ? `(${r.target})` : ''}: ${r.result ?? ''}（findings=${r.findings}）`,
      kind: 'prose' as const,
    }))
}

function deriveReports(store: Store): { path: string; mtime: string }[] {
  const dir = path.join(store.root, 'harness/logs')
  try {
    return fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.md'))
      .map((f) => {
        const abs = path.join(dir, f)
        let mtime = ''
        try {
          mtime = fs.statSync(abs).mtime.toISOString()
        } catch {
          /* ignore */
        }
        return { path: `harness/logs/${f}`, mtime }
      })
      .sort((a, b) => (a.mtime < b.mtime ? 1 : -1))
  } catch {
    return []
  }
}

/** retroMatrix：published 内容 × 三窗口，窗口是否已有对应 harness run（result 含该窗口即算 ok）。 */
function deriveRetroMatrix(snapshot: Snapshot): RetroMatrixRow[] {
  const published = snapshot.contents.filter((c) => c.meta && (c.meta.status === 'published' || c.meta.status === 'retro_done'))
  return published.map((c) => {
    const target = c.dir.replace(/^content\//, '')
    const runsForSlug = snapshot.harness.filter((r) => r.task === 'retro' && r.target === target)
    const windows: RetroMatrixRow['windows'] = { '24h': 'pending', '72h': 'pending', '7d': 'pending' }
    for (const w of ['24h', '72h', '7d'] as const) {
      const hit = runsForSlug.find((r) => r.window === w)
      if (hit) windows[w] = 'ok'
    }
    if (c.meta!.status === 'retro_done') {
      for (const w of ['24h', '72h', '7d'] as const) if (windows[w] === 'pending') windows[w] = 'miss'
    }
    return {
      slug: c.slug,
      title: c.meta!.title || c.slug,
      publishedAt: c.meta!.timestamps.published ?? null,
      windows,
    }
  })
}

export function projectHarness(store: Store, days: number): HarnessData {
  const { snapshot } = store
  const now = new Date()
  const windowStart = now.getTime() - days * 86_400_000
  const ledger = [...snapshot.harness]
    .filter((r) => {
      const t = new Date(r.ts).getTime()
      return !Number.isNaN(t) && t >= windowStart
    })
    .sort((a, b) => (a.ts < b.ts ? 1 : -1))
    .map((r) => harnessRunToLedgerEntry(r, store.root))
  const today = todayStr(now)
  const todayRuns = ledger.filter((r) => r.ts.startsWith(today))

  return {
    tasks: store.harnessTasks,
    ledger,
    todayRuns,
    proposals: deriveProposals(snapshot, store.root),
    retroMatrix: deriveRetroMatrix(snapshot),
    reports: deriveReports(store),
  }
}

// ---------------------------------------------------------------------------
// P6 数据
// ---------------------------------------------------------------------------

export function projectMetrics(store: Store, slugFilter?: string): MetricsData {
  const { snapshot } = store
  const records = slugFilter ? snapshot.metrics.filter((m) => m.slug === slugFilter) : snapshot.metrics
  const available = records.length > 0

  const bySlugWindow = new Map<string, Snapshot['metrics'][number]>()
  for (const r of records) {
    const key = `${r.slug}::${r.window}`
    const existing = bySlugWindow.get(key)
    if (!existing || existing.ts < r.ts) bySlugWindow.set(key, r)
  }
  const latestBySlug = new Map<string, Snapshot['metrics'][number]>()
  for (const r of bySlugWindow.values()) {
    const existing = latestBySlug.get(r.slug)
    if (!existing || existing.ts < r.ts) latestBySlug.set(r.slug, r)
  }

  const contentBySlug = new Map(snapshot.contents.map((c) => [c.slug, c] as const))
  const snapshots: MetricsSnapshotRow[] = [...latestBySlug.values()].map((r) => {
    const c = contentBySlug.get(r.slug)
    const d = r.data as Record<string, unknown>
    return {
      slug: r.slug,
      title: c?.meta?.title ?? r.slug,
      publishedAt: c?.meta?.timestamps.published ?? null,
      window: r.window,
      plays: typeof d.plays === 'number' ? d.plays : undefined,
      completion: typeof d.completion === 'number' ? d.completion : undefined,
      likes: typeof d.likes === 'number' ? d.likes : undefined,
      comments: typeof d.comments === 'number' ? d.comments : undefined,
      shares: typeof d.shares === 'number' ? d.shares : undefined,
    }
  })

  const trend: MetricsData['trend'] = [...records]
    .sort((a, b) => (a.ts < b.ts ? -1 : 1))
    .map((r) => {
      const d = r.data as Record<string, unknown>
      return { date: r.ts.slice(0, 10), slug: r.slug, completion: typeof d.completion === 'number' ? d.completion : null }
    })

  const published = snapshot.contents.filter((c) => c.meta?.status === 'published' || c.meta?.status === 'retro_done').length
  const withSnapshot = latestBySlug.size
  const completions = snapshots.map((s) => s.completion).filter((n): n is number => typeof n === 'number')
  const avgCompletion = completions.length > 0 ? completions.reduce((a, b) => a + b, 0) / completions.length : undefined
  const totalPlays = snapshots.reduce((sum, s) => sum + (s.plays ?? 0), 0)

  const funnelQuotes: FunnelQuote[] = []

  return {
    available,
    summary: { published, withSnapshot, avgCompletion, totalPlays: totalPlays > 0 ? totalPlays : undefined },
    snapshots,
    trend,
    funnelQuotes,
  }
}
