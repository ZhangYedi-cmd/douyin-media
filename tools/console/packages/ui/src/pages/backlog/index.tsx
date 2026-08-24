// P4 选题池（`#/backlog`）——03-前端执行方案.md §2.6 全文。Table 主视图（排序/筛选/行展开=
// 六维分数+promote 动作），「模拟取题」块渲染 media next --json。
import { useMemo, useState } from 'react'
import { Alert as AntAlert, Skeleton } from 'antd'
import { Link } from 'react-router-dom'
import type { BacklogData, ContentsData } from '@console/server/api-types'
import type { BacklogTopic } from '@console/core'
import { usePageData } from '../../lib/store'
import { FileDrawer } from '../../components/FileDrawer'
import { StatusTag, statusLabel } from '../../components/StatusTag'
import { PoolStats } from './PoolStats'
import { NextPickCard } from './NextPickCard'
import { IdeaTable } from './IdeaTable'
import { CollisionCard } from './CollisionCard'
import { SweepCard } from './SweepCard'
import { PromoteDialog } from './PromoteDialog'
import type { PromoteTarget } from './PromoteDialog'
import { slugFromContentPath } from './backlogHelpers'

type ContentItem = ContentsData['items'][number]

export default function BacklogPage() {
  const { data, error } = usePageData<BacklogData>('/api/backlog')
  // 双层同步核对（picked/published 折叠区「双层不同步标红」，03 §2.6 布局图 ④）用：
  // /api/contents 已是既有端点，这里是本页对它的第二次独立 usePageData 调用——各页自己
  // usePageData、可接受的轻量重复（05 §5D 交接先例，overview 数据同样无共享 context）。
  const { data: contents } = usePageData<ContentsData>('/api/contents')
  const [drawerPath, setDrawerPath] = useState<string | undefined>(undefined)
  const [promoteTarget, setPromoteTarget] = useState<PromoteTarget | null>(null)

  const contentBySlug = useMemo(() => {
    const m = new Map<string, ContentItem>()
    for (const item of contents?.items ?? []) m.set(item.slug, item)
    return m
  }, [contents])

  return (
    <div className="page">
      <div className="page-head">
        <h1>选题池</h1>
        <span className="sub mono">按评分排序的待做选题，点开可看打分明细</span>
      </div>

      {error ? (
        <AntAlert type="error" showIcon message="选题池数据加载失败" description={error.message} style={{ marginBottom: 'var(--space-4)' }} />
      ) : null}

      {!data ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : (
        <BacklogBody data={data} contentBySlug={contentBySlug} onOpenFile={setDrawerPath} onPromote={setPromoteTarget} />
      )}

      <PromoteDialog target={promoteTarget} onClose={() => setPromoteTarget(null)} />
      <FileDrawer path={drawerPath} onClose={() => setDrawerPath(undefined)} mono />
    </div>
  )
}

function BacklogBody({
  data,
  contentBySlug,
  onOpenFile,
  onPromote,
}: {
  data: BacklogData
  contentBySlug: Map<string, ContentItem>
  onOpenFile(path: string): void
  onPromote(target: PromoteTarget): void
}) {
  const now = useMemo(() => new Date(), [])
  // BacklogData.ideas/picked/published 出参类型是 unknown[]（api-types.ts 刻意松耦合），
  // 但运行时字段真实来自 core 的 BacklogTopic（server projectBacklog 原样透传 snapshot.backlog.topics
  // 按 status 过滤）——同 detail/index.tsx 的 ContentMeta 收窄先例，这里按真实形状收窄回 BacklogTopic[]。
  const ideas = data.ideas as unknown as BacklogTopic[]
  const picked = data.picked as unknown as BacklogTopic[]
  const published = data.published as unknown as BacklogTopic[]

  return (
    <>
      <PoolStats stats={data.stats} ideas={ideas} collisionsCount={data.collisions.length} now={now} />

      <NextPickCard nextPick={data.nextPick} nextPickError={data.nextPickError} nextUpId={data.nextUpId} onPromote={onPromote} />

      <section className="card" style={{ marginBottom: 'var(--space-4)' }}>
        <header>
          <h2>idea 池</h2>
          <span className="right">清扫由养护任务执行，本页只做标记</span>
        </header>
        <IdeaTable ideas={ideas} collisions={data.collisions} nextUpId={data.nextUpId} now={now} onPromote={onPromote} />
        {data.parseErrors.length > 0 ? (
          <p className="muted" style={{ marginTop: 'var(--space-3)', fontSize: 11 }}>
            ⚠ 另有 {data.parseErrors.length} 条条目解析失败，未计入水位：
            {data.parseErrors.map((pe) => (
              <span key={pe.path}>
                {' '}
                <code className="mono">{pe.path}</code>{' '}
                <a onClick={() => onOpenFile(pe.path)} style={{ cursor: 'pointer' }}>
                  查看原文
                </a>
              </span>
            ))}
          </p>
        ) : null}
      </section>

      <section className="card" style={{ marginBottom: 'var(--space-4)' }}>
        <details className="fold">
          <summary>已取入生产线 · {picked.length} 条</summary>
          <table className="table">
            <thead>
              <tr>
                <th>编号</th>
                <th>标题</th>
                <th className="num">评分</th>
                <th>去向</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              {picked.length === 0 ? (
                <tr>
                  <td colSpan={5} className="muted">
                    暂无已取入生产线的条目
                  </td>
                </tr>
              ) : (
                picked.map((t) => {
                  const slug = slugFromContentPath(t.content_path)
                  const content = slug ? contentBySlug.get(slug) : undefined
                  // 「双层不同步」= 选题池仍记着「已取入生产线」，但对应内容已经翻到「已发布/复盘完成」
                  // ——说明发布收尾没把选题池一并翻齐（对照 backlog.html T-031 示例）。
                  const outOfSync = content && (content.status === 'published' || content.status === 'retro_done')
                  return (
                    <tr key={t.id}>
                      <td className="mono">{t.id}</td>
                      <td>{t.title}</td>
                      <td className="num">{t.score ?? '—'}</td>
                      <td>{slug ? <Link to={`/content/${slug}`}>{slug}</Link> : <span className="nil">—</span>}</td>
                      <td>
                        {outOfSync ? (
                          <span className="badge b-danger">
                            <i />
                            已{statusLabel(content!.status)} · 双层不同步
                          </span>
                        ) : content ? (
                          <StatusTag status={content.status} />
                        ) : (
                          <span className="badge">
                            <i />
                            {statusLabel('ideated')}
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </details>

        <details className="fold" style={{ marginTop: 'var(--space-3)' }}>
          <summary>已发布（近期）· {published.length} 条</summary>
          <table className="table">
            <thead>
              <tr>
                <th>编号</th>
                <th>标题</th>
                <th className="num">评分</th>
                <th>去向</th>
                <th>发布日</th>
              </tr>
            </thead>
            <tbody>
              {published.length === 0 ? (
                <tr>
                  <td colSpan={5} className="muted">
                    暂无已发布的条目
                  </td>
                </tr>
              ) : (
                published.map((t) => {
                  const slug = slugFromContentPath(t.content_path)
                  const content = slug ? contentBySlug.get(slug) : undefined
                  const publishedAt = content?.timestamps.published
                  return (
                    <tr key={t.id}>
                      <td className="mono">{t.id}</td>
                      <td>{t.title}</td>
                      <td className="num">{t.score ?? '—'}</td>
                      <td>{slug ? <Link to={`/content/${slug}`}>{slug}</Link> : <span className="nil">—</span>}</td>
                      <td className="mono">{publishedAt ? publishedAt.slice(0, 10) : '—'}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </details>
      </section>

      <div className="grid cols-2">
        <CollisionCard collisions={data.collisions} onOpenFile={onOpenFile} />
        <SweepCard />
      </div>
    </>
  )
}
