// P4 选题池纯逻辑（03-前端执行方案.md §2.6）：过期判定 / 撞题查找 / promote slug 建议 /
// content_path→slug 提取。抽出来单测，不依赖 React 渲染（本包无 jsdom，见 lib/api.test.ts 顶部说明）。
import type { BacklogTopic } from '@console/core'
import type { BacklogCollision } from '@console/server/api-types'

const DAY_MS = 86_400_000

/** 过期口径「>30 天未动」（对照 docs/design/backlog.html「已 33 天 · 过期口径 >30 天」）。 */
export const STALE_THRESHOLD_DAYS = 30

export function daysSince(dateStr: string | undefined, now: Date): number | null {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return null
  return Math.floor((now.getTime() - d.getTime()) / DAY_MS)
}

export function isStale(topic: Pick<BacklogTopic, 'created'>, now: Date, thresholdDays = STALE_THRESHOLD_DAYS): boolean {
  const days = daysSince(topic.created, now)
  return days !== null && days > thresholdDays
}

export function countStale(ideas: BacklogTopic[], now: Date, thresholdDays = STALE_THRESHOLD_DAYS): number {
  return ideas.filter((t) => isStale(t, now, thresholdDays)).length
}

/** 最高分条目（score 为 null 的系列题免打分条目不参与比较）。 */
export function topScoreOf(ideas: BacklogTopic[]): { score: number; id: string } | null {
  let best: { score: number; id: string } | null = null
  for (const t of ideas) {
    if (t.score === null || t.score === undefined) continue
    if (!best || t.score > best.score) best = { score: t.score, id: t.id }
  }
  return best
}

/** 某条 idea 命中的撞题伙伴 id 列表（BacklogCollision.a/b 任一边匹配即算，对称查找）。 */
export function collisionPartnersOf(topicId: string, collisions: BacklogCollision[]): string[] {
  const partners: string[] = []
  for (const c of collisions) {
    if (c.a === topicId) partners.push(c.b)
    else if (c.b === topicId) partners.push(c.a)
  }
  return partners
}

/** backlog.yaml 的 content_path 形如 `content/2026-07-18/grok-build-teardown`（可能带尾斜杠）：取最后一段当 slug。 */
export function slugFromContentPath(contentPath: string | null | undefined): string | null {
  if (!contentPath) return null
  const segs = contentPath.split('/').filter(Boolean)
  return segs.length > 0 ? segs[segs.length - 1]! : null
}

/**
 * server whitelist.ts SLUG_RE 字面一致（ui 对 server 仅 type-only import，运行时正则无法跨包共享值，
 * 只能保持同一字面量——PromoteDialog 的表单校验与 suggestSlug 的产出都靠它兜底）。
 */
export const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{1,64}$/

/**
 * promote 的 slug 默认建议（03 §2.6「Modal 表单，默认值可从 id/标题 slugify 建议但允许改」）：
 * 选题标题几乎全是中文，抽不出 ≥3 位可用拉丁词时退化为「topic-<id 末 3 位>」——这只是个可编辑的
 * 起点，不追求语义完美，真实值由人在 Modal 里改。
 */
export function suggestSlug(title: string, id: string): string {
  const latin = title
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // 去掉 NFKD 拆出的组合变音符
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
  if (latin.length >= 3 && SLUG_PATTERN.test(latin)) return latin
  const tail = id
    .slice(-3)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
  return `topic-${tail || '001'}`
}
