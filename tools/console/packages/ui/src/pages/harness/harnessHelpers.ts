// P5 治理线纯逻辑（03-前端执行方案.md §2.7）：任务注册表「距上次运行」文案计算。抽出来单测，
// 不依赖 React 渲染（本包无 jsdom，见 lib/api.test.ts 顶部说明）。
import type { HarnessTaskRow } from '@console/server/api-types'

// trigger 字面量约定与 overview/HeartbeatBars.tsx 的 parsePeriodicDays 同一口径（harness/tasks.md
// 机器契约，见 server derive/tasksRegistry.ts）：periodic:Nd | event:... | weighted-pool:...
export function parsePeriodicDays(trigger: string): number | null {
  const m = /^periodic:(\d+)d$/.exec(trigger)
  return m ? Number(m[1]) : null
}

export function daysSince(iso: string, now: Date): number | null {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return Math.floor((now.getTime() - d.getTime()) / 86_400_000)
}

// 07-界面用语对照表 §3：触发方式的机器字面量不上屏，翻成中文短语（TaskRegistryTable 的
// 「触发方式」列用）。
export function triggerLabel(trigger: string): string {
  const periodicDays = parsePeriodicDays(trigger)
  if (periodicDays !== null) return periodicDays === 1 ? '每天' : `每 ${periodicDays} 天`
  if (trigger === 'weighted-pool') return '按权重抽取'
  if (trigger === 'post-publish-window') return '发布后窗口触发'
  return trigger // 兜底：未知触发器原样显示，不装作认识
}

export interface TaskRunText {
  text: string
  warn: boolean
}

/**
 * 「距上次运行」列文案：periodic 任务显「N 天」+ 逾期时尾缀「⚠ 逾期」；event/weighted-pool 等
 * 非固定周期任务直接显最近一次运行的日期时间（对照 docs/design/harness.html「最近 07-10 22:00」）；
 * 从无运行记录时两类都显「尚无运行记录」。overdue 直接采信 server 算好的字段（tasksRegistry.ts），
 * ui 不重算判据。
 */
export function taskRunText(task: HarnessTaskRow, now: Date): TaskRunText {
  if (!task.lastRun) return { text: '尚无运行记录', warn: task.overdue }
  const periodDays = parsePeriodicDays(task.trigger)
  if (periodDays !== null) {
    const since = daysSince(task.lastRun, now)
    return { text: `${since ?? '—'} 天${task.overdue ? ' ⚠ 逾期' : ''}`, warn: task.overdue }
  }
  const d = new Date(task.lastRun)
  const label = Number.isNaN(d.getTime())
    ? task.lastRun
    : `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(
        d.getMinutes(),
      ).padStart(2, '0')}`
  return { text: `最近 ${label}`, warn: task.overdue }
}
