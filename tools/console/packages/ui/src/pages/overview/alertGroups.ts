// P1「警报」区分组折叠的纯逻辑（E1：同一类问题——如「published 无作品链接」（CHK-05）——出现
// 17 条时被逐条平铺，警报区被拉成三屏；而右侧「待我处理」经 todoGroups.ts 的 groupTodos 早已把
// 同类合并成一行 ×17。两处「同类」判定口径必须一致，这里直接复用同一个键：server
// routes/projections.ts 的 alertsToTodos() 用 `kind = a.rule` 当合并键，本函数同样按 `rule` 分组。
//
// 只做分组/排序，不判定「该不该折叠」「默认展不展开」——那两条各自独立导出成纯函数
// （isCollapsible / defaultExpanded），供 AlertSection.tsx 消费，也分别单测覆盖边界。
import type { Alert } from '@console/core'

export interface AlertGroup {
  key: string // = alert.rule（同类判定键，与 server alertsToTodos()「kind = a.rule」同源）
  level: Alert['level'] // 同 rule 下 level 恒定（core computeAlerts 每条规则固定写死一个 level），取首条即可
  message: string // 代表文案，取首条 message（同 todoGroups.ts「取首条 title 作代表文案」的既有口径；
  // CHK-01 等规则的 message 会按 subject 插值、同组内文案可能不完全一致，取首条是已知的可接受近似）
  count: number
  items: Alert[] // 组内全部原始 alert，供展开渲染逐条明细——聚合不能丢证据链接（evidencePath）
}

const LEVEL_RANK: Record<Alert['level'], number> = { error: 0, warn: 1, info: 2 }

/**
 * 按 rule 合并同类警报（保留首次出现顺序内的展示字段，条目原样累加进 items），
 * 再按 level 做「阻塞优先」排序（error 置顶，同级内保持原相对顺序——稳定排序，不引入次级排序键，
 * 与 todoGroups.ts groupTodos 的排序方式一致）。
 */
export function groupAlerts(alerts: Alert[]): AlertGroup[] {
  const order: string[] = []
  const map = new Map<string, AlertGroup>()
  for (const a of alerts) {
    const existing = map.get(a.rule)
    if (existing) {
      existing.items.push(a)
      existing.count += 1
      continue
    }
    map.set(a.rule, { key: a.rule, level: a.level, message: a.message, count: 1, items: [a] })
    order.push(a.rule)
  }
  return order
    .map((k) => map.get(k)!)
    .sort((a, b) => LEVEL_RANK[a.level] - LEVEL_RANK[b.level])
}

/** 是否需要折叠展示：只有一条同类时应当直接铺开（不该折叠），凑够 2 条以上才收成一行。 */
export function isCollapsible(group: Pick<AlertGroup, 'count'>): boolean {
  return group.count > 1
}

/**
 * 默认展开态（P1 修法原文「默认只展开阻塞级（error）」）：只有 error 默认展开，warn/info 默认收起。
 * 只对可折叠的组（count>1）有意义——count=1 的组不走 details/summary，不受此函数影响。
 */
export function defaultExpanded(group: Pick<AlertGroup, 'level'>): boolean {
  return group.level === 'error'
}
