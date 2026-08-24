// P2 看板（`#/kanban`）——03-前端执行方案.md §2.4 全文。拍板已瘦身：单人在制 0~2 条，
// 七列全宽降级为按状态分组的列表，published 折叠只显示最近 5 条；写动作以「去审核」「去发布」
// 跳转 P3 为主，2026-08-19 追加已选题行「开始创作」是本页第一个原地写动作（不跳转，见 ContentRow.tsx）。
import { useMemo } from 'react'
import { Alert as AntAlert, Skeleton } from 'antd'
import type { ContentsData } from '@console/server/api-types'
import { usePageData } from '../../lib/store'
import { StatusSection } from './StatusSection'
import { ContentRow } from './ContentRow'
import { ParseFailCard } from './ParseFailCard'
import { groupByWipStatus, publishedGroup, rejectedGroup } from './kanbanGroups'

const RECENT_PUBLISHED_LIMIT = 5

export default function KanbanPage() {
  const { data, error } = usePageData<ContentsData>('/api/contents')

  const groups = useMemo(() => (data ? groupByWipStatus(data.items) : []), [data])
  const published = useMemo(() => (data ? publishedGroup(data.items) : []), [data])
  const rejected = useMemo(() => (data ? rejectedGroup(data.items) : []), [data])

  return (
    <div className="page">
      <div className="page-head">
        <h1>生产看板</h1>
        <span className="sub mono">每条内容当前走到哪一步（已选题可直接发起创作，其余点开详情页操作）</span>
      </div>

      {error ? (
        <AntAlert type="error" showIcon message="生产看板数据加载失败" description={error.message} style={{ marginBottom: 'var(--space-4)' }} />
      ) : null}

      {!data ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : (
        <>
          {groups.map((g) => (
            <StatusSection key={g.status} status={g.status} items={g.items} />
          ))}

          {published.length > 0 ? (
            <section className="card" style={{ marginBottom: 'var(--space-3)' }}>
              <details className="fold">
                <summary>
                  已发布（最近 {Math.min(RECENT_PUBLISHED_LIMIT, published.length)} 条，累计 {published.length} 条）
                </summary>
                <div style={{ marginTop: 'var(--space-2)' }}>
                  {published.slice(0, RECENT_PUBLISHED_LIMIT).map((item) => (
                    <ContentRow key={item.slug} item={item} />
                  ))}
                </div>
              </details>
            </section>
          ) : null}

          {rejected.length > 0 ? (
            <section className="card" style={{ marginBottom: 'var(--space-3)' }}>
              <details className="fold">
                <summary>已否（{rejected.length} 条）</summary>
                <div style={{ marginTop: 'var(--space-2)' }}>
                  {rejected.map((item) => (
                    <ContentRow key={item.slug} item={item} />
                  ))}
                </div>
              </details>
            </section>
          ) : null}

          {data.parseErrors.length > 0 ? (
            <section style={{ marginBottom: 'var(--space-3)' }}>
              {data.parseErrors.map((pe) => (
                <ParseFailCard key={pe.path} path={pe.path} raw={pe.raw} />
              ))}
            </section>
          ) : null}

          {groups.every((g) => g.items.length === 0) && published.length === 0 && rejected.length === 0 && data.parseErrors.length === 0 ? (
            <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>
              暂无内容条目。
            </p>
          ) : null}

          <p className="muted" style={{ marginTop: 'var(--space-4)', fontSize: 'var(--text-xs)', lineHeight: 1.8 }}>
            停留超过 48 小时会标黄。
          </p>
        </>
      )}
    </div>
  )
}
