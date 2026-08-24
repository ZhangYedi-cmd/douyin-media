import type { ReactNode } from 'react'
import { Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { LedgerEntry } from '@console/server/api-types'

// 03 §2.7 ②：运行账本 Table（逆序，server 已按 ts 逆序返回）——点行 → 右侧报告阅读器打开。
export interface LedgerTableProps {
  entries: LedgerEntry[]
  selectedPath?: string
  onSelect(reportPath: string): void
  /** 空态说明（含「最后一次运行是什么时候」与放宽窗口的入口），由页面按当前时间窗算好传入。 */
  emptyContent?: ReactNode
}

function fmtTs(ts: string): string {
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return ts
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(
    2,
    '0',
  )}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function LedgerTable({ entries, selectedPath, onSelect, emptyContent }: LedgerTableProps) {
  const columns: ColumnsType<LedgerEntry> = [
    { title: '时间', dataIndex: 'ts', key: 'ts', className: 'mono', render: (v: string) => fmtTs(v) },
    { title: '任务', dataIndex: 'task', key: 'task', className: 'mono' },
    { title: '对象', dataIndex: 'target', key: 'target', render: (v: string | undefined) => v ?? <span className="nil">—</span> },
    {
      title: '结果',
      dataIndex: 'result',
      key: 'result',
      render: (v: string | undefined) =>
        v === 'ok' ? (
          <span className="badge b-success">
            <i />
            成功
          </span>
        ) : v ? (
          <span className="badge b-danger">
            <i />
            {v}
          </span>
        ) : (
          <span className="nil">—</span>
        ),
    },
    { title: '发现问题', dataIndex: 'findings', key: 'findings', align: 'right', className: 'num', render: (v: number | undefined) => v ?? '—' },
    {
      title: '是否已应用',
      dataIndex: 'applied',
      key: 'applied',
      className: 'mono nil',
      render: (v: boolean | undefined) => (v === undefined ? '—' : v ? '是' : '否'),
    },
  ]

  return (
    <Table<LedgerEntry>
      className="table"
      columns={columns}
      dataSource={entries}
      rowKey={(r) => `${r.ts}-${r.task}-${r.target ?? ''}`}
      pagination={false}
      size="small"
      locale={{ emptyText: emptyContent ?? '没有运行记录' }}
      onRow={(r) => ({
        className: r.reportPath ? 'clickable' : undefined,
        onClick: () => {
          if (r.reportPath) onSelect(r.reportPath)
        },
      })}
      rowClassName={(r) => (r.reportPath && r.reportPath === selectedPath ? 'sel' : '')}
    />
  )
}
