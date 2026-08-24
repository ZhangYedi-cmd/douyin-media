import { Link } from 'react-router-dom'
import type { ContentMeta } from '@console/core'
import { StatusTag } from '../../components/StatusTag'
import { CommandChip } from '../../components/CommandChip'
import styles from './detail.module.css'

// 03 §2.5 ①：头卡——标题 + StatusTag + 复制目录/复制 dry-run 命令(CommandChip copy 形态) +
// mono 信息行（目录·类型·pillar·来源 T-xxx→P4）。
export interface MetaHeaderProps {
  meta: ContentMeta
  dir: string
  backlogId?: string
}

// 07-界面用语对照表 §1：拼音枚举不上屏（`kouban · depth` 必须显示成「口播 · 深度」）。
// 页面私有小 map，与 kanban/ContentRow.tsx、backlog/IdeaTable.tsx 各自一份同款枚举——
// 跨页复用未满 2 处不升 components/（packages/ui/CLAUDE.md AI 约定 1）。
const TYPE_LABEL: Record<'kouban' | 'tuwen', string> = { kouban: '口播', tuwen: '图文' }
const PILLAR_LABEL: Record<'depth' | 'traffic', string> = { depth: '深度', traffic: '流量' }

export function MetaHeader({ meta, dir, backlogId }: MetaHeaderProps) {
  return (
    <section className="card" style={{ marginBottom: 0 }}>
      <header style={{ marginBottom: 'var(--space-2)' }}>
        <h1 className={styles.title} style={{ fontSize: 'var(--text-xl)' }}>
          {meta.title || meta.slug}
        </h1>
        <StatusTag status={meta.status} />
        {/* A1：命令条容器改用 styles.commands（flex-wrap:wrap，见 detail.module.css），
            不再用内联 style 写死不换行的 flex 行——原来的写法在窄屏下和不换行的 h1 一起
            把标题挤成竖条。 */}
        <div className={`right ${styles.commands}`}>
          <CommandChip command={dir} />
          <CommandChip command={`media flip ${meta.slug} approved --dry-run`} />
        </div>
      </header>
      <p className="mono muted" style={{ fontSize: 'var(--text-xs)' }}>
        {dir} · {meta.type ? TYPE_LABEL[meta.type] : '—'} · {meta.pillar ? PILLAR_LABEL[meta.pillar] : '—'}
        {backlogId ? (
          <>
            {' '}
            · 来源 <Link to="/backlog">{backlogId}</Link>
          </>
        ) : null}
      </p>
    </section>
  )
}
