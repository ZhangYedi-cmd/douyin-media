// P3 详情（`#/content/:slug`）——03 §2.5 全文。单条内容的深审与裁决页，全站写动作最密的页。
import { Link, useParams } from 'react-router-dom'
import { Alert as AntAlert, Skeleton } from 'antd'
import type { ContentDetailData, Job } from '@console/server/api-types'
import type { ContentMeta } from '@console/core'
import type { ApiError } from '../../lib/api'
import { useJobs, usePageData } from '../../lib/store'
import { JobCard } from '../../components/JobPanel'
import { MetaHeader } from './MetaHeader'
import { StageTimeline } from './StageTimeline'
import { ArtifactTabs } from './ArtifactTabs'
import { DecisionPanel } from './DecisionPanel'
import { AuditTrail } from './AuditTrail'
import { describeDetailError } from './errorState'
import styles from './detail.module.css'
import errorStyles from './errorState.module.css'

const ACTIVE_JOB_STATES: Job['state'][] = ['queued', 'running', 'verifying']

/** C1（P0）整页接管：请求失败时绝不能让上一次成功的 data 残留渲染出来（stale render 是 C1 根因）——
 * 错误态在渲染优先级上排在 data 之前，也排在 loading 骨架屏之前（顺带修掉「刷新到坏 id 时
 * 永远转不完的骨架屏」：旧实现是 `!data ? <Skeleton/> : …`，先于 error 判断，直接刷新坏 id 时
 * data 恒为 undefined，骨架屏永不退出）。这里只渲染错误说明 + 返回出口，不触碰 MetaHeader/
 * StageTimeline/DecisionPanel 等任何依赖 data 的区块——写动作（尤其「确认发布」）因此在数据
 * 不可信时物理上不可能出现在页面上，不需要额外加「禁用」逻辑去防它。 */
function DetailErrorState({ error, slug }: { error: ApiError; slug: string }) {
  const view = describeDetailError(error, slug)
  return (
    <div className={`card ${errorStyles.card}`}>
      <p className="eyebrow" style={{ color: 'var(--danger)' }}>
        加载失败
      </p>
      <h2 className={errorStyles.heading}>{view.heading}</h2>
      <ul className={errorStyles.list}>
        {view.reasons.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
      <p className={errorStyles.stepsLabel}>下一步能做什么</p>
      <ul className={errorStyles.list}>
        {view.nextSteps.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
      <Link to="/kanban" className={`btn btn-primary ${errorStyles.backBtn}`}>
        返回生产看板
      </Link>
    </div>
  )
}

export default function DetailPage() {
  const { slug = '' } = useParams<{ slug: string }>()
  const { data, error } = usePageData<ContentDetailData>(`/api/content/${encodeURIComponent(slug)}`)
  const jobs = useJobs()
  // job 进度：activeJobId 从 useJobs() 里按 slug 匹配（03 §2.5「数据源」段原文）。
  const activeJob = jobs.find((j) => j.slug === slug && ACTIVE_JOB_STATES.includes(j.state))

  return (
    <div className="page">
      <p className="eyebrow" style={{ marginBottom: 'var(--space-2)' }}>
        <Link to="/kanban" style={{ color: 'inherit' }}>
          生产看板
        </Link>{' '}
        / {slug}
      </p>

      {error ? (
        <DetailErrorState error={error} slug={slug} />
      ) : !data ? (
        <Skeleton active paragraph={{ rows: 10 }} />
      ) : !data.meta ? (
        <AntAlert
          type="warning"
          showIcon
          message="该内容还没有档案信息"
          description={`目录：${data.dir}（可能还在选题阶段，也可能是文件解析失败——去生产看板可以看到解析失败的原文）`}
        />
      ) : (
        <DetailBody data={data} slug={slug} activeJob={activeJob} />
      )}
    </div>
  )
}

function DetailBody({ data, slug, activeJob }: { data: ContentDetailData; slug: string; activeJob?: Job }) {
  // data.meta 出参类型是 Record<string, unknown>（api-types.ts 刻意松耦合，避免信封层硬依赖 core），
  // 但运行时字段真实来自 core 的 ContentMeta（server projectContentDetail 原样透传 entry.meta）——
  // 上面 !data.meta 分支已排除 null，这里按其真实形状收窄回 ContentMeta，供下游按字段消费。
  const meta = data.meta as unknown as ContentMeta

  return (
    <>
      <MetaHeader meta={meta} dir={data.dir} backlogId={data.source?.backlogId} />
      <StageTimeline timeline={data.timeline} current={meta.status} />

      <div className={styles.layout} style={{ marginTop: 'var(--space-4)' }}>
        <div className="grid">
          <section className="card">
            {/* R4（第三波修复，2026-08-19）：右上角原来还写着一行「口播稿 / 封面 / 发布信息 / 交付物」，
                正下方 ArtifactTabs 就是同名的四个 tab，纯重复——删掉，标题旁不需要复述 tab 名。 */}
            <header>
              <h2>产物</h2>
            </header>
            <ArtifactTabs files={data.files} publishInfo={data.publishInfo} slug={slug} />
          </section>

          <section className="card">
            <header>
              <h2>审核记录</h2>
              <span className="right">记录每次审核结论 · 重做 {data.reworkCount} 次</span>
            </header>
            <AuditTrail entries={data.auditTrail} />
          </section>
        </div>

        <div className={styles.decisionPanel}>
          {activeJob ? <JobCard job={activeJob} defaultExpanded /> : null}
          <DecisionPanel
            slug={slug}
            status={meta.status}
            checks={data.checks}
            allowedTransitions={data.allowedTransitions}
            publishUrl={meta.publish_url}
            schedule={meta.schedule}
            hasActiveJob={!!activeJob}
            title={meta.title}
          />
        </div>
      </div>
    </>
  )
}
