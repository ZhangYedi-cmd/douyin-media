import { useEffect, useState } from 'react'
import { Input, Modal } from 'antd'
import { useAction } from '../../lib/actions'
import { SLUG_PATTERN } from './backlogHelpers'

// P4 promote 动作需要一个 slug 输入：server whitelist.ts 已知偏差记录——`media promote` 把
// `--slug` 定为 requiredOption，02 表格原未列出，故请求体必须显式带 slug（UI 侧收集，不替用户瞎猜）。
// 03 §2.6「模拟取题卡」原设计是 CommandChip(action: promote --auto) 直接一步到位，但这里多了
// 「先问 slug」的一步——两个 Modal 不叠放：本 Modal 关闭后再交给 useAction 的标准
// dry-run 预览→确认→真执行流程（避免嵌套 Modal 观感）。
export interface PromoteTarget {
  auto?: boolean
  id?: string
  label: string
  suggestedSlug: string
}

export interface PromoteDialogProps {
  target: PromoteTarget | null
  onClose(): void
}

export function PromoteDialog({ target, onClose }: PromoteDialogProps) {
  const [slug, setSlug] = useState('')
  const { run } = useAction()

  useEffect(() => {
    if (target) setSlug(target.suggestedSlug)
  }, [target])

  if (!target) return null
  const valid = SLUG_PATTERN.test(slug)

  function handleConfirm() {
    if (!valid || !target) return
    const payload = target.auto ? { auto: true, slug } : { id: target.id, slug }
    const label = target.label
    onClose()
    void run('promote', payload, { title: `取题 · ${label}` })
  }

  return (
    <Modal
      open
      title={`取题 · ${target.label}`}
      onCancel={onClose}
      onOk={handleConfirm}
      okText="下一步：预览"
      okButtonProps={{ disabled: !valid }}
      cancelText="取消"
    >
      <p className="muted" style={{ fontSize: 'var(--text-xs)', marginBottom: 'var(--space-2)' }}>
        取题会建一个内容目录，需要给它起个名字：默认按标题/id 生成建议，可编辑；
        只能用小写字母、数字、短横线（首字符 a-z0-9，2~65 位）。
      </p>
      <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="如 ai-glasses-vs-phone" autoFocus />
      {!valid ? (
        <p style={{ color: 'var(--danger)', fontSize: 'var(--text-xs)', marginTop: 4 }}>
          slug 格式非法：需以小写字母/数字开头，仅含小写字母/数字/短横线
        </p>
      ) : null}
    </Modal>
  )
}
