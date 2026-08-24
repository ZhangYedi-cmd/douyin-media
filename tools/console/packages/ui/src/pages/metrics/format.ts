// P6 数据页私有的纯格式化/映射函数（03 §2.8）。不出 pages/metrics 目录（AI 约定 1）。
import type { MetricsSnapshotRow, MetricsTrendPoint } from '@console/server/api-types'
import type { LineChartPoint } from '../../components/LineChart'

function trimDecimal(n: number): string {
  const rounded = Math.round(n * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}

/** 完播等百分比字段：server 已给出百分点数值（如 27.8 表示 27.8%），这里只管小数位裁剪 + 拼 %。 */
export function formatPercent(n: number): string {
  return `${trimDecimal(n)}%`
}

/** 千分位整数（plays/likes/comments/shares 表格列用）。 */
export function formatInt(n: number): string {
  return Math.round(n).toLocaleString('en-US')
}

/** 大数摘要用的紧凑格式（summary.totalPlays 用）：91300 → "91.3k"。 */
export function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${trimDecimal(n / 1_000_000)}M`
  if (n >= 1_000) return `${trimDecimal(n / 1_000)}k`
  return formatInt(n)
}

/** ISO 日期/日期时间 → "MM-DD"；解析不出原样返回（不装作能解析，如实为先）。 */
export function formatDateLabel(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  return m ? `${m[2]}-${m[3]}` : iso
}

/**
 * 把 API 的 trend[] 投影成 LineChart 的 points（03 §2.9 LineChartProps）。
 * trend 已按 slug 逐条落盘（同一 slug 多窗口可能出现多条，非去重后的「每 slug 一点」），
 * 这里只管按 x 轴需要的顺序与展示文案整理，不重算/不去重——「展示不重算」同一条纪律。
 * tip 从 snapshots 里按 slug 查标题/plays 做补充展示；查不到就退回 slug 本身，不装有。
 */
export function buildTrendPoints(trend: MetricsTrendPoint[], snapshots: MetricsSnapshotRow[]): LineChartPoint[] {
  const bySlug = new Map(snapshots.map((s) => [s.slug, s] as const))
  return [...trend]
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    .map((t) => {
      const snap = bySlug.get(t.slug)
      const title = snap?.title ?? t.slug
      const parts = [`${title} · ${formatDateLabel(t.date)}`]
      if (t.completion !== null) parts.push(`完播 ${formatPercent(t.completion)}`)
      if (typeof snap?.plays === 'number') parts.push(`${formatCompact(snap.plays)} 播放`)
      return { x: formatDateLabel(t.date), y: t.completion, tip: parts.join(' · ') }
    })
}
