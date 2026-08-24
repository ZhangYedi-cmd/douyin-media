// P1「待我处理」的纯逻辑（03 §2.3 ④：损失分级排序 + 同类合并）。抽出来单测，不依赖 React 渲染
// （本包无 jsdom，见 lib/api.test.ts 顶部说明）。
import type { Todo } from '@console/server/api-types'

export interface TodoGroup {
  key: string // = todo.kind（同类合并的分组键）
  severity: Todo['severity']
  title: string // 取首条的 title 作代表文案
  count: number // 同类条数，>1 时 UI 尾缀 ×N（对齐 AlertCard 的 count 约定，03 §2.9）
  to: string
  slug?: string
  since?: string
  deadline?: string
}

const SEVERITY_RANK: Record<Todo['severity'], number> = { error: 0, warn: 1, info: 2 }

/**
 * 按 kind 合并同类项（保留首条出现顺序内的展示字段，计数累加），再按 severity 做「损失分级排序」
 * （error 置顶，同级内保持原相对顺序——稳定排序，不额外引入次级排序键）。
 */
export function groupTodos(todos: Todo[]): TodoGroup[] {
  const order: string[] = []
  const map = new Map<string, TodoGroup>()
  for (const t of todos) {
    const existing = map.get(t.kind)
    if (existing) {
      existing.count += 1
      continue
    }
    map.set(t.kind, {
      key: t.kind,
      severity: t.severity,
      title: t.title,
      count: 1,
      to: t.to,
      slug: t.slug,
      since: t.since,
      deadline: t.deadline,
    })
    order.push(t.kind)
  }
  return order
    .map((k) => map.get(k)!)
    .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity])
}

export type TodoTarget = { kind: 'content'; slug: string } | { kind: 'file'; path: string } | { kind: 'route'; path: string }

const FILE_LINK_RE = /^\/api\/file\?path=([^&]+)$/

/**
 * `todo.to` 字面值是 server 侧算好的兜底（projections.ts `alertsToTodos`）：多数是
 * `/api/file?path=…`，或在证据路径缺失时退化成 `/contents`——但 `/contents` 并非本站已注册路由
 * （见 app/routes.tsx，只有 `/kanban` 承担生产列表）。本函数做 UI 侧更贴合 03 §2.3「Link 到
 * P3/P4/P5」意图的重解释：有 slug 时优先直达 P3 详情（比打开文件更有用）；否则文件链接转
 * FileDrawer；`/contents` 归一到真实存在的 `/kanban`（server 侧已知偏差，ui 侧防御性映射，
 * 不改 server 代码——白名单边界见 05 分工表）。
 */
export function resolveTodoTarget(todo: Pick<Todo, 'slug' | 'to'>): TodoTarget {
  if (todo.slug) return { kind: 'content', slug: todo.slug }
  const m = FILE_LINK_RE.exec(todo.to)
  if (m) return { kind: 'file', path: decodeURIComponent(m[1]!) }
  if (todo.to === '/contents') return { kind: 'route', path: '/kanban' }
  return { kind: 'route', path: todo.to }
}
