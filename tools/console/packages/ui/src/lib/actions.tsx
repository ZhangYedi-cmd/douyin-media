// lib/actions.tsx：写动作唯一入口（03-前端执行方案.md §2.10）。
// useAction = 4 条快写动作（review/backlog-apply/promote/next-up）的 dry-run 预览 → 确认 → 真执行；
// useJobAction = 3 条慢作业（publish/rework/apply-proposal）的确认 → postJob(202) → JobPanel 接管。
// 两者都不消费返回值来刷新界面——真相由 chokidar→SSE 链路驱动（写者读者经文件系统解耦，02 §5）。
import { useCallback, useState } from 'react'
import type { ReactNode } from 'react'
import { Modal, Typography, message } from 'antd'
import { cancelAllJobs, cancelJob, postAction, postJob } from './api'
import type { ActionResult, CancelAllResult, FastAction, JobAction } from './api'
import { useUpsertJob, useWatchJob } from './store'
import type { Job } from '@console/server/api-types'

/** dry-run 预览 Modal 的正文：逐文件变更清单（对照 detail.html file-row）+ 原始输出折叠；
 * 失败时把 media 的错误原话直接展示（「哪条规则拦的你」直接给人看，§2.10 原文）。 */
function DryRunPreview({ result }: { result: ActionResult }) {
  if (!result.ok) {
    return (
      <div>
        <Typography.Text type="danger">{result.error ?? 'media 拒绝了这次预演，未给出具体原因'}</Typography.Text>
      </div>
    )
  }
  if (result.changes.length === 0) {
    return (
      <div>
        <p className="muted" style={{ fontSize: 'var(--text-xs)' }}>
          这次执行没有产出文件变更清单（media 未返回 writes）——见下方原始输出确认是否符合预期。
        </p>
        <details className="fold">
          <summary>查看原始输出</summary>
          <pre className="logblock">{result.stdout || '（空）'}</pre>
        </details>
      </div>
    )
  }
  return (
    <div>
      <p className="muted" style={{ fontSize: 'var(--text-xs)', marginBottom: 'var(--space-2)' }}>
        media --dry-run 预演的逐文件变更（{result.changes.length} 处）：
      </p>
      {result.changes.map((c) => (
        <div className="file-row" key={c.path}>
          <code>{c.path}</code>
          <span className="st muted">{c.summary}</span>
        </div>
      ))}
      <details className="fold" style={{ marginTop: 'var(--space-2)' }}>
        <summary>查看原始输出</summary>
        <pre className="logblock">{result.stdout || '（空）'}</pre>
      </details>
    </div>
  )
}

export interface UseActionUi {
  title?: string // Modal 标题，如「取题 T-042」
  skipDryRun?: boolean // 仅留给未来无 dry-run 语义的动作，当前一律 false（03 §2.10 原文）
}

/**
 * 4 条快写动作的唯一执行入口（03 §2.10 签名原文）。run 内部：
 * postAction(dryRun:true) → Modal 列 changes → 确认 → postAction(dryRun:false) → message 提示；
 * 取消返回 null；真执行成功/失败都返回完整 ActionResult 供调用方按需读取（如 CommandChip 的 onDone）。
 */
export function useAction(): {
  run(action: FastAction, payload: object, ui?: UseActionUi): Promise<ActionResult | null>
  running: boolean
} {
  const [running, setRunning] = useState(false)

  const run = useCallback(async (action: FastAction, payload: object, ui?: UseActionUi): Promise<ActionResult | null> => {
    setRunning(true)
    try {
      if (ui?.skipDryRun) {
        const real = await postAction(action, payload, { dryRun: false })
        if (real.ok) void message.success('已执行，界面将随 SSE 自动更新')
        else void message.error(real.error ?? '执行失败')
        return real
      }

      const preview = await postAction(action, payload, { dryRun: true })
      const confirmed = await new Promise<boolean>((resolve) => {
        Modal.confirm({
          title: ui?.title ?? '确认执行',
          width: 640,
          okText: preview.ok ? '确认执行' : '预演失败，无法执行',
          okButtonProps: { disabled: !preview.ok, danger: !preview.ok },
          cancelText: '取消',
          content: <DryRunPreview result={preview} />,
          onOk: () => resolve(true),
          onCancel: () => resolve(false),
        })
      })
      // 取消（含预演失败时 OK 按钮被禁用、用户只能点取消/关闭两种情形）：dry-run 阶段零写入，
      // 严格对齐 §2.10「null = 用户取消」语义；预演失败原因已在 Modal 内容里给用户看过，不重复上抛。
      if (!confirmed) return null

      const real = await postAction(action, payload, { dryRun: false })
      if (real.ok) void message.success('已执行，界面将随 SSE 自动更新')
      else void message.error(real.error ?? '执行失败')
      return real
    } finally {
      setRunning(false)
    }
  }, [])

  return { run, running }
}

/**
 * 3 条慢作业的唯一执行入口（03 §2.10 签名原文）。start 内部：
 * 确认 Modal（summary 卡）→ postJob → 202 → jobs Map 立即挂 queued 项 → 注册 SSE job:<id> 监听
 * → 后续进度全靠 SSE 推送 → JobPanel 呈现。取消 / 提交失败均返回 null。
 */
export interface UseJobActionUi {
  title?: string
  summary?: ReactNode
  // C2（P1）修复：发布这类不可逆动作要能把确认按钮标成危险色，与「重做任务」这类可逆慢作业区分开
  // （antd Modal.confirm 原生支持 okButtonProps.danger，不必自己实现变体按钮）。默认 false=旧行为不变。
  danger?: boolean
}

export function useJobAction(): {
  start(action: JobAction, payload: object, ui?: UseJobActionUi): Promise<string | null>
} {
  const watchJob = useWatchJob()
  const upsertJob = useUpsertJob()

  const start = useCallback(
    async (action: JobAction, payload: object, ui?: UseJobActionUi): Promise<string | null> => {
      const confirmed = await new Promise<boolean>((resolve) => {
        Modal.confirm({
          title: ui?.title ?? '确认派发任务',
          width: 560,
          okText: ui?.danger ? '确认发布，不可撤销' : '确认执行',
          okButtonProps: ui?.danger ? { danger: true } : undefined,
          cancelText: '取消',
          content: ui?.summary ?? (
            <p className="muted" style={{ fontSize: 'var(--text-xs)' }}>
              将派发一个后台任务（无头 Claude Code 执行），进度可在右下角任务面板实时查看。
            </p>
          ),
          onOk: () => resolve(true),
          onCancel: () => resolve(false),
        })
      })
      if (!confirmed) return null

      try {
        const { jobId } = await postJob(action, payload)
        const slugField = (payload as { slug?: unknown }).slug
        const placeholder: Job = {
          id: jobId,
          type: action,
          slug: typeof slugField === 'string' ? slugField : undefined,
          state: 'queued',
          milestones: [],
          narration: [],
          stalling: false,
          logPath: '',
        }
        upsertJob(placeholder) // 立即可见（§2.10 原文），随后被首条 SSE job:<id> 全量覆盖
        watchJob(jobId)
        void message.success('任务已受理，进度见右下角任务面板')
        return jobId
      } catch (err) {
        void message.error(err instanceof Error ? err.message : String(err))
        return null
      }
    },
    [watchJob, upsertJob],
  )

  return { start }
}

/**
 * 取消（2026-08-19 新增，看板「取消任务」能力）的唯一执行入口：确认 Modal → 直调 lib/api.ts 的
 * cancelJob/cancelAllJobs（POST 即时生效，200 直接拿真实结果）。刻意不复用 useJobAction——那是
 * 给"派发一条新的慢作业"用的（确认后 postJob→202→挂 queued 占位→watchJob 起一条新的 SSE 追踪），
 * 取消是对一个**已经存在**的任务的即时操作：没有占位可挂，该任务本就已经在被追踪，也不需要
 * 202+jobId 那套信封。与 useAction/useJobAction 同一原则：不消费返回值来刷新界面，后续状态变化
 * 全靠既有 SSE `job:<id>` 推送（server 侧 cancelJob/cancelAllJobs 内部都会调 sse.jobUpdate）。
 */
export interface UseCancelJobUi {
  title: string
  summary: ReactNode
}

export function useCancelJob(): {
  cancelOne(job: Job, ui: UseCancelJobUi): Promise<boolean>
  cancelAll(ui: UseCancelJobUi): Promise<CancelAllResult | null>
} {
  const cancelOne = useCallback(async (job: Job, ui: UseCancelJobUi): Promise<boolean> => {
    const confirmed = await new Promise<boolean>((resolve) => {
      Modal.confirm({
        title: ui.title,
        width: 560,
        okText: '确认取消',
        okButtonProps: { danger: true },
        cancelText: '再想想',
        content: ui.summary,
        onOk: () => resolve(true),
        onCancel: () => resolve(false),
      })
    })
    if (!confirmed) return false
    try {
      await cancelJob(job.id)
      void message.success('已发出取消指令，最新状态见任务卡')
      return true
    } catch (err) {
      void message.error(err instanceof Error ? err.message : String(err))
      return false
    }
  }, [])

  const cancelAll = useCallback(async (ui: UseCancelJobUi): Promise<CancelAllResult | null> => {
    const confirmed = await new Promise<boolean>((resolve) => {
      Modal.confirm({
        title: ui.title,
        width: 560,
        okText: '确认全部取消',
        okButtonProps: { danger: true },
        cancelText: '再想想',
        content: ui.summary,
        onOk: () => resolve(true),
        onCancel: () => resolve(false),
      })
    })
    if (!confirmed) return null
    try {
      const result = await cancelAllJobs()
      const activeNote = result.cancelledActive ? '，正在跑的 1 个已发出终止信号' : ''
      void message.success(`已清空排队 ${result.cancelledQueued} 个${activeNote}`)
      return result
    } catch (err) {
      void message.error(err instanceof Error ? err.message : String(err))
      return null
    }
  }, [])

  return { cancelOne, cancelAll }
}
