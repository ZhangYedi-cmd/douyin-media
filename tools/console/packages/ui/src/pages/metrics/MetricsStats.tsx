import { Statistic } from 'antd'
import type { MetricsData } from '@console/server/api-types'
import { formatCompact, formatPercent } from './format'

// ① 汇总条：Statistic ×5，缺失显「—」不装有（03 §2.8 布局区块图）。
export interface MetricsStatsProps {
  summary: MetricsData['summary']
  completionCount: number // 参与 avgCompletion 均值的条目数（本地由 snapshots 统计，不是 server 下发字段）
}

const NIL_STYLES = { content: { color: 'var(--muted)' } }

export function MetricsStats({ summary, completionCount }: MetricsStatsProps) {
  return (
    <section className="card" style={{ marginBottom: 'var(--space-4)', paddingBlock: 'var(--space-4)' }}>
      <div className="stats">
        <div className="stat">
          <Statistic title="已发布" value={summary.published} />
        </div>
        <div className="stat">
          <Statistic title="有数据快照" value={summary.withSnapshot} />
        </div>
        <div className="stat">
          <Statistic
            title={summary.avgCompletion !== undefined ? `平均完播（仅 ${completionCount} 条有值）` : '平均完播'}
            value={summary.avgCompletion !== undefined ? formatPercent(summary.avgCompletion) : '—'}
            styles={summary.avgCompletion === undefined ? NIL_STYLES : undefined}
          />
        </div>
        <div className="stat">
          <Statistic
            title="合计播放（有值条目）"
            value={summary.totalPlays !== undefined ? formatCompact(summary.totalPlays) : '—'}
            styles={summary.totalPlays === undefined ? NIL_STYLES : undefined}
          />
        </div>
        <div className="stat">
          <Statistic title="粉丝净增（复盘暂未采集）" value="—" styles={NIL_STYLES} />
        </div>
      </div>
    </section>
  )
}
