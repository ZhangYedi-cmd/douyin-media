// dashboard.md 三区机器渲染（01-CLI执行方案.md §2.12）。
// 只处理三对命名标记内的文本；标记外一个字节不动——这是人写区与机器区的唯一分界线（拍板 §7）。
import { MediaError } from './errors.js'
import { previewExpiry } from './alerts.js'
import type { Alert, Snapshot } from './types.js'

export type DashboardZoneName = 'wip' | 'backlog' | 'alerts'

const IN_PROGRESS_STATUSES = new Set(['ideated', 'drafting', 'review', 'approved', 'scheduled'])

function marker(name: DashboardZoneName, edge: 'begin' | 'end'): string {
  return `<!-- auto:${name}:${edge} -->`
}

function zoneRegex(name: DashboardZoneName): RegExp {
  const b = marker(name, 'begin').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const e = marker(name, 'end').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(${b})([\\s\\S]*?)(${e})`)
}

/** 渲染指定机器区的内容（不含首尾标记本身）。 */
export function renderZone(name: DashboardZoneName, snapshot: Snapshot, alerts: Alert[]): string {
  if (name === 'wip') return renderWipZone(snapshot)
  if (name === 'backlog') return renderBacklogZone(snapshot)
  return renderAlertsZone(alerts)
}

function renderWipZone(snapshot: Snapshot): string {
  const rows = snapshot.contents
    .filter((c) => c.meta && IN_PROGRESS_STATUSES.has(c.meta.status))
    .map((c) => {
      const meta = c.meta!
      const since = meta.timestamps[meta.status] ?? '-'
      const blockerKeys = Object.keys(meta.blocker)
      const blocker = blockerKeys.length > 0 ? blockerKeys.join(',') : '无'
      return `| ${c.slug} | ${meta.status} | ${since} | ${blocker} |`
    })
  if (rows.length === 0) {
    return '\n（空——当前无在制条目）\n'
  }
  return ['\n| slug | status | since | blocker |', '|---|---|---|---|', ...rows, ''].join('\n')
}

function renderBacklogZone(snapshot: Snapshot): string {
  const counts: Record<string, number> = {}
  for (const t of snapshot.backlog.topics) counts[t.status] = (counts[t.status] ?? 0) + 1
  const countLine = Object.entries(counts)
    .map(([k, v]) => `${v} ${k}`)
    .join(' | ')

  const ideas = snapshot.backlog.topics.filter((t) => t.status === 'idea').sort((a, b) => (b.score ?? -Infinity) - (a.score ?? -Infinity))
  const top4 = ideas.slice(0, 4).map((t) => `\`${t.id}\` ${t.title}（${t.score ?? '-'}）`)

  const now = new Date()
  const nearExpiry = ideas
    .map((t) => ({ t, preview: previewExpiry(t, now) }))
    .filter((x) => x.preview && x.preview.days >= 0)
    .sort((a, b) => a.preview!.days - b.preview!.days)
    .slice(0, 8)
    .map((x) => `\`${x.t.id}\` ${x.t.title}（${x.preview!.rule}，约 ${Math.ceil(x.preview!.days)} 天）`)

  const lines = [
    '',
    `选题池：${countLine}`,
    `next_up：${snapshot.backlog.nextUp ?? '空'}`,
    '',
    '按分最高 idea（前 4）：',
    ...(top4.length > 0 ? top4.map((s) => `- ${s}`) : ['- （无）']),
    '',
    '临近过期：',
    ...(nearExpiry.length > 0 ? nearExpiry.map((s) => `- ${s}`) : ['- （无）']),
    '',
  ]
  return lines.join('\n')
}

function renderAlertsZone(alerts: Alert[]): string {
  if (alerts.length === 0) return '\n（空——check 无警报）\n'
  const byLevel = { error: [] as Alert[], warn: [] as Alert[], info: [] as Alert[] }
  for (const a of alerts) byLevel[a.level].push(a)
  const lines: string[] = ['']
  for (const level of ['error', 'warn', 'info'] as const) {
    if (byLevel[level].length === 0) continue
    lines.push(`**${level}**（${byLevel[level].length}）：`)
    for (const a of byLevel[level]) lines.push(`- [${a.rule}] ${a.subject}: ${a.message}`)
    lines.push('')
  }
  return lines.join('\n')
}

/** 把若干区的新内容替换进 dashboard.md 全文；标记外一律不动。缺任一被点名区的标记 → E_NO_MARKERS（整体拒绝）。 */
export function replaceZones(mdText: string, zones: Partial<Record<DashboardZoneName, string>>): string {
  let out = mdText
  for (const [name, content] of Object.entries(zones) as [DashboardZoneName, string][]) {
    const re = zoneRegex(name)
    if (!re.test(out)) {
      throw new MediaError('E_NO_MARKERS', `dashboard.md 缺少 ${marker(name, 'begin')} / ${marker(name, 'end')} 标记，拒绝写入`)
    }
    out = out.replace(re, (_m, begin, _mid, end) => `${begin}${content}${end}`)
  }
  return out
}

export function hasAllMarkers(mdText: string): boolean {
  return (['wip', 'backlog', 'alerts'] as DashboardZoneName[]).every((name) => zoneRegex(name).test(mdText))
}
