import { Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { Link } from 'react-router-dom'
import type { MetricsSnapshotRow } from '@console/server/api-types'
import { formatDateLabel, formatInt, formatPercent } from './format'

// ④ 数据快照 Table（03 §2.8）：内容·发布·plays·完播·likes·comments·shares·最近窗口；
// 空值「—」不装有——S10 验收②。无 metrics 的内容本就不在 snapshots 里（server 侧「有啥显啥」投影，
// 02 §2.1 projectMetrics：只按 metrics.jsonl 里出现过的 slug 取最新窗，不为全量已发布内容补占位行）。

function nilCell(rendered: string | undefined | null) {
  return rendered ? rendered : <span className="nil">—</span>
}

const numRender = (formatter: (n: number) => string) => (v: number | undefined) => nilCell(v !== undefined ? formatter(v) : undefined)

export interface SnapshotTableProps {
  snapshots: MetricsSnapshotRow[]
}

export function SnapshotTable({ snapshots }: SnapshotTableProps) {
  const columns: ColumnsType<MetricsSnapshotRow> = [
    {
      title: '内容',
      dataIndex: 'title',
      key: 'title',
      render: (_title, row) => <Link to={`/content/${row.slug}`}>{row.title ?? row.slug}</Link>,
    },
    {
      title: '发布',
      dataIndex: 'publishedAt',
      key: 'publishedAt',
      className: 'mono',
      render: (v: string | null) => nilCell(v ? formatDateLabel(v) : undefined),
    },
    { title: '播放', dataIndex: 'plays', key: 'plays', align: 'right', className: 'num', render: numRender(formatInt) },
    { title: '完播', dataIndex: 'completion', key: 'completion', align: 'right', className: 'num', render: numRender(formatPercent) },
    { title: '点赞', dataIndex: 'likes', key: 'likes', align: 'right', className: 'num', render: numRender(formatInt) },
    { title: '评论', dataIndex: 'comments', key: 'comments', align: 'right', className: 'num', render: numRender(formatInt) },
    { title: '分享', dataIndex: 'shares', key: 'shares', align: 'right', className: 'num', render: numRender(formatInt) },
    { title: '最近窗口', dataIndex: 'window', key: 'window', className: 'mono' },
  ]

  return (
    <section className="card" data-testid="snapshot-table">
      <header>
        <h2>数据快照</h2>
        <span className="right">数据来自复盘记录，缺失的字段不强行填充</span>
      </header>
      <Table<MetricsSnapshotRow>
        className="table"
        columns={columns}
        dataSource={snapshots}
        rowKey="slug"
        pagination={false}
        size="small"
        locale={{ emptyText: '暂无数据快照' }}
      />
      <p className="muted" style={{ marginTop: 'var(--space-2)', fontSize: '11px' }}>
        还没有复盘数据的内容不会出现在这里
      </p>
    </section>
  )
}
