// 一致性体检规则唯一实现（01-CLI执行方案.md §2.4）：`media check` 与看板 P1 共用同一份代码（总览契约 2）。
// 零 IO：只吃 Snapshot + now，不读文件系统。now 必须注参（后端方案 §4，供服务端 10min tick 复用）。
import type { Alert, BacklogTopic, ContentEntry, Snapshot } from './types.js'

export interface AlertCfg {
  /** CHK-03：scheduled 超时判定阈值（小时），默认 24（拍板原文 "now > schedule + 24h"）。 */
  scheduledTimeoutHours: number
  /** CHK-04：review 停留积压阈值（小时），默认 48（拍板原文）。 */
  reviewStalledHours: number
  /** CHK-07：临近机械过期预演窗口（天），默认 2（拍板原文 "≤2 天内将命中"）。 */
  nearExpiryDays: number
  /** R1 阈值（天）：urgency=today 且 created 距今 > N 天判过期，默认 2。 */
  expireTodayDays: number
  /** R2 阈值（天）：scores.timeliness≥4 且 created 距今 > N 天判过期，默认 7。 */
  expireTimelinessDays: number
  /**
   * CHK-08：工作日「疑似空跑」判定时点（本地时区 24h 制小时数），默认 21。
   * 已知缺口（未决项，见报告）：拍板原文还要求「且无飞书阻塞上报」，
   * 但 Snapshot 当前无飞书阻塞事件这一数据源，本实现只判「过点无当日 content 目录」半句。
   */
  emptyRunThresholdHour: number
}

export const DEFAULT_ALERT_CFG: AlertCfg = {
  scheduledTimeoutHours: 24,
  reviewStalledHours: 48,
  nearExpiryDays: 2,
  expireTodayDays: 2,
  expireTimelinessDays: 7,
  emptyRunThresholdHour: 21,
}

/** 'YYYY-MM-DD' 或 'YYYY-MM-DD HH:mm' → 本地时区 Date；两种形态统一走「无 Z 后缀」路径，避免 JS 对纯日期串按 UTC 解读的坑。 */
function parseLocalDate(raw: string): Date | null {
  const trimmed = raw.trim()
  if (trimmed === '') return null
  const iso = trimmed.length <= 10 ? `${trimmed}T00:00:00` : `${trimmed.replace(' ', 'T')}:00`
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : d
}

function hoursBetween(a: Date, b: Date): number {
  return (b.getTime() - a.getTime()) / 3_600_000
}

function daysBetween(a: Date, b: Date): number {
  return (b.getTime() - a.getTime()) / 86_400_000
}

export interface ExpireMatch {
  rule: 'R1' | 'R2'
  ruleName: string
}

/** 机械清扫规则引擎：当前已命中的规则列表（供 sweep 实际执行判定；只作用于 status=idea）。 */
export function expireRules(topic: BacklogTopic, now: Date, cfg: AlertCfg = DEFAULT_ALERT_CFG): ExpireMatch[] {
  if (topic.status !== 'idea') return []
  const created = parseLocalDate(topic.created)
  if (!created) return []
  const days = daysBetween(created, now)
  const matches: ExpireMatch[] = []
  if (topic.urgency === 'today' && days > cfg.expireTodayDays) {
    matches.push({ rule: 'R1', ruleName: `today超${cfg.expireTodayDays}天` })
  }
  const timeliness = topic.scores?.timeliness
  if (typeof timeliness === 'number' && timeliness >= 4 && days > cfg.expireTimelinessDays) {
    matches.push({ rule: 'R2', ruleName: `timeliness4超${cfg.expireTimelinessDays}天` })
  }
  return matches
}

export interface ExpiryPreview {
  days: number // 距命中还剩几天（向下取整前的原始值，四舍五入由调用方决定）
  rule: string // 'today>2d' | 'timeliness4>7d'
}

/** 未命中时预演「还差几天命中」，供 `backlog ls --expiring` 与 CHK-07 共用（§2.3 / §2.4）。已命中返回 null（那是 sweep 的活）。 */
/**
 * 预演命中：不管当前是否已实际命中（days 可为负=已逾期未清扫），只要 status=idea 且至少一条规则适用就有值。
 * `backlog ls --expiring`（§2.3）用它列出「临近/已逾期」全貌；CHK-07 在此基础上只挑「尚未命中且 ≤ 窗口天数」的子集。
 */
export function previewExpiry(topic: BacklogTopic, now: Date, cfg: AlertCfg = DEFAULT_ALERT_CFG): ExpiryPreview | null {
  if (topic.status !== 'idea') return null
  const created = parseLocalDate(topic.created)
  if (!created) return null
  const days = daysBetween(created, now)
  const candidates: ExpiryPreview[] = []
  if (topic.urgency === 'today') {
    candidates.push({ days: cfg.expireTodayDays - days, rule: `today>${cfg.expireTodayDays}d` })
  }
  const timeliness = topic.scores?.timeliness
  if (typeof timeliness === 'number' && timeliness >= 4) {
    candidates.push({ days: cfg.expireTimelinessDays - days, rule: `timeliness4>${cfg.expireTimelinessDays}d` })
  }
  if (candidates.length === 0) return null
  candidates.sort((a, b) => a.days - b.days)
  return candidates[0]!
}

function alertKey(rule: string, subject: string): string {
  return `${rule}:${subject}`
}

function findBacklogTopicById(snapshot: Snapshot, id: string | null): BacklogTopic | undefined {
  if (!id) return undefined
  return snapshot.backlog.topics.find((t) => t.id === id)
}

function findContentBySource(snapshot: Snapshot, backlogId: string): ContentEntry | undefined {
  return snapshot.contents.find((c) => c.meta?.source === backlogId)
}

export function computeAlerts(snapshot: Snapshot, now: Date, cfg: AlertCfg = DEFAULT_ALERT_CFG): Alert[] {
  const alerts: Alert[] = []

  // CHK-01 双层不同步（error）
  for (const c of snapshot.contents) {
    if (!c.meta) continue
    if (c.meta.status === 'published' || c.meta.status === 'retro_done') {
      const topic = findBacklogTopicById(snapshot, c.meta.source)
      if (!topic) {
        alerts.push({
          key: alertKey('CHK-01', c.slug),
          rule: 'CHK-01',
          level: 'error',
          subject: c.slug,
          message: `meta.status=${c.meta.status} 但 backlog 查无对应条目（source=${c.meta.source ?? '空'}）`,
          evidencePath: `${c.dir}/meta.yaml`,
        })
      } else if (topic.status !== 'published') {
        alerts.push({
          key: alertKey('CHK-01', c.slug),
          rule: 'CHK-01',
          level: 'error',
          subject: c.slug,
          message: `meta.status=${c.meta.status} 但 backlog(${topic.id}).status=${topic.status}（双层不同步）`,
          evidencePath: `${c.dir}/meta.yaml`,
        })
      }
    }
  }
  for (const t of snapshot.backlog.topics) {
    if (t.status !== 'published') continue
    const content = findContentBySource(snapshot, t.id)
    if (!content || !content.meta || (content.meta.status !== 'published' && content.meta.status !== 'retro_done')) {
      alerts.push({
        key: alertKey('CHK-01', t.id),
        rule: 'CHK-01',
        level: 'error',
        subject: t.id,
        message: `backlog.status=published 但对应内容 meta 未达 published（${
          content?.meta ? `meta.status=${content.meta.status}` : '找不到对应 content 条目'
        }）`,
      })
    }
  }

  // CHK-02 picked 断链（error）
  for (const t of snapshot.backlog.topics) {
    if (t.status !== 'picked') continue
    if (!t.content_path) {
      alerts.push({
        key: alertKey('CHK-02', t.id),
        rule: 'CHK-02',
        level: 'error',
        subject: t.id,
        message: 'backlog.status=picked 但 content_path 为空',
      })
      continue
    }
    const normalized = t.content_path.replace(/\/+$/, '')
    const content = snapshot.contents.find((c) => c.dir.replace(/\\/g, '/') === normalized)
    if (!content) {
      alerts.push({
        key: alertKey('CHK-02', t.id),
        rule: 'CHK-02',
        level: 'error',
        subject: t.id,
        message: `backlog.status=picked 但 content_path=${t.content_path} 目录不存在或缺 meta.yaml`,
      })
    }
  }

  // CHK-03 scheduled 超时（error）
  for (const c of snapshot.contents) {
    if (!c.meta || c.meta.status !== 'scheduled' || !c.meta.schedule) continue
    const scheduleRaw = c.meta.schedule
    const schedule = parseLocalDate(scheduleRaw)
    if (!schedule) continue
    if (hoursBetween(schedule, now) > cfg.scheduledTimeoutHours) {
      alerts.push({
        key: alertKey('CHK-03', c.slug),
        rule: 'CHK-03',
        level: 'error',
        subject: c.slug,
        message: `scheduled(${scheduleRaw}) 超时 ${Math.floor(hoursBetween(schedule, now) / 24)} 天未回填`,
        since: scheduleRaw,
        evidencePath: `${c.dir}/meta.yaml`,
      })
    }
  }

  // CHK-04 review 积压（warn）
  for (const c of snapshot.contents) {
    if (!c.meta || c.meta.status !== 'review') continue
    const reviewAt = c.meta.timestamps.review ? parseLocalDate(c.meta.timestamps.review) : null
    if (!reviewAt) continue
    if (hoursBetween(reviewAt, now) > cfg.reviewStalledHours) {
      alerts.push({
        key: alertKey('CHK-04', c.slug),
        rule: 'CHK-04',
        level: 'warn',
        subject: c.slug,
        message: `review 停留 ${Math.floor(hoursBetween(reviewAt, now))} 小时，超过 ${cfg.reviewStalledHours}h 阈值`,
        since: c.meta.timestamps.review,
        evidencePath: `${c.dir}/meta.yaml`,
      })
    }
  }

  // CHK-05 链接待补（warn）
  for (const c of snapshot.contents) {
    if (!c.meta || c.meta.status !== 'published') continue
    if (!c.meta.publish_url) {
      alerts.push({
        key: alertKey('CHK-05', c.slug),
        rule: 'CHK-05',
        level: 'warn',
        subject: c.slug,
        message: 'published 无作品链接',
        evidencePath: `${c.dir}/meta.yaml`,
      })
    }
  }

  // CHK-06 指针断裂（warn）
  for (const c of snapshot.contents) {
    if (!c.meta) continue
    if (!c.meta.source) {
      alerts.push({
        key: alertKey('CHK-06', c.slug),
        rule: 'CHK-06',
        level: 'warn',
        subject: c.slug,
        message: 'meta.source 为空',
        evidencePath: `${c.dir}/meta.yaml`,
      })
      continue
    }
    const topic = findBacklogTopicById(snapshot, c.meta.source)
    if (!topic) {
      alerts.push({
        key: alertKey('CHK-06', c.slug),
        rule: 'CHK-06',
        level: 'warn',
        subject: c.slug,
        message: `meta.source=${c.meta.source} 在 backlog 中查无此 id`,
        evidencePath: `${c.dir}/meta.yaml`,
      })
    } else if (topic.content_path && topic.content_path.replace(/\/+$/, '') !== c.dir.replace(/\\/g, '/')) {
      alerts.push({
        key: alertKey('CHK-06', c.slug),
        rule: 'CHK-06',
        level: 'warn',
        subject: c.slug,
        message: `backlog(${topic.id}).content_path=${topic.content_path} 与 meta 实际目录 ${c.dir} 不一致`,
        evidencePath: `${c.dir}/meta.yaml`,
      })
    }
  }

  // CHK-07 临近过期（info）：尚未命中（days>=0）且落在窗口内——已逾期未清扫不算「临近」，那是 sweep 该管的事
  for (const t of snapshot.backlog.topics) {
    const preview = previewExpiry(t, now, cfg)
    if (preview && preview.days >= 0 && preview.days <= cfg.nearExpiryDays) {
      alerts.push({
        key: alertKey('CHK-07', t.id),
        rule: 'CHK-07',
        level: 'info',
        subject: t.id,
        message: `临近机械过期：${preview.rule}，约 ${Math.ceil(preview.days)} 天内命中`,
      })
    }
  }

  // CHK-08 疑似空跑（warn）——已知缺口见 AlertCfg.emptyRunThresholdHour 注释
  {
    const day = now.getDay() // 0=Sun ... 6=Sat
    const isWeekday = day >= 1 && day <= 5
    if (isWeekday && now.getHours() >= cfg.emptyRunThresholdHour) {
      const todayPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
      const hasToday = snapshot.contents.some((c) => c.dir.replace(/\\/g, '/').includes(`content/${todayPrefix}/`))
      if (!hasToday) {
        alerts.push({
          key: alertKey('CHK-08', todayPrefix),
          rule: 'CHK-08',
          level: 'warn',
          subject: todayPrefix,
          message: `工作日 ${cfg.emptyRunThresholdHour}:00 后仍无当日 content 目录，疑似空跑（未核飞书阻塞上报，见已知缺口）`,
        })
      }
    }
  }

  return alerts
}
