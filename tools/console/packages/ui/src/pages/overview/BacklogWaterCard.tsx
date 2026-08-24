import { Link } from 'react-router-dom'
import type { BacklogWater } from '@console/server/api-types'

// 03 §2.3 ⑥：选题池水位——idea 存量 / 最高分，联动 ideate 逾期。
export interface BacklogWaterCardProps {
  backlogWater: BacklogWater
}

export function BacklogWaterCard({ backlogWater }: BacklogWaterCardProps) {
  const { ideaCount, topScore, topId, daysSinceIdeate } = backlogWater
  const healthy = ideaCount >= 3 // 「idea 存量（≥3 健康）」对照 overview.html 提示文案

  return (
    <section className="card" data-testid="backlog-water-card">
      <header>
        <h2>选题池水位</h2>
        <span className="right mono">backlog.yaml</span>
      </header>
      <div className="stats">
        <div className="stat">
          <div className="v" style={healthy ? undefined : { color: 'var(--danger)' }}>
            {ideaCount}
          </div>
          <div className="l">idea 存量（≥3 健康）</div>
        </div>
        <div className="stat">
          <div className="v">{topScore ?? '—'}</div>
          <div className="l">最高分{topId ? ` · ${topId}` : ''}</div>
        </div>
      </div>
      <p className="muted" style={{ marginTop: 'var(--space-3)', fontSize: 'var(--text-xs)' }}>
        距上次 ideate{' '}
        {daysSinceIdeate === null ? (
          '—'
        ) : (
          <b style={{ color: 'color-mix(in oklab, var(--warn), var(--fg) 40%)' }}>{daysSinceIdeate} 天</b>
        )}
        （联动治理逾期警报） · <Link to="/backlog">打开选题池 →</Link>
      </p>
    </section>
  )
}
