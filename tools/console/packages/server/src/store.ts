// Store：revision 唯一产地（02-后端执行方案.md §2.5）。
import fs from 'node:fs'
import path from 'node:path'
import { buildSnapshot, computeAlerts, DEFAULT_ALERT_CFG } from '@console/core'
import type { Alert, Snapshot } from '@console/core'
import { deriveDailyTrace, deriveHarnessToday } from './derive/trace.js'
import { deriveHarnessTasks } from './derive/tasksRegistry.js'
import type { DailyRun, HarnessTaskRow, HarnessTodaySummary } from './api-types.js'
import type { SseHub } from './sse.js'

export type RebuildReason = 'fs' | 'tick' | 'boot'

const TICK_MS = 600_000 // 10min（后端拍板 B3：时间型警报在文件不动时也要过期）

export class Store {
  readonly root: string
  snapshot!: Snapshot
  alerts: Alert[] = []
  revision = 0
  buildMs = 0
  builtAt = ''
  dailyRun!: DailyRun
  harnessToday!: HarnessTodaySummary
  harnessTasks: HarnessTaskRow[] = []

  private prevAlertKeys = new Set<string>()
  private firstBuild = true
  private sse: SseHub | null = null
  private tickTimer: ReturnType<typeof setInterval> | null = null

  constructor(root: string) {
    this.root = root
  }

  attachSse(sse: SseHub): void {
    this.sse = sse
  }

  /** 首次构建：不广播（尚无客户端），供 index.ts 启动时同步调用一次。 */
  init(): void {
    this.rebuildInternal('boot', false)
  }

  rebuild(reason: RebuildReason): void {
    this.rebuildInternal(reason, true)
  }

  private rebuildInternal(reason: RebuildReason, broadcast: boolean): void {
    const t0 = performance.now()
    const snap = buildSnapshot(this.root)
    const now = new Date()
    const raw = computeAlerts(snap, now, DEFAULT_ALERT_CFG)
    this.alerts = this.debounceAlerts(raw)
    this.snapshot = snap
    this.revision++
    this.buildMs = performance.now() - t0
    this.builtAt = now.toISOString()

    this.dailyRun = deriveDailyTrace(this.root, snap, now)
    this.harnessToday = deriveHarnessToday(snap, now)
    this.harnessTasks = deriveHarnessTasks(this.readTasksRaw(), snap.harness, now)

    if (broadcast) this.sse?.broadcast('refresh', { revision: this.revision, reason })
  }

  private readTasksRaw(): string {
    const p = path.join(this.root, 'harness/tasks.md')
    try {
      return fs.readFileSync(p, 'utf8')
    } catch {
      return ''
    }
  }

  /**
   * 连续两次快照都在才算 active（后端拍板 §8 坑2 跨文件中间态假警报兜底）；新警报最迟下次重建转正。
   *
   * 首拍例外（R2 报告修复）：进程刚起、watcher 尚未收到任何事件时只有这一次快照，没有「上一次」可比对——
   * 若无脑套用「连续两次都在」的规则，空的 prevAlertKeys 会把全部警报当噪声滤掉，`/api/overview` 的
   * alerts 冷启动恒为 []，与同一时刻 `media check` 的真实结果不一致，直到下一次 rebuild（文件事件或
   * ≤10min tick）才会回正——这段窗口对刚启动就看板的人是彻底的假阴性。首拍直接信 computeAlerts 全量，
   * 不去抖；从第二次 rebuild 起再恢复「连续两次都在」的正常去抖语义。
   */
  private debounceAlerts(raw: Alert[]): Alert[] {
    const keys = new Set(raw.map((a) => a.key))
    if (this.firstBuild) {
      this.firstBuild = false
      this.prevAlertKeys = keys
      return raw
    }
    const stable = raw.filter((a) => this.prevAlertKeys.has(a.key))
    this.prevAlertKeys = keys
    return stable
  }

  startTick(): void {
    if (this.tickTimer) return
    this.tickTimer = setInterval(() => this.rebuild('tick'), TICK_MS)
    this.tickTimer.unref?.()
  }

  stopTick(): void {
    if (this.tickTimer) clearInterval(this.tickTimer)
    this.tickTimer = null
  }
}
