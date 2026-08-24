// harness/tasks.md 注册表派生（02-后端执行方案.md §2.1 GET /api/harness .tasks）。
// tasks.md 本身不是 core Snapshot 覆盖的文件（core 只聚合 content/backlog/harness-index/metrics），
// 故这里单独解析——store.ts 在同一次 rebuild() 里把 tasks.md 原文一起读入，喂给本纯函数（不做二次现场 IO）。
import type { HarnessRun } from '@console/core'
import { parseYamlValue } from '@console/core'
import type { HarnessTaskRow } from '../api-types.js'

interface RawTaskDef {
  task: string
  skill?: string
  enabled?: boolean
  trigger?: string
  windows?: string[]
  weight?: number
}

/** tasks.md 里唯一一个 ```yaml 代码围栏块 = 机器契约（文件头注释原文）；解析失败返回空表，不抛穿。 */
export function parseTasksRegistry(raw: string): RawTaskDef[] {
  const m = /```ya?ml\n([\s\S]*?)```/.exec(raw)
  if (!m) return []
  try {
    const parsed = parseYamlValue(m[1]!) as { tasks?: RawTaskDef[] } | undefined
    return Array.isArray(parsed?.tasks) ? parsed.tasks.filter((t) => typeof t?.task === 'string') : []
  } catch {
    return []
  }
}

function parsePeriodDays(trigger: string | undefined): number | null {
  if (!trigger) return null
  const m = /^periodic:(\d+)d$/.exec(trigger)
  return m ? Number(m[1]) : null
}

/**
 * lastRun/overdue 计算口径：
 * - periodic:Nd：距上次成功运行（harness index 里 task 同名的最新 ts）≥N 天算 overdue；从无运行记录也算 overdue（首跑待发生）。
 * - post-publish-window / weighted-pool：事件触发或加权池抽签，非固定周期，overdue 恒 false
 *   （已知简化——02 契约未定义这两类触发器的「逾期」判据，留待人审 harness 页时按实际体验补）。
 * - disabled 任务恒 overdue=false（不该跑）。
 */
export function deriveHarnessTasks(tasksRaw: string, harness: HarnessRun[], now: Date): HarnessTaskRow[] {
  const defs = parseTasksRegistry(tasksRaw)
  return defs.map((d) => {
    const runs = harness.filter((r) => r.task === d.task && typeof r.ts === 'string')
    const lastRun = runs.length > 0 ? [...runs].map((r) => r.ts).sort().at(-1)! : null
    const periodDays = parsePeriodDays(d.trigger)
    let overdue = false
    if (d.enabled && periodDays !== null) {
      if (!lastRun) {
        overdue = true
      } else {
        const last = new Date(lastRun)
        if (!Number.isNaN(last.getTime())) {
          const days = (now.getTime() - last.getTime()) / 86_400_000
          overdue = days >= periodDays
        }
      }
    }
    return {
      name: d.task,
      skill: d.skill ?? null,
      enabled: !!d.enabled,
      trigger: d.trigger ?? '',
      windows: d.windows,
      lastRun,
      overdue,
    }
  })
}
