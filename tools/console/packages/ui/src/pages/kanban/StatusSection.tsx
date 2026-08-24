import type { MetaStatus } from '@console/core'
import type { ContentSummary } from '@console/server/api-types'
import { statusLabel } from '../../components/StatusTag'
import { ContentRow } from './ContentRow'
import styles from './kanban.module.css'

// 03 §2.4：一个状态一个小节，空组隐藏。
export interface StatusSectionProps {
  status: MetaStatus
  items: ContentSummary[]
}

// 07-界面用语对照表 §1：状态→中文标签唯一取值处是 StatusTag.tsx 的 statusLabel()，本页不再自维护
// 一份带英文前缀的 map（旧版曾把 ideated 叫成「已立项」，与 StatusTag 的「已选题」是两个词——
// 「同一状态两个中文词」正是对照表 §1 点名要修的问题，删map改调用同一出处即可根治）。
const DOT_CLASS: Partial<Record<MetaStatus, string>> = {
  drafting: styles.dotAccent,
  review: styles.dotWarn,
  approved: styles.dotSuccess,
  scheduled: styles.dotSuccess,
  published: styles.dotSuccess,
  rejected: styles.dotDanger,
}

export function StatusSection({ status, items }: StatusSectionProps) {
  if (items.length === 0) return null // 空组隐藏（03 §2.4 布局图原文）
  return (
    <section className="card" style={{ marginBottom: 'var(--space-3)' }} data-testid={`status-section-${status}`}>
      <div className={styles.sectionHead}>
        <span className={`${styles.dot} ${DOT_CLASS[status] ?? ''}`.trim()} />
        <b>{statusLabel(status)}</b>
        <span className={styles.count}>{items.length}</span>
      </div>
      <div>
        {items.map((item) => (
          <ContentRow key={item.slug} item={item} />
        ))}
      </div>
    </section>
  )
}
