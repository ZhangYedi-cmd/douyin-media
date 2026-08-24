// 运行账本的时间窗口（2026-08-19 走查后补）。
//
// 起因：server `GET /api/harness` 的 days 默认 30（routes/read.ts），账本按窗口过滤；
// 而治理线实际已停摆一个月（最后一次运行 2026-07-19），恰好落在窗口外一天，于是账本全空。
// 更糟的是同一页上半部分的「任务注册表」不走窗口，照常显示「最近 07-19 09:09」——
// 页面自己跟自己打架，且窗口既不可见也不可调，空态还写「所选时间范围内没有运行记录」，
// 而用户根本没选过任何范围。本文件把窗口变成可见、可调、且空态说得出实话的东西。
import type { HarnessTaskRow } from '@console/server/api-types'

export interface LedgerWindowOption {
  days: number
  label: string
}

/** 3650 天 ≈ 10 年，等价「全部」——server 只接受正数 days，没有「不限」参数，用足够大的值表达。 */
export const LEDGER_WINDOWS: LedgerWindowOption[] = [
  { days: 7, label: '近 7 天' },
  { days: 30, label: '近 30 天' },
  { days: 90, label: '近 90 天' },
  { days: 3650, label: '全部' },
]

export const DEFAULT_LEDGER_DAYS = 30

/** 注册表里最近一次运行的时间戳（账本被窗口切空时，用它告诉用户「其实最后一次是什么时候」）。 */
export function latestTaskRun(tasks: HarnessTaskRow[]): string | null {
  let latest: string | null = null
  for (const t of tasks) {
    if (!t.lastRun) continue
    if (latest === null || t.lastRun > latest) latest = t.lastRun
  }
  return latest
}

export function daysSince(iso: string, now: Date): number | null {
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return null
  return Math.floor((now.getTime() - t) / 86_400_000)
}

export interface LedgerEmptyHint {
  /** 空态主文案 */
  text: string
  /** 需要建议用户放宽窗口时给出的目标天数；null = 不必建议（已是全部，或压根没有历史记录）。 */
  suggestDays: number | null
}

/**
 * 账本为空时的说明文案。三种情形：
 * ① 注册表也没有任何运行记录 → 治理线确实一次都没跑过，别让用户去调窗口白费劲；
 * ② 有历史记录但落在当前窗口外 → 说清最后一次是什么时候、几天前，并建议放宽到刚好覆盖它的档位；
 * ③ 有历史记录且就在窗口内却仍为空 → 理论上不该发生，给个中性兜底，不硬编造原因。
 */
export function ledgerEmptyHint(days: number, tasks: HarnessTaskRow[], now: Date): LedgerEmptyHint {
  const latest = latestTaskRun(tasks)
  if (!latest) return { text: '治理线还没有任何运行记录。', suggestDays: null }

  const ago = daysSince(latest, now)
  const dateText = latest.slice(0, 10)

  if (ago !== null && ago >= days) {
    const suggest = LEDGER_WINDOWS.find((w) => w.days > ago)?.days ?? null
    return {
      // 只有走到这个分支才谈得上「几天前」：ago >= days 且 days 恒 >0，所以 ago 必 >0，不必处理「今天」。
      text: `最近 ${days} 天没有运行记录。最后一次运行是 ${dateText}（${ago} 天前），已经超出当前时间范围。`,
      suggestDays: suggest === days ? null : suggest,
    }
  }
  return { text: `最近 ${days} 天没有运行记录（注册表最后一次运行 ${dateText}）。`, suggestDays: null }
}
