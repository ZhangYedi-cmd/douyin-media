// P6 数据复盘（`#/metrics`，03-前端执行方案.md §2.8，建造序 6，S10 落地）。
// 唯一数据源 harness/logs/metrics.jsonl（经 GET /api/metrics 投影）；空值不装有、数据不足不画线。
import { Empty, Skeleton } from 'antd'
import { usePageData } from '../../lib/store'
import type { MetricsData } from '@console/server/api-types'
import { LineChart } from '../../components/LineChart'
import { CommandChip } from '../../components/CommandChip'
import { MetricsStats } from './MetricsStats'
import { SnapshotTable } from './SnapshotTable'
import { FunnelQuotes } from './FunnelQuotes'
import { buildTrendPoints, formatPercent } from './format'

export default function MetricsPage() {
  const { data, error, reload } = usePageData<MetricsData>('/api/metrics')

  return (
    <div className="page">
      <div className="page-head">
        <h1>数据复盘</h1>
        <span className="sub">已发布内容的表现数据（由复盘任务定期抓取）</span>
      </div>

      {error ? (
        <section className="card" style={{ marginBottom: 'var(--space-4)' }}>
          <p className="muted">加载失败：{error.message}</p>
          <button type="button" className="btn btn-sm" onClick={reload} style={{ marginTop: 'var(--space-2)' }}>
            重试
          </button>
        </section>
      ) : null}

      {!data && !error ? <Skeleton active paragraph={{ rows: 8 }} /> : null}

      {/* 空态：metrics.jsonl 不存在（或存在但无行）→ available:false（S10 验收①，02 §2.1 C6 语义） */}
      {data && !data.available ? (
        <section className="card">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <div>
                <p style={{ fontWeight: 600, margin: 0 }}>还没有复盘数据</p>
                <p className="muted" style={{ fontSize: 'var(--text-sm)', marginTop: 4 }}>
                  已发布内容的播放数据由复盘任务抓取后才会出现在这里
                </p>
              </div>
            }
          />
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'var(--space-3)' }}>
            <CommandChip command="media metrics record" />
          </div>
        </section>
      ) : null}

      {data && data.available ? (
        <>
          <MetricsStats
            summary={data.summary}
            completionCount={data.snapshots.filter((s) => s.completion !== undefined).length}
          />

          <div className="grid" style={{ gridTemplateColumns: '3fr 2fr', alignItems: 'start', marginBottom: 'var(--space-4)' }}>
            <section className="card">
              <header>
                <h2>完播率趋势（按发布日期）</h2>
                <span className="right">数据点 ≥ 5 才绘制折线；不足时只显示下方快照表</span>
              </header>
              <LineChart
                points={buildTrendPoints(data.trend, data.snapshots)}
                yFormat={formatPercent}
                annotateMax
                fallback={<p className="muted">数据点不足 5 个，暂不绘制趋势线 · 见下方数据快照表</p>}
              />
            </section>

            <FunnelQuotes quotes={data.funnelQuotes} />
          </div>

          <SnapshotTable snapshots={data.snapshots} />
        </>
      ) : null}
    </div>
  )
}
