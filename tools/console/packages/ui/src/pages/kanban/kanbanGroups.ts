// P2 看板纯逻辑（03-前端执行方案.md §2.4）：状态分组 / published·rejected 折叠区排序。
// 抽出来单测，不依赖 React 渲染（本包无 jsdom，见 lib/api.test.ts 顶部说明）。
import type { MetaStatus } from '@console/core'
import type { ContentSummary } from '@console/server/api-types'

// 五个「在制」分组，口径与 overview/WipStats.tsx 的 WIP_ORDER 一致（S9 验收①「各状态分组条数与
// P1 在制统计一致（同一 snapshot 口径）」的字面要求）。两处字面量重复是刻意的：WipStats.tsx 是
// P1 的页面私有文件，不出目录（AI 约定 1），无法跨页 import，同一枚举顺序只能各写一份。
export const WIP_STATUS_ORDER: MetaStatus[] = ['ideated', 'drafting', 'review', 'approved', 'scheduled']

export interface StatusGroup {
  status: MetaStatus
  items: ContentSummary[]
}

/** 空组不剔除（交给渲染层判断隐藏），保持顺序与 WIP_STATUS_ORDER 一致。 */
export function groupByWipStatus(items: ContentSummary[]): StatusGroup[] {
  return WIP_STATUS_ORDER.map((status) => ({ status, items: items.filter((i) => i.status === status) }))
}

/** published 折叠区：published + retro_done 合并展示（retro_done 是复盘完成的终态，仍算「已发布」），按发布时间倒序。 */
export function publishedGroup(items: ContentSummary[]): ContentSummary[] {
  return items
    .filter((i) => i.status === 'published' || i.status === 'retro_done')
    .sort((a, b) => (b.timestamps.published ?? '').localeCompare(a.timestamps.published ?? ''))
}

export function rejectedGroup(items: ContentSummary[]): ContentSummary[] {
  return items.filter((i) => i.status === 'rejected')
}
