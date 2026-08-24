import type { MetaStatus } from '@console/core'

// 03 §2.9 StatusTagProps——meta 状态徽标，全站唯一状态→色映射处。
export interface StatusTagProps {
  status: MetaStatus
  withText?: boolean
}

// 色映射（原型语义色约定，03 §2.9）：drafting=accent，review=warn，
// approved/scheduled/published=success，rejected=danger，ideated/retro_done=默认灰。
// （publishing 非 01 §2.14 MetaStatus 枚举成员，原型残留已删——冲突 #12）
const STATUS_META: Record<MetaStatus, { variant: 'accent' | 'warn' | 'success' | 'danger' | 'default'; label: string }> = {
  ideated: { variant: 'default', label: '已选题' },
  drafting: { variant: 'accent', label: '在写' },
  review: { variant: 'warn', label: '待审' },
  approved: { variant: 'success', label: '待发' },
  scheduled: { variant: 'success', label: '已排期' },
  published: { variant: 'success', label: '已发布' },
  retro_done: { variant: 'default', label: '复盘完成' },
  rejected: { variant: 'danger', label: '已否' },
}

const VARIANT_CLASS: Record<string, string> = {
  accent: 'b-accent',
  warn: 'b-warn',
  success: 'b-success',
  danger: 'b-danger',
  default: '',
}

/** 状态→中文标签唯一取值处（S6 StageTimeline 节点标题复用，避免另起一份文案——「同一规则只写一处」）。 */
export function statusLabel(status: MetaStatus): string {
  return STATUS_META[status].label
}

// 复用 theme.css 全局 .badge/.badge.b-* 类（非祖先选择器限定，可跨页直接用）。
export function StatusTag({ status, withText = true }: StatusTagProps) {
  const meta = STATUS_META[status]
  const variantClass = VARIANT_CLASS[meta.variant]
  return (
    <span className={`badge ${variantClass}`.trim()} title={meta.label}>
      <i />
      {withText ? meta.label : null}
    </span>
  )
}
