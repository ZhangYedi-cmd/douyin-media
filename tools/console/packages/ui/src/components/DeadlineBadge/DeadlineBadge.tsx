import { useEffect, useState } from 'react'
import { computeDeadlineState } from './deadline'
import styles from './DeadlineBadge.module.css'

// 03 §2.9 DeadlineBadgeProps——停留时长 / 死线倒计时（P1 待办、P2 行、P3 头卡）。
export interface DeadlineBadgeProps {
  since?: string // ISO：从何时开始停留（二选一或都传）
  deadline?: string // ISO：死线，显示剩余时间倒计时
  warnAfterHours?: number // 停留超此值转 warn，默认 48
  dangerAfterHours?: number // 超此值转 danger，默认不启用
  prefix?: string // 如「review 停留」「排期已过」
}

const TICK_MS = 60_000 // 每 60s 重算文案与色档

export function DeadlineBadge({ since, deadline, warnAfterHours, dangerAfterHours, prefix }: DeadlineBadgeProps) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), TICK_MS)
    return () => clearInterval(timer)
  }, [])

  const state = computeDeadlineState({ since, deadline, warnAfterHours, dangerAfterHours, prefix }, now)
  const levelClass = state.level === 'warn' ? styles.warn : state.level === 'danger' ? styles.danger : ''

  return <span className={`${styles.badge} ${levelClass}`.trim()}>{state.text}</span>
}
