// endpoint→media args 映射表：唯一允许拼 media 参数的地方（02-后端执行方案.md §2.2）。
// 全部走 execFile args 数组，不经 shell（注入面为零，上游拍板 §5）。

export const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,64}$/
export const BACKLOG_ID_RE = /^\d{4}-\d{2}-\d{2}-\d{3}$/

export function isValidSlug(s: unknown): s is string {
  return typeof s === 'string' && SLUG_RE.test(s)
}

export function isValidBacklogId(s: unknown): s is string {
  return typeof s === 'string' && BACKLOG_ID_RE.test(s)
}

export type ReviewDecision = 'approved' | 'rework' | 'rejected'

/** POST /api/actions/review：decision 映射写死（02 §2.2 #1）。rework/rejected 的 reason 必填由路由层校验。 */
export function reviewArgs(slug: string, decision: ReviewDecision, reason: string | undefined, dryRun: boolean): string[] {
  const base =
    decision === 'approved'
      ? ['flip', slug, 'approved']
      : decision === 'rework'
        ? ['flip', slug, 'drafting', '--reason', reason!]
        : ['flip', slug, 'rejected', '--reason', reason!]
  return withCommonFlags(base, dryRun)
}

/** POST /api/actions/backlog-apply（02 §2.2 #2）。 */
export function backlogApplyArgs(
  id: string,
  action: 'merge' | 'archive',
  proposal: string,
  into: string | undefined,
  dryRun: boolean,
): string[] {
  const base = ['backlog', 'apply', id, '--action', action, '--proposal', proposal]
  if (action === 'merge') base.push('--into', into!)
  return withCommonFlags(base, dryRun)
}

/**
 * POST /api/actions/promote（02 §2.2 #3）。
 * 已知偏差（见最终报告未决项）：02 表格给出的 execFile 示例 `["promote",id,"--json"]` 未带 `--slug`，
 * 但 01-CLI执行方案.md 实际落地的 `media promote` 把 `--slug <slug>` 定为 requiredOption（无自动生成逻辑），
 * 二者对不上——本实现让请求体必须显式带 slug（UI 侧收集），否则 400，不替用户瞎猜 slugify 规则。
 */
export function promoteArgs(params: { id?: string; auto?: boolean; slug: string; date?: string }, dryRun: boolean): string[] {
  const base = ['promote']
  if (params.id) base.push(params.id)
  if (params.auto) base.push('--auto')
  base.push('--slug', params.slug)
  if (params.date) base.push('--date', params.date)
  return withCommonFlags(base, dryRun)
}

/** POST /api/actions/next-up（02 §2.2 #4）。 */
export function nextUpArgs(params: { id?: string; clear?: boolean }, dryRun: boolean): string[] {
  const base = params.clear ? ['next-up', 'clear'] : ['next-up', 'set', params.id!]
  return withCommonFlags(base, dryRun)
}

function withCommonFlags(args: string[], dryRun: boolean): string[] {
  const out = [...args, '--json']
  if (dryRun) out.push('--dry-run')
  return out
}
