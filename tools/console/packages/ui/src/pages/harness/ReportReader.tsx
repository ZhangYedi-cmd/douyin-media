import { useEffect, useState } from 'react'
import type { LedgerEntry, ProposalItem } from '@console/server/api-types'
import { apiGetText } from '../../lib/api'
import { MarkdownView } from '../../components/MarkdownView'

// 03 §2.7 ③：报告阅读器——变更提议置顶，正文走 MarkdownView 富渲染
// （2026-08-19 起推翻旧拍板「不引 markdown 库」，见 FileDrawer.tsx 顶部注释）。
//
// 2026-08-19 二次改版（用户走查反馈）：原设计是账本左、阅读器右的常驻两栏（03 §2.7 图示），
// 实际用下来很别扭——账本可能因时间窗为空而是一片空白，右边却挂着一整篇报告正文，两栏毫无
// 关联感；报告本身又长又宽（含 GFM 对标表），挤在半幅宽度里更难读。改成：本组件只渲染内容，
// 容器由页面决定，当前用 Modal 全宽承载（标题/路径移到弹窗标题栏，见 pages/harness/index.tsx）。
export interface ReportReaderProps {
  reportPath?: string
  entry?: LedgerEntry
  proposal?: ProposalItem
}

/** 弹窗标题：有账本条目时用「任务 · 对象」，否则退回文件名。 */
export function reportReaderTitle(reportPath?: string, entry?: LedgerEntry): string {
  if (entry) return `${entry.task}${entry.target ? ` · ${entry.target}` : ''}`
  return reportPath ?? '报告'
}

export function ReportReader({ reportPath, entry, proposal }: ReportReaderProps) {
  const [text, setText] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setText(null)
    setError(null)
    if (!reportPath) return
    let cancelled = false
    apiGetText(`/api/file?path=${encodeURIComponent(reportPath)}`)
      .then((t) => {
        if (!cancelled) setText(t)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      })
    return () => {
      cancelled = true
    }
  }, [reportPath])

  if (!reportPath) return null

  return (
    // minWidth:0 不是视觉值而是布局结构值：MarkdownView 渲染 GFM 宽表格（如 benchmark-refresher
    // 报告里的对标表）时子树 min-content 可达 4000px+，容器不清零就会被撑穿（改版前它是
    // .grid.cols-2 的 grid item，实测把 .page 顶到 4500px+）。现在虽已搬进 Modal，这行仍要留着：
    // Modal body 同样会被超宽子树撑破，表格该在 MarkdownView 自己的 .tableWrap 里横向滚。
    <div className="reader" data-testid="report-reader" style={{ minWidth: 0 }}>
      <p className="mono muted" style={{ fontSize: 'var(--text-xs)', marginBottom: 'var(--space-3)' }}>
        {reportPath}
      </p>
      {proposal ? (
        <div className="proposal">
          <p className="eyebrow">变更提议（置顶）</p>
          <p style={{ fontSize: 'var(--text-sm)', marginTop: 4 }}>{proposal.summary}</p>
        </div>
      ) : null}
      {error ? (
        <p style={{ color: 'var(--danger)', fontSize: 'var(--text-sm)' }}>加载失败：{error}</p>
      ) : text === null ? (
        <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>
          加载中…
        </p>
      ) : (
        <MarkdownView text={text} size="sm" />
      )}
    </div>
  )
}
