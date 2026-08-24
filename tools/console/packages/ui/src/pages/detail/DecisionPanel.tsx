import { useState } from 'react'
import type { MetaStatus } from '@console/core'
import type { AllowedTransition, ContentCheck } from '@console/server/api-types'
import { useAction, useJobAction } from '../../lib/actions'
import { CommandChip } from '../../components/CommandChip'
import { buildPublishSummary, computeDecisionButtons } from './decisionButtons'
import type { DecisionButton, PublishSummaryView } from './decisionButtons'
import styles from './detail.module.css'

// 03 §2.5「DecisionPanel props 草案」+ 动作矩阵表。全站写动作最密的一块面板：
// review 三向 flip（useAction）、approved 确认发布（useJobAction）、
// review/rejected/drafting 派发重做任务（useJobAction）、published 缺 url 补链接（CommandChip copy）。
export interface DecisionPanelProps {
  slug: string
  status: MetaStatus
  checks: ContentCheck[]
  allowedTransitions: AllowedTransition[]
  publishUrl?: string | null
  schedule?: string | null
  hasActiveJob: boolean // 有则决策区置灰、显示 JobCard（由父组件 detail/index.tsx 另行渲染 JobCard）
  // C2 修复新增：确认发布/重做任务的确认弹窗要展示真实标题，原 props 未列（03 §2.5 表未收录），
  // 偏离处见下方 handlePublish/handleReworkJob 注释。
  title?: string
}

const CHECK_MARK: Record<ContentCheck['level'], string> = { ok: '✓', warn: '!', bad: '✕' }
const CHECK_ROW_CLASS: Record<ContentCheck['level'], string> = { ok: '', warn: 'warn', bad: 'bad' }

/** C2（P1）确认发布弹窗正文：不可逆动作要给足信息再让人按下去——标题/slug/封面成片是否已出/排期
 * 一次性摆出来，末尾加不可撤销警示（任务卡原文要求）。数据全部来自 buildPublishSummary 这个纯函数
 * 的视图，不新增接口。 */
function PublishSummaryContent({ view }: { view: PublishSummaryView }) {
  return (
    <div>
      <p style={{ marginBottom: 'var(--space-2)' }}>
        <strong>{view.title}</strong>{' '}
        <span className="muted" style={{ fontSize: 'var(--text-xs)' }}>
          · {view.slug}
        </span>
      </p>
      <ul style={{ margin: '0 0 var(--space-3)', paddingLeft: '1.2em', fontSize: 'var(--text-sm)' }}>
        <li>封面：{view.cover.ready ? '已出' : `未出（${view.cover.note}）`}</li>
        <li>成片：{view.video.ready ? '已出' : `未出（${view.video.note}）`}</li>
        <li>{view.scheduleText}</li>
      </ul>
      <p style={{ color: 'var(--danger)', fontSize: 'var(--text-xs)', fontWeight: 600 }}>
        发布后不可撤销——确认即把视频真实发布到抖音账号；如需撤回，需去抖音创作者中心手动删除/下架。
      </p>
    </div>
  )
}

/** 重做任务（慢作业）弹窗正文：同样带上标题 + 打回说明全文，避免「无头 Claude Code 执行」这句
 * 通用话术让人不知道到底要重做什么（任务卡「rework 也顺手给个像样的 summary」）。 */
function ReworkSummaryContent({ slug, title, reason }: { slug: string; title: string; reason: string }) {
  return (
    <div>
      <p style={{ marginBottom: 'var(--space-2)' }}>
        <strong>{title}</strong>{' '}
        <span className="muted" style={{ fontSize: 'var(--text-xs)' }}>
          · {slug}
        </span>
      </p>
      <p className="muted" style={{ fontSize: 'var(--text-xs)', marginBottom: 'var(--space-2)' }}>
        将派发一个后台重做任务（无头 Claude Code 执行），按下面这段说明重新生成内容，进度可在右下角任务面板实时查看。
      </p>
      <p style={{ fontSize: 'var(--text-sm)', whiteSpace: 'pre-wrap' }}>{reason}</p>
    </div>
  )
}

export function DecisionPanel({ slug, status, checks, allowedTransitions, publishUrl, schedule, hasActiveJob, title }: DecisionPanelProps) {
  const [reason, setReason] = useState('')
  const { run, running: actionRunning } = useAction()
  const { start } = useJobAction()

  const buttons = computeDecisionButtons({ status, allowedTransitions, publishUrl, slug })
  const needsReason = buttons.some((b) => (b.kind === 'flip' && b.requiresReason) || b.kind === 'rework-job')
  const displayTitle = title && title.trim() !== '' ? title : slug

  async function handleFlip(btn: Extract<DecisionButton, { kind: 'flip' }>) {
    if (btn.requiresReason && reason.trim() === '') return // 表单校验：不填理由无法提交（S6 验收③）
    const result = await run(
      'review',
      { slug, decision: btn.decision, reason: btn.requiresReason ? reason : undefined },
      { title: `${btn.label} · ${slug}` },
    )
    if (result?.ok) setReason('')
  }

  async function handleReworkJob() {
    if (reason.trim() === '') return // rework job 的 reason 服务端必填（jobs.ts badParam），前端同拦截
    const jobId = await start('rework', { slug, reason }, {
      title: `派发重做任务 · ${displayTitle}`,
      summary: <ReworkSummaryContent slug={slug} title={displayTitle} reason={reason} />,
    })
    if (jobId) setReason('')
  }

  async function handlePublish() {
    const view = buildPublishSummary({ slug, title, schedule, checks })
    // C2（P1）修复：发布不可逆，弹窗给真实摘要 + danger 语义（原实现只有 useJobAction 默认话术，
    // 且按钮与「重做任务」这类可逆动作同为 btn-primary，风险和摩擦成反比——任务卡原文）。
    await start('publish', { slug }, {
      title: `确认发布 · ${view.title}`,
      summary: <PublishSummaryContent view={view} />,
      danger: true,
    })
  }

  return (
    <aside className="review-panel card">
      <header>
        <h2>审核决策</h2>
      </header>

      {checks.length > 0 ? (
        <div className="check-list">
          {checks.map((c) => (
            <div className={`check-row ${CHECK_ROW_CLASS[c.level]}`.trim()} key={c.label}>
              <span className="mark">{CHECK_MARK[c.level]}</span>
              <span>{c.label}</span>
              <span className="state">{c.note}</span>
            </div>
          ))}
        </div>
      ) : null}

      {hasActiveJob ? (
        <p className="muted" style={{ marginTop: 'var(--space-4)', fontSize: 'var(--text-xs)' }}>
          有任务正在处理该内容（见上方任务卡），决策区已置灰——完成前不要重复派发。
        </p>
      ) : buttons.length === 0 ? (
        <p className="muted" style={{ marginTop: 'var(--space-4)', fontSize: 'var(--text-xs)' }}>
          {status === 'scheduled' && schedule
            ? `已排期 ${schedule}，超时由 P1 警报承担，本页无需动作。`
            : status === 'scheduled'
              ? '已排期，超时由 P1 警报承担，本页无需动作。'
              : '当前状态无待决策动作。'}
        </p>
      ) : (
        <>
          {needsReason ? (
            <>
              <label className="eyebrow" style={{ display: 'block', margin: 'var(--space-4) 0 var(--space-2)' }}>
                审核意见 / 重做说明
              </label>
              <textarea
                className={styles.reasonTextarea}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="打回 / 否决 / 派发重做任务前必须说明修改点"
              />
            </>
          ) : null}
          <div className={styles.actions}>
            {buttons.map((btn) => {
              if (btn.kind === 'flip') {
                const disabled = hasActiveJob || actionRunning || (btn.requiresReason && reason.trim() === '')
                const variant = btn.decision === 'rejected' ? 'btn-danger' : btn.decision === 'approved' ? 'btn-primary' : ''
                return (
                  <button
                    key={btn.decision}
                    type="button"
                    className={`btn ${variant}`.trim()}
                    disabled={disabled}
                    onClick={() => void handleFlip(btn)}
                  >
                    {btn.label}
                  </button>
                )
              }
              if (btn.kind === 'publish') {
                // C2 修复：不可逆动作用危险色语义（btn-danger），不再和「审核通过」共用 btn-primary——
                // 与旁边可逆的普通动作区分开（任务卡原文「风险和摩擦成反比」）。
                return (
                  <button key="publish" type="button" className="btn btn-danger" disabled={hasActiveJob} onClick={() => void handlePublish()}>
                    {btn.label}
                  </button>
                )
              }
              if (btn.kind === 'rework-job') {
                return (
                  <button
                    key="rework-job"
                    type="button"
                    className="btn"
                    disabled={hasActiveJob || reason.trim() === ''}
                    onClick={() => void handleReworkJob()}
                  >
                    {btn.label}
                  </button>
                )
              }
              return <CommandChip key="copy-url" command={btn.command} />
            })}
          </div>
        </>
      )}
    </aside>
  )
}
