import { Link, useNavigate } from 'react-router-dom'
import type { ContentSummary } from '@console/server/api-types'
import { StatusTag } from '../../components/StatusTag'
import { DeadlineBadge } from '../../components/DeadlineBadge'
import { useJobAction } from '../../lib/actions'
import { buildCreateRunSummary, shouldShowCreateAction } from './createRunSummary'
import styles from './kanban.module.css'

// 03 §2.4 行内容：标题 / slug(mono) / StatusTag / 类型·pillar 标签 / DeadlineBadge(停留) /
// → 点击进 P3；review/approved 行尾快捷钮「去审核」「去发布」（纯跳转 P3）。
// 2026-08-19 追加：ideated 行尾「开始创作」是本页第一个写动作（用户真机走查原话「也可以加一个
// 按钮，手动触发整个任务」）——走 useJobAction 慢作业机制，不是跳转；页面不再是「零写动作」，
// 副标题已同步改过（见 index.tsx）。
export interface ContentRowProps {
  item: ContentSummary
}

const TYPE_LABEL: Record<'kouban' | 'tuwen', string> = { kouban: '口播', tuwen: '图文' }
const PILLAR_LABEL: Record<'depth' | 'traffic', string> = { depth: '深度', traffic: '流量' }

const QUICK_ACTION: Partial<Record<ContentSummary['status'], string>> = {
  review: '去审核',
  approved: '去发布',
}

function CreateSummaryContent({ slug, title }: { slug: string; title?: string }) {
  const view = buildCreateRunSummary({ slug, title })
  return (
    <div>
      <p style={{ marginBottom: 'var(--space-2)' }}>
        <strong>{view.title}</strong>{' '}
        <span className="muted" style={{ fontSize: 'var(--text-xs)' }}>
          · {view.slug}
        </span>
      </p>
      <p className="muted" style={{ fontSize: 'var(--text-xs)' }}>
        {view.body}
      </p>
    </div>
  )
}

export function ContentRow({ item }: ContentRowProps) {
  const navigate = useNavigate()
  const { start } = useJobAction()
  const quickLabel = QUICK_ACTION[item.status]
  const showCreateAction = shouldShowCreateAction(item.status)
  // scheduled 行显排期时间 + 超时 badge（03 §2.4 原文）：deadline 模式，warnAfterHours=0 让
  // 一旦超过排期立刻转警示色（不像「停留」那样容忍 48h 缓冲）。
  const showScheduleDeadline = item.status === 'scheduled' && !!item.scheduledAt

  async function handleStartCreate() {
    await start('create', { slug: item.slug }, {
      title: `开始创作 · ${item.title || item.slug}`,
      summary: <CreateSummaryContent slug={item.slug} title={item.title} />,
    })
  }

  return (
    <div className={styles.row} onClick={() => navigate(`/content/${item.slug}`)}>
      <div className={styles.rowMain}>
        <span className={styles.title}>{item.title}</span>
        <span className={styles.slug}>{item.slug}</span>
      </div>
      <div className={styles.tags}>
        {item.type ? <span className="tag">{TYPE_LABEL[item.type]}</span> : null}
        {item.pillar ? <span className={`tag${item.pillar === 'depth' ? ' t-deep' : ''}`}>{PILLAR_LABEL[item.pillar]}</span> : null}
      </div>
      <div className={styles.rowRight}>
        <StatusTag status={item.status} />
        {showScheduleDeadline ? (
          <DeadlineBadge deadline={item.scheduledAt ?? undefined} prefix="排期" warnAfterHours={0} />
        ) : (
          <DeadlineBadge since={item.enteredAt ?? undefined} prefix="停留" />
        )}
        {quickLabel ? (
          <Link className="btn btn-sm" to={`/content/${item.slug}`} onClick={(e) => e.stopPropagation()}>
            {quickLabel}
          </Link>
        ) : null}
        {showCreateAction ? (
          <button
            type="button"
            className="btn btn-sm"
            onClick={(e) => {
              e.stopPropagation() // 行本身点击会跳详情页，按钮点击必须拦下冒泡，不能又跳走
              void handleStartCreate()
            }}
          >
            开始创作
          </button>
        ) : null}
      </div>
    </div>
  )
}
