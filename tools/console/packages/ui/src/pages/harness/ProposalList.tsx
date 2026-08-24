import { useState } from 'react'
import type { ProposalItem } from '@console/server/api-types'
import { useAction, useJobAction } from '../../lib/actions'
import { useJob } from '../../lib/store'
import { JobCard } from '../../components/JobPanel'

// 03 §2.7 ④：待审提议聚合（核心裁决区）——每份 applied=false 报告一卡；
// [结构化] 应用按钮直落 backlog-apply；[散文] 派发入库任务(job)，done 后任务卡展开 brain diff 审计
// （job.verdict.diff = `git diff -- brain/`，见 server jobs/verdict.ts verdictApplyProposal）。
export interface ProposalListProps {
  proposals: ProposalItem[]
  onOpenReport(reportPath: string): void
}

function ProposalCard({ proposal, onOpenReport }: { proposal: ProposalItem; onOpenReport(path: string): void }) {
  const { run } = useAction()
  const { start } = useJobAction()
  const [jobId, setJobId] = useState<string | undefined>(undefined)
  const job = useJob(jobId)

  async function handleApply() {
    if (!proposal.structured) return
    await run(
      'backlog-apply',
      {
        id: proposal.structured.backlogId,
        action: proposal.structured.action,
        proposal: proposal.reportPath,
        into: proposal.structured.into,
      },
      { title: `应用提议 · ${proposal.structured.backlogId}` },
    )
  }

  async function handleDispatch() {
    const id = await start(
      'apply-proposal',
      { report: proposal.reportPath },
      {
        title: `派发入库任务 · ${proposal.taskLabel}`,
        summary: (
          <p className="muted" style={{ fontSize: 'var(--text-xs)' }}>
            将派发一个无头 Claude Code 任务，把「{proposal.summary}」的散文提议改写进 brain/ 对应文件；
            完成后本卡片展开 git diff（brain diff 审计），采纳与否人在 diff 面前拍板，不自动生效。
          </p>
        ),
      },
    )
    if (id) setJobId(id)
  }

  return (
    <div className="proposal" style={{ marginBottom: 'var(--space-3)' }}>
      <p className="eyebrow">
        {proposal.taskLabel}
        <span className="badge" style={{ marginLeft: 6 }}>
          <i />
          {proposal.kind === 'structured' ? '结构化' : '散文'}
        </span>
      </p>
      {/* proposal.summary 是 server 端拼的机读格式行（`task(target): result（findings=N）`，
          见 projections.ts deriveProposals），本质是账本摘要不是人写的句子，target 字段可能是
          任意证据文件路径——用 <code> 承载与账本/证据路径的既有约定一致，也不强行「翻译」
          这行本就不是给人读的散文。 */}
      <p style={{ fontSize: 'var(--text-sm)', margin: '4px 0' }}>
        <code>{proposal.summary}</code>
      </p>
      <p className="muted" style={{ fontSize: 11 }}>
        <a onClick={() => onOpenReport(proposal.reportPath)} style={{ cursor: 'pointer' }}>
          读整份报告 →
        </a>
      </p>
      <div style={{ marginTop: 'var(--space-2)' }}>
        {proposal.kind === 'structured' && proposal.structured ? (
          <button type="button" className="btn btn-sm btn-primary" onClick={() => void handleApply()} disabled={!!job}>
            应用提议
          </button>
        ) : (
          <button type="button" className="btn btn-sm" onClick={() => void handleDispatch()} disabled={!!job}>
            派发入库任务
          </button>
        )}
      </div>
      {job ? (
        <div style={{ marginTop: 'var(--space-3)' }}>
          <JobCard job={job} defaultExpanded />
        </div>
      ) : null}
    </div>
  )
}

export function ProposalList({ proposals, onOpenReport }: ProposalListProps) {
  return (
    <section className="card" data-testid="proposal-list">
      <header>
        <h2>待审提议聚合</h2>
        <span className="right">
          待应用 · {proposals.length} 份
        </span>
      </header>
      {proposals.length === 0 ? (
        <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>
          没有待审提议，都处理完了。
        </p>
      ) : (
        // key 不能只用 reportPath：同一份 retro 报告常常同时覆盖多个 target/window，
        // deriveProposals()（server projections.ts）会为该报告的每条 harness run 各产一张提议卡，
        // reportPath 因而在 proposals 数组里可重复（真实数据已实测撞出 React 重复 key 警告）——
        // 拼上数组下标兜底唯一，proposals 顺序在一次渲染内稳定（server 端已排好序，本页不重排）。
        proposals.map((p, i) => <ProposalCard key={`${p.reportPath}#${i}`} proposal={p} onOpenReport={onOpenReport} />)
      )}
    </section>
  )
}
