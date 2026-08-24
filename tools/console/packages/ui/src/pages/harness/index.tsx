// P5 治理线（`#/harness`）——03-前端执行方案.md §2.7 全文。跑没跑（注册表+心跳）、
// 产了什么（账本+报告阅读器）、裁什么（提议区）。铁律：只产报告，人审后应用。
import { useMemo, useState } from 'react'
import { Alert as AntAlert, Modal, Skeleton } from 'antd'
import type { HarnessData } from '@console/server/api-types'
import { usePageData } from '../../lib/store'
import { TaskRegistryTable } from './TaskRegistryTable'
import { LedgerTable } from './LedgerTable'
import { ReportReader, reportReaderTitle } from './ReportReader'
import { ProposalList } from './ProposalList'
import { RetroMatrix } from './RetroMatrix'
import { DEFAULT_LEDGER_DAYS, LEDGER_WINDOWS, ledgerEmptyHint } from './ledgerWindow'

export default function HarnessPage() {
  // 账本时间窗可调（2026-08-19 走查修复）：server days 默认 30，而治理线停摆一个月时
  // 最后一次运行恰好落在窗口外，账本全空却无处可调——窗口必须可见、可切，见 ledgerWindow.ts。
  const [ledgerDays, setLedgerDays] = useState(DEFAULT_LEDGER_DAYS)
  const { data, error } = usePageData<HarnessData>(`/api/harness?days=${ledgerDays}`)
  const now = useMemo(() => new Date(), [])
  const [selectedReport, setSelectedReport] = useState<string | undefined>(undefined)

  // 报告改为弹窗承载（2026-08-19 用户走查反馈，理由见 ReportReader.tsx 顶部注释），因此
  // **不再**默认选中最新一条报告——弹窗只应由用户明确点击打开，页面加载时不该自己弹出来。
  const effectiveReport = selectedReport
  const selectedEntry = data?.ledger.find((r) => r.reportPath === effectiveReport)
  const selectedProposal = data?.proposals.find((p) => p.reportPath === effectiveReport)

  return (
    <div className="page">
      <div className="page-head">
        <h1>治理线</h1>
        <span className="sub mono">养护任务跑了没有、发现了什么、要不要采纳</span>
      </div>

      {error ? (
        <AntAlert type="error" showIcon message="治理线数据加载失败" description={error.message} style={{ marginBottom: 'var(--space-4)' }} />
      ) : null}

      {!data ? (
        <Skeleton active paragraph={{ rows: 10 }} />
      ) : (
        <>
          <section className="card" style={{ marginBottom: 'var(--space-4)' }}>
            <header>
              <h2>任务注册表</h2>
              <span className="right mono">harness/tasks.md</span>
            </header>
            <TaskRegistryTable tasks={data.tasks} now={now} />
          </section>

          <div style={{ marginBottom: 'var(--space-4)' }}>
            <section className="card" data-testid="ledger-section">
              <header>
                <h2>运行账本</h2>
                <span className="right" title="harness/logs/index.jsonl（最近的排在前面）">
                  {LEDGER_WINDOWS.map((w) => (
                    <button
                      key={w.days}
                      type="button"
                      className={`btn btn-sm ${w.days === ledgerDays ? '' : 'btn-ghost'}`.trim()}
                      aria-pressed={w.days === ledgerDays}
                      onClick={() => setLedgerDays(w.days)}
                    >
                      {w.label}
                    </button>
                  ))}
                </span>
              </header>
              <LedgerTable
                entries={data.ledger}
                selectedPath={effectiveReport}
                onSelect={setSelectedReport}
                emptyContent={(() => {
                  const hint = ledgerEmptyHint(ledgerDays, data.tasks, now)
                  return (
                    <span>
                      {hint.text}
                      {hint.suggestDays !== null ? (
                        <>
                          {' '}
                          <a onClick={() => setLedgerDays(hint.suggestDays!)} style={{ cursor: 'pointer' }}>
                            改看{LEDGER_WINDOWS.find((w) => w.days === hint.suggestDays)?.label ?? '全部'}
                          </a>
                        </>
                      ) : null}
                    </span>
                  )
                })()}
              />
              <p className="muted" style={{ marginTop: 'var(--space-2)', fontSize: 11 }}>
                点任意一行打开报告全文
              </p>
            </section>
          </div>

          <Modal
            open={effectiveReport !== undefined}
            title={reportReaderTitle(effectiveReport, selectedEntry)}
            onCancel={() => setSelectedReport(undefined)}
            footer={null}
            width={960}
            styles={{ body: { maxHeight: '70vh', overflowY: 'auto' } }}
            destroyOnHidden
          >
            <ReportReader reportPath={effectiveReport} entry={selectedEntry} proposal={selectedProposal} />
          </Modal>

          <div className="grid cols-2" style={{ alignItems: 'start' }}>
            <ProposalList proposals={data.proposals} onOpenReport={setSelectedReport} />
            <RetroMatrix rows={data.retroMatrix} />
          </div>
        </>
      )}
    </div>
  )
}
