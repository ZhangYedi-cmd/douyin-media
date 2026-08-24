import { useState } from 'react'
import { Collapse, Steps, Tag } from 'antd'
import type { Job, JobState } from '@console/server/api-types'
import { useCancelJob } from '../../lib/actions'
import { buildMilestoneSteps } from './milestoneSteps'

// 03 §2.9 JobCardProps——面板内单任务卡（P3 决策区也复用，见 detail/DecisionPanel）。
export interface JobCardProps {
  job: Job
  defaultExpanded?: boolean
  /**
   * JobPanel「历史任务」区专用（03 §2.9 原设计没有这个 prop）：本波把面板生命周期拆成
   * 进行中/已终结两段后，终结任务需要一个"标记已读"的动作驱动 localStorage 已读表
   * （见 JobPanel.tsx / visibility.ts）。可选、未传时不渲染按钮，P3 DecisionPanel、
   * P5 ProposalList 两处既有复用方零改动。
   */
  onDismiss?: () => void
}

// 2026-08-19 增补 'cancelled'（看板「取消任务」能力）：刻意与 'failed' 用不同文案/颜色区分开——
// 「人主动停的」和「跑挂了的」在历史区看起来必须不一样，否则用户没法从列表一眼分辨哪些是故障、
// 哪些只是自己手滑点太多任务后清理掉的（这正是本次改动要解决的真实事故的后续可读性诉求）。
// STATE_LABEL/TYPE_LABEL 导出理由同 jobTitleSuffix（本包无 jsdom，见 lib/api.test.ts 顶部说明）：
// 2026-08-19 起（CC 运行日志查看功能，L 号执行）也被 pages/detail/JobHistoryTab.tsx、
// pages/harness/TaskRunHistory.tsx 复用——两处「历史任务列表」都要用同一套中文状态/类型标签，
// 不必各写一份易漂移的拷贝（03 §界面用语对照表「状态词全站唯一出处」同一原则）。
export const STATE_LABEL: Record<JobState, string> = {
  queued: '排队中',
  running: '执行中',
  verifying: '校验中',
  succeeded: '已完成',
  failed: '失败',
  cancelled: '已取消',
}

const STATE_BADGE: Record<JobState, string> = {
  queued: '',
  running: 'b-accent',
  verifying: 'b-accent',
  succeeded: 'b-success',
  failed: 'b-danger',
  cancelled: 'b-warn', // 警示黄而非失败红：这是人主动按停的，不是系统故障
}

export const TYPE_LABEL: Record<Job['type'], string> = {
  publish: '发布',
  rework: '重做',
  'apply-proposal': '入库提议',
  'harness-run': '运行治理任务',
  create: '开始创作',
}

/** 标题后缀（TYPE_LABEL 之后的「 · xxx」）：三种身份字段互斥——publish/rework/create 有 slug，
 * apply-proposal 有 report，harness-run（治理任务，无 slug 概念）只有 task。优先级 slug > report
 * > task，任一存在即用，全无则不加后缀。抽成纯函数单测（本包无 jsdom，见 lib/api.test.ts 顶部说明；
 * 直接从本文件导出，测试直接 import 本文件——node 环境下 import 一个引入 antd 的 .tsx 模块、
 * 只取纯函数不渲染 JSX 已实测不会报错）。 */
export function jobTitleSuffix(job: Pick<Job, 'slug' | 'report' | 'task'>): string {
  if (job.slug) return ` · ${job.slug}`
  if (job.report) return ` · ${job.report}`
  if (job.task) return ` · ${job.task}`
  return ''
}

// isTerminal/isCancellable 导出理由同 jobTitleSuffix（本包无 jsdom，见 lib/api.test.ts 顶部说明）：
// 这两个纯函数编码了「取消按钮该不该出现」「终结态该不该显示裁定/成本」的实际业务判定，
// 值得单独锁定测试，不依赖渲染整个 JobCard。
export function isTerminal(state: JobState): boolean {
  return state === 'succeeded' || state === 'failed' || state === 'cancelled'
}

/** 可取消的状态：还没开始（queued）或还在跑（running/verifying）；终结态取消是无效操作
 *（server 端 runner.ts cancelJob 会拒 PRECONDITION_FAILED），按钮压根不该出现让人去点。 */
export function isCancellable(state: JobState): boolean {
  return state === 'queued' || state === 'running' || state === 'verifying'
}

/** 取消确认弹窗正文：风险说明是任务卡的硬要求——子进程会被强行终止，已经写出去的文件不会自动
 * 回滚（创作任务可能已写了半份口播稿、治理任务可能已写了半份报告），需要人自己检查现场。
 * queued 场景据实说明"还没跑，没有副作用"，不夸大风险（红线：不编造）。 */
function CancelJobSummary({ job }: { job: Job }) {
  const label = `${TYPE_LABEL[job.type]}${jobTitleSuffix(job)}`
  return (
    <div>
      <p style={{ marginBottom: 'var(--space-2)', fontSize: 'var(--text-sm)' }}>
        <strong>{label}</strong>
      </p>
      {job.state === 'queued' ? (
        <p style={{ fontSize: 'var(--text-sm)' }}>该任务还在排队、尚未开始执行，取消会直接把它从队列移除，没有副作用。</p>
      ) : (
        <>
          <p style={{ fontSize: 'var(--text-sm)', marginBottom: 'var(--space-2)' }}>
            该任务正在执行中，确认后会强行终止后台子进程（先发 SIGTERM，10 秒内不退出再补一记 SIGKILL）。
          </p>
          <p style={{ color: 'var(--danger)', fontSize: 'var(--text-xs)', fontWeight: 600 }}>
            已经写出去的文件不会自动回滚——比如创作任务可能已经写了半份口播稿、治理任务可能已经写了半份报告，
            取消后这些文件仍留在原地，需要自己检查现场、决定是留是删。
          </p>
        </>
      )}
    </div>
  )
}

/**
 * 渲染：Steps(vertical, small) 吃 job.milestones；narration 折叠区只展示（信任分级 1，say 事件
 * 永不驱动状态）；state==='queued'/'running'/'verifying' 且 stalling 显「任务卡顿中」warn 徽标；
 * 终结态显 costUsd 标签 +「以页面数据为准」提示——终局裁决是文件状态经 SSE 刷新，不是本卡片
 * （信任分级 3，03 §2.9 原文）。
 */
export function JobCard({ job, defaultExpanded = false, onDismiss }: JobCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const { cancelOne } = useCancelJob()
  // server 崩溃降级路径（jobs.ts GET /api/jobs/:id）可能回一个 state:'unknown' 的裁剪对象——
  // 类型上不属于 JobState 联合，这里做运行时防御，不假设后端总是给合法值。
  const stateKey: JobState | undefined = job.state in STATE_LABEL ? job.state : undefined
  const terminal = stateKey ? isTerminal(stateKey) : false
  const cancellable = stateKey ? isCancellable(stateKey) : false

  async function handleCancel() {
    await cancelOne(job, {
      title: `确认取消：${TYPE_LABEL[job.type]}${jobTitleSuffix(job)}`,
      summary: <CancelJobSummary job={job} />,
    })
  }

  // 里程碑→Steps items 换算逻辑 2026-08-19 抽到 milestoneSteps.ts（buildMilestoneSteps），
  // JobLogView 的 L1 时间轴复用同一份规则，两处不必各写一份易漂移的拷贝（该文件头注释有完整说明，
  // 含「人取消的」与「跑挂了的」为何用不同标题区分）。
  const stepItems = buildMilestoneSteps(job)

  return (
    <div className="card" style={{ padding: 'var(--space-3)' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          marginBottom: expanded ? 'var(--space-3)' : 0,
          flexWrap: 'wrap',
        }}
      >
        <b style={{ fontSize: 'var(--text-sm)' }}>
          {TYPE_LABEL[job.type]}
          {jobTitleSuffix(job)}
        </b>
        <span className={`badge ${stateKey ? STATE_BADGE[stateKey] : ''}`.trim()}>
          <i />
          {stateKey ? STATE_LABEL[stateKey] : '状态未知（服务重启过，请以文件为准）'}
        </span>
        {job.stalling ? (
          <span className="badge b-warn">
            <i />
            任务卡顿中
          </span>
        ) : null}
        {job.cancelRequested ? (
          <span className="badge b-warn">
            <i />
            正在停止中
          </span>
        ) : null}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 'var(--space-2)' }}>
          {cancellable ? (
            <button type="button" className="btn btn-sm btn-danger" disabled={job.cancelRequested} onClick={() => void handleCancel()}>
              取消
            </button>
          ) : null}
          {onDismiss ? (
            <button type="button" className="btn btn-sm btn-ghost" onClick={onDismiss}>
              标记已读
            </button>
          ) : null}
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => setExpanded((v) => !v)}>
            {expanded ? '收起' : '展开'}
          </button>
        </div>
      </header>
      {expanded ? (
        <div>
          {stepItems.length > 0 ? (
            <Steps direction="vertical" size="small" items={stepItems} />
          ) : (
            <p className="muted" style={{ fontSize: 'var(--text-xs)' }}>
              刚提交，尚无里程碑上报。
            </p>
          )}
          {job.narration.length > 0 ? (
            <Collapse
              ghost
              size="small"
              style={{ marginTop: 'var(--space-2)' }}
              items={[
                {
                  key: 'narration',
                  label: `执行过程（${job.narration.length} 条，仅供查看）`,
                  children: <div className="logblock">{job.narration.map((n) => n.text).join('\n')}</div>,
                },
              ]}
            />
          ) : null}
          {job.verdict ? (
            <p className="muted" style={{ fontSize: 'var(--text-xs)', marginTop: 'var(--space-2)' }}>
              裁定：{job.verdict.ok ? '通过' : '未通过'}
              {job.verdict.note ? ` · ${job.verdict.note}` : ''}
            </p>
          ) : null}
          {/* apply-proposal job 的 verdict.diff = `git diff -- brain/`（server jobs/verdict.ts
              verdictApplyProposal）——P5「brain diff 审计」的落地物：采纳与否人在 diff 面前拍板，
              本卡片只展示，不代为应用（JobCard 跨页复用，其它 job 类型没有 diff 字段，条件渲染不影响它们）。 */}
          {job.verdict?.diff ? (
            <Collapse
              ghost
              size="small"
              defaultActiveKey={['diff']}
              style={{ marginTop: 'var(--space-2)' }}
              items={[
                {
                  key: 'diff',
                  label: '大脑改动（是否采纳由人决定）',
                  children: <pre className="logblock">{job.verdict.diff}</pre>,
                },
              ]}
            />
          ) : null}
          {terminal ? (
            <p className="muted" style={{ fontSize: 'var(--text-xs)', marginTop: 'var(--space-2)' }}>
              {typeof job.costUsd === 'number' ? <Tag>{`成本 $${job.costUsd.toFixed(4)}`}</Tag> : null}
              最终状态以页面数据为准（会自动刷新），本卡片仅供参考。
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
