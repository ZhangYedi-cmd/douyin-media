import { Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { BacklogTopic } from '@console/core'
import type { BacklogCollision } from '@console/server/api-types'
import { useAction } from '../../lib/actions'
import { DimBars } from './DimBars'
import { collisionPartnersOf, daysSince, isStale, suggestSlug } from './backlogHelpers'
import type { PromoteTarget } from './PromoteDialog'
import styles from './backlog.module.css'

// 03 §2.6 ③：idea 池 Table（主体）——排序/筛选/行展开=六维分数+promote 动作。
export interface IdeaTableProps {
  ideas: BacklogTopic[]
  collisions: BacklogCollision[]
  nextUpId: string | null
  now: Date
  onPromote(target: PromoteTarget): void
}

const TRACK_LABEL: Record<BacklogTopic['track'], string> = { depth: '深度', traffic: '流量' }
const FORMAT_LABEL: Record<BacklogTopic['format'], string> = { kouban: '口播', tuwen: '图文' }

export function IdeaTable({ ideas, collisions, nextUpId, now, onPromote }: IdeaTableProps) {
  const { run } = useAction()

  // A3：id/score/tier/urgency/created 是定长短文本/标识列，固定 width + nowrap（styles.nowrapCell），
  // 标题列不设 width，吃表格剩余的伸缩空间——避免最长的标题列反过来把这些短列压到比内容还窄，
  // 中文/数字断成两三行（如「2026-07-13-004」断成「2026-」「07-13-」「003」）。
  // 注意：这只是列配置本身，真正让 width 生效还需要下方 <Table> 的 scroll.x（触发 antd 内部切到
  // table-layout:fixed，见那里的注释）；track/format 这两个短标签列也补了小 width，是 fixed 布局
  // 下「未设 width 的列会等分剩余空间」这条规则决定的，不然它们会跟标题列抢那份「剩余」——
  // 03 §2.6 原设计没提到这层实现细节。
  const columns: ColumnsType<BacklogTopic> = [
    { title: '编号', dataIndex: 'id', key: 'id', width: 118, className: `mono ${styles.nowrapCell}` },
    { title: '标题', dataIndex: 'title', key: 'title', render: (v: string) => <b>{v}</b> },
    { title: '赛道', dataIndex: 'track', key: 'track', width: 52, render: (v: BacklogTopic['track']) => TRACK_LABEL[v] },
    { title: '形式', dataIndex: 'format', key: 'format', width: 52, render: (v: BacklogTopic['format']) => FORMAT_LABEL[v] },
    {
      title: '评分',
      dataIndex: 'score',
      key: 'score',
      width: 60,
      align: 'right',
      className: 'num', // .table .num 已含 white-space: nowrap（theme.css），无需再叠 nowrapCell
      sorter: (a, b) => (a.score ?? -Infinity) - (b.score ?? -Infinity),
      defaultSortOrder: 'descend',
      render: (v: number | null) => (v !== null && v !== undefined ? <span style={{ fontWeight: 600 }}>{v.toFixed(1)}</span> : <span className="nil">—</span>),
    },
    {
      title: '档位',
      dataIndex: 'tier',
      key: 'tier',
      width: 44,
      className: `mono ${styles.nowrapCell}`,
      render: (v: string | null) => v ?? <span className="nil">—</span>,
    },
    {
      title: '紧急度',
      dataIndex: 'urgency',
      key: 'urgency',
      width: 78,
      className: styles.nowrapCell,
      filters: [
        { text: '今天', value: 'today' },
        { text: '排队中', value: 'queue' },
      ],
      onFilter: (value, record) => record.urgency === value,
      render: (v: BacklogTopic['urgency']) =>
        v === 'today' ? (
          <span className="badge b-warn">
            <i />
            今天
          </span>
        ) : (
          <span className="muted">排队中</span>
        ),
    },
    { title: '创建于', dataIndex: 'created', key: 'created', width: 88, className: `mono ${styles.nowrapCell}` },
    {
      // A3 衍生问题：给 id/created/score/tier/urgency 定长 nowrap 后，原来靠这几列被动
      // 挤压来兜底的 tags 列（英文 tag 词如 self-compaction/terminal-bench 内部不可断行）
      // 反而在窄视口把整张表撑到超出可用宽度——03 §2.6 原设计没预料到这层连锁反应。
      // 给 tags 列也定一个 width，并把内容改成 flex-wrap，让长尾 tag/徽标在列宽内换行
      // （多占几行高度，不占表格总宽度），标题列仍是唯一吃剩余伸缩空间的列。
      title: '标签',
      key: 'tags',
      width: 230,
      render: (_: unknown, t: BacklogTopic) => {
        const partners = collisionPartnersOf(t.id, collisions)
        const stale = isStale(t, now)
        const days = daysSince(t.created, now)
        return (
          <span className={styles.tagsCell}>
            {t.tags.map((tag) => (
              <span className="tag" key={tag}>
                {tag}
              </span>
            ))}
            {partners.length > 0 ? (
              <span className={`badge b-warn ${styles.wrapBadge}`}>
                <i />
                撞题 ↔ {partners.join(', ')}
              </span>
            ) : null}
            {stale ? (
              <span className={`badge ${styles.wrapBadge}`}>
                <i />
                已 {days} 天 · 超 30 天未动
              </span>
            ) : null}
          </span>
        )
      },
    },
  ]

  return (
    <Table<BacklogTopic>
      className="table"
      columns={columns}
      dataSource={ideas}
      rowKey="id"
      pagination={false}
      size="small"
      // A3 实测坑：antd Table 默认 table-layout:auto 且内联样式写死 table-layout:auto，
      // CSS 完全覆盖不了（内联样式优先级最高），列的 width 只是弱提示——即使给够 width，
      // 浏览器仍按内容最大宽度抢空间，id/created 该有的单行宽度反而被标题/tags 挤没。
      // 给 scroll.x 一个具体数字（而非 'max-content'）会让 antd 内部真正切到
      // table-layout:fixed：width 列变成硬约束，标题列吃剩余空间且仍按正常规则换行；
      // 窄视口下装不下就在表格自身出横向滚动条（antd 标准处理），不会再拖着整页/上方
      // 统计卡片一起横移，也不会再逐字断行。
      scroll={{ x: 980 }}
      rowClassName={(t) => (isStale(t, now) ? styles.rowStale : '')}
      locale={{ emptyText: '选题池暂无 idea 条目' }}
      expandable={{
        // fixed 布局下未设 width 的列会等分剩余空间，展开图标这一列由 antd 自动插入、
        // 不在上面 columns 数组里，单独给它定宽，不然它也会跟标题列抢剩余空间。
        columnWidth: 36,
        expandedRowRender: (t) => {
          const isPointer = t.id === nextUpId
          return (
            <div className="grid cols-2" style={{ alignItems: 'start' }}>
              <div>
                <p className="eyebrow" style={{ marginBottom: 'var(--space-2)' }}>
                  六维评分
                </p>
                <DimBars scores={t.scores} />
              </div>
              <div>
                <p className="eyebrow" style={{ marginBottom: 'var(--space-2)' }}>
                  选题理由 / 参考链接
                </p>
                <p style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>{t.reason || '（未记录选题理由）'}</p>
                <p style={{ marginTop: 'var(--space-2)', fontSize: 'var(--text-xs)' }}>
                  {t.links.length > 0 ? (
                    t.links.map((l) => (
                      <code className="mono" key={l} style={{ fontSize: 11, marginRight: 12 }}>
                        {l}
                      </code>
                    ))
                  ) : (
                    <span className="muted">—</span>
                  )}
                </p>
                <div style={{ marginTop: 'var(--space-3)', display: 'flex', gap: 'var(--space-2)' }}>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={() => onPromote({ id: t.id, label: t.title, suggestedSlug: suggestSlug(t.title, t.id) })}
                  >
                    取题
                  </button>
                  {isPointer ? (
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => void run('next-up', { clear: true }, { title: `取消指定 · ${t.id}` })}
                    >
                      取消指定
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => void run('next-up', { id: t.id }, { title: `指定为下一条 · ${t.id}` })}
                    >
                      指定为下一条
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        },
      }}
    />
  )
}
