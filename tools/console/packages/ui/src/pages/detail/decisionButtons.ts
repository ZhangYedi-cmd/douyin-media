// P3 决策区的按钮矩阵（03 §2.5「动作矩阵」表）纯逻辑：给定 meta.status + allowedTransitions +
// publish_url 是否已有，算出该展示哪些按钮、背后调哪个动作。抽出来单测，不依赖 React 渲染
// （本包无 jsdom，见 lib/api.test.ts 顶部说明）。
//
// 按钮可用性以 allowedTransitions 为准（server 下发，03 §2.5 原文「前端不自判状态机」）：
// review 状态下的三个 flip 按钮（approved/drafting/rejected）分别按 allowedTransitions 是否
// 含对应 to 值来决定是否渲染；「派发重做任务」是另一条独立动线（job 而非 flip），按 meta.status
// 本身出现在 review/rejected/drafting 三态时展示（表格行原文：
// 「review / rejected / drafting(被打回) | 派发重做任务」），不经 allowedTransitions 门控
// ——它调用的是 rework job（不是状态机的 flip 迁移，server 也不会把它算进 allowedTransitions）。
import type { MetaStatus } from '@console/core'
import type { AllowedTransition, ContentCheck } from '@console/server/api-types'

export type FlipDecision = 'approved' | 'rework' | 'rejected'

export interface FlipButton {
  kind: 'flip'
  decision: FlipDecision
  label: string
  requiresReason: boolean
}

export interface PublishButton {
  kind: 'publish'
  label: string
}

export interface ReworkJobButton {
  kind: 'rework-job'
  label: string
}

export interface CopyUrlButton {
  kind: 'copy-url'
  label: string
  command: string
}

export type DecisionButton = FlipButton | PublishButton | ReworkJobButton | CopyUrlButton

const FLIP_SPECS: { to: MetaStatus; decision: FlipDecision; label: string; requiresReason: boolean }[] = [
  { to: 'approved', decision: 'approved', label: '审核通过', requiresReason: false },
  { to: 'drafting', decision: 'rework', label: '打回修改', requiresReason: true },
  { to: 'rejected', decision: 'rejected', label: '否决', requiresReason: true },
]

export interface DecisionButtonsInput {
  status: MetaStatus
  allowedTransitions: AllowedTransition[]
  publishUrl?: string | null
  slug: string
}

/** 对照 03 §2.5 动作矩阵表逐状态映射，返回本状态下应渲染的按钮描述（不含 React/antd 依赖）。 */
export function computeDecisionButtons(input: DecisionButtonsInput): DecisionButton[] {
  const { status, allowedTransitions, publishUrl, slug } = input
  const legalTo = new Set(allowedTransitions.map((t) => t.to))
  const buttons: DecisionButton[] = []

  if (status === 'review') {
    for (const spec of FLIP_SPECS) {
      if (legalTo.has(spec.to)) {
        buttons.push({ kind: 'flip', decision: spec.decision, label: spec.label, requiresReason: spec.requiresReason })
      }
    }
  }

  if (status === 'approved') {
    buttons.push({ kind: 'publish', label: '确认发布' })
  }

  if (status === 'review' || status === 'rejected' || status === 'drafting') {
    buttons.push({ kind: 'rework-job', label: '派发重做任务' })
  }

  if (status === 'published' && !publishUrl) {
    buttons.push({ kind: 'copy-url', label: '补作品链接', command: `media publish-done ${slug} --url <粘贴>` })
  }

  return buttons
}

// ── C2（P1）确认发布摘要 ──────────────────────────────────────────────────
// 「确认发布」会把视频真实发布到抖音账号且不可撤销，但此前 useJobAction 的确认弹窗只有一句
// 通用话术，不说要发哪条、有没有物料、有没有排期——风险和摩擦成反比。这里把摘要的构造抽成
// 纯函数（不依赖 React/antd，可单测），DecisionPanel 只负责拿这份视图去渲染 JSX；数据全部来自
// 页面已有的 checks/meta，不为此新增接口（任务卡原文要求）。

export interface PublishSummaryInput {
  slug: string
  title?: string
  schedule?: string | null
  checks: ContentCheck[]
}

export interface PublishSummaryCheck {
  ready: boolean // level === 'ok'
  note: string
}

export interface PublishSummaryView {
  slug: string
  title: string
  scheduleText: string
  cover: PublishSummaryCheck
  video: PublishSummaryCheck
}

/** checks 里「封面」「成片」两条已出/未出结论由 server projectContentDetail 固定下发
 * （projections.ts 原文 label 即为这两个字），这里按 label 取出、缺失时给出「未知」的保守兜底。 */
export function buildPublishSummary(input: PublishSummaryInput): PublishSummaryView {
  const findCheck = (label: string): PublishSummaryCheck => {
    const hit = input.checks.find((c) => c.label === label)
    return { ready: hit?.level === 'ok', note: hit?.note ?? '未知' }
  }
  return {
    slug: input.slug,
    title: input.title && input.title.trim() !== '' ? input.title : '（无标题）',
    scheduleText: input.schedule ? `定时发布 · ${input.schedule}` : '立即发布（未设置定时）',
    cover: findCheck('封面'),
    video: findCheck('成片'),
  }
}
