import { Link } from 'react-router-dom'
import type { Heartbeat } from '@console/server/api-types'
import styles from './overview.module.css'

// 03 §2.3 ⑤：治理线心跳——periodic 任务距上次运行进度条（超期变 warn）；event/权重池任务只显最近。
// R6（第三波修复，2026-08-19）：任务名（对账用原文，不能改名）比全局 .hb-row .name 固定列宽更长时
// 会逐字挤断——用 overview.module.css 的 .taskName 单行省略号 + title 悬停看全名（见该处注释）。
export interface HeartbeatBarsProps {
  heartbeat: Heartbeat[]
}

function parsePeriodicDays(trigger: string): number | null {
  const m = /^periodic:(\d+)d$/.exec(trigger)
  return m ? Number(m[1]) : null
}

// 07-界面用语对照表 §3：触发方式的机器字面量不上屏，翻成中文短语。
function triggerLabel(trigger: string, periodicDays: number | null): string {
  if (periodicDays !== null) return periodicDays === 1 ? '每天' : `每 ${periodicDays} 天`
  if (trigger === 'weighted-pool') return '按权重抽取'
  if (trigger === 'post-publish-window') return '发布后窗口触发'
  return trigger // 兜底：未知触发器原样显示，不装作认识
}

function daysSince(iso: string, now: Date): number | null {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return Math.floor((now.getTime() - d.getTime()) / 86_400_000)
}

export function HeartbeatBars({ heartbeat }: HeartbeatBarsProps) {
  const now = new Date()
  return (
    <section className="card" data-testid="heartbeat-bars">
      <header>
        <h2>治理线心跳</h2>
        <span className="right">
          {heartbeat.length} 个已注册任务 · <Link to="/harness">治理线</Link>
        </span>
      </header>
      <div className="hb">
        {heartbeat.map((h) => {
          const periodicDays = parsePeriodicDays(h.trigger)
          const since = h.lastRun ? daysSince(h.lastRun, now) : null
          const pct = periodicDays && since !== null ? Math.min(100, (since / periodicDays) * 100) : h.overdue ? 100 : 0
          return (
            <div className="hb-row" key={h.task}>
              <div className="name">
                <span className={styles.taskName} title={h.task}>
                  {h.task}
                </span>
                <small>{triggerLabel(h.trigger, periodicDays)}</small>
              </div>
              {periodicDays ? (
                <div className={`hb-bar${h.overdue ? ' over' : ''}`}>
                  <i style={{ width: `${pct}%` }} />
                </div>
              ) : (
                <div className="muted" style={{ fontSize: 11 }}>
                  按需触发，不算逾期
                </div>
              )}
              <div className="val" style={h.overdue ? { color: 'color-mix(in oklab, var(--warn), var(--fg) 40%)' } : undefined}>
                {since === null ? '尚无历史记录' : `距上次 ${since} 天`}
                {h.overdue ? ' ⚠ 逾期' : ''}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
