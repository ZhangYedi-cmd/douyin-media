import type { BacklogData } from '@console/server/api-types'
import type { BacklogTopic } from '@console/core'
import { countStale, topScoreOf } from './backlogHelpers'

// 03 §2.6 ①：水位摘要条（Statistic ×5：idea 存量/最高分/超30天/撞题对数/picked·published）。
export interface PoolStatsProps {
  stats: BacklogData['stats']
  ideas: BacklogTopic[]
  collisionsCount: number
  now: Date
}

export function PoolStats({ stats, ideas, collisionsCount, now }: PoolStatsProps) {
  const top = topScoreOf(ideas)
  const stale = countStale(ideas, now)

  return (
    <section className="card" style={{ marginBottom: 'var(--space-4)', paddingBlock: 'var(--space-4)' }} data-testid="pool-stats">
      <div className="stats">
        <div className="stat">
          <div className="v">{stats.idea}</div>
          <div className="l">idea 存量</div>
        </div>
        <div className="stat">
          <div className="v">{top ? top.score.toFixed(1) : '—'}</div>
          <div className="l">最高分{top ? ` · ${top.id}` : ''}</div>
        </div>
        <div className="stat">
          <div className="v" style={{ color: 'var(--muted)' }}>
            {stale}
          </div>
          <div className="l">超 30 天未动（标灰）</div>
        </div>
        <div className="stat">
          <div className="v" style={collisionsCount > 0 ? { color: 'color-mix(in oklab, var(--warn), var(--fg) 40%)' } : undefined}>
            {collisionsCount} 对
          </div>
          <div className="l">撞题对数</div>
        </div>
        <div className="stat">
          <div className="v">
            {stats.picked} / {stats.published}
          </div>
          <div className="l">已取题 / 已发布（折叠在下）</div>
        </div>
      </div>
    </section>
  )
}
