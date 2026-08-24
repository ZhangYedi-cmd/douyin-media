// 纯函数：DeadlineBadge 的文案与色档计算，从组件里抽出来单测（无 DOM 依赖）。
// 03 §2.9 DeadlineBadgeProps：
//   since?      ISO：从何时开始停留
//   deadline?   ISO：死线，显示剩余时间倒计时
//   warnAfterHours?   停留超此值转 warn，默认 48
//   dangerAfterHours? 超此值转 danger，默认不启用
//   prefix?     如「review 停留」「排期已过」
//
// since 与 deadline 二选一或都传；实现取「since 优先，否则用 deadline」。
// deadline 模式：deadline 已过时按「过期时长」套用与 since 相同的 warn/danger 阈值
//（未过期时保持 default，文案显示剩余时间）。

export type DeadlineLevel = 'default' | 'warn' | 'danger'

export interface DeadlineBadgeInput {
  since?: string
  deadline?: string
  warnAfterHours?: number
  dangerAfterHours?: number
  prefix?: string
}

export interface DeadlineState {
  level: DeadlineLevel
  text: string
}

const HOUR_MS = 60 * 60 * 1000

function levelForHours(hours: number, warnAfterHours: number, dangerAfterHours?: number): DeadlineLevel {
  if (dangerAfterHours !== undefined && hours >= dangerAfterHours) return 'danger'
  if (hours >= warnAfterHours) return 'warn'
  return 'default'
}

function formatElapsed(hours: number): string {
  if (hours < 24) return `${Math.floor(hours)} 小时`
  return `${Math.floor(hours / 24)} 天`
}

function formatRemaining(hours: number): string {
  if (hours < 24) return `${Math.ceil(hours)} 小时`
  return `${Math.ceil(hours / 24)} 天`
}

export function computeDeadlineState(input: DeadlineBadgeInput, now: Date): DeadlineState {
  const warnAfterHours = input.warnAfterHours ?? 48
  const prefixText = input.prefix ? `${input.prefix} ` : ''

  if (input.since) {
    const elapsedHours = (now.getTime() - new Date(input.since).getTime()) / HOUR_MS
    const level = levelForHours(elapsedHours, warnAfterHours, input.dangerAfterHours)
    return { level, text: `${prefixText}${formatElapsed(Math.max(0, elapsedHours))}` }
  }

  if (input.deadline) {
    const remainingHours = (new Date(input.deadline).getTime() - now.getTime()) / HOUR_MS
    if (remainingHours <= 0) {
      const overdueHours = -remainingHours
      const level = levelForHours(overdueHours, warnAfterHours, input.dangerAfterHours)
      return { level, text: `${prefixText}已过 ${formatElapsed(overdueHours)}` }
    }
    return { level: 'default', text: `${prefixText}剩 ${formatRemaining(remainingHours)}` }
  }

  return { level: 'default', text: prefixText.trim() || '—' }
}
