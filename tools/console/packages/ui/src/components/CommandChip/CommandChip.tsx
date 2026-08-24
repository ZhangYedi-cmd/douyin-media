import { message } from 'antd'
import { useAction } from '../../lib/actions'
import type { FastAction, ActionResult } from '../../lib/api'
import styles from './CommandChip.module.css'

// 03 §2.9 CommandChipProps——命令生成/执行双形态。
export interface CommandChipProps {
  command: string // 完整 media 命令文本（展示 + 复制）
  mode?: 'copy' | 'action' // 默认 'copy'
  action?: FastAction // mode='action' 时映射的 POST 名
  payload?: Record<string, unknown>
  confirmTitle?: string // dry-run 确认 Modal 标题
  onDone?(r: ActionResult): void
}

export function CommandChip({ command, mode = 'copy', action, payload, confirmTitle, onDone }: CommandChipProps) {
  const [messageApi, contextHolder] = message.useMessage()
  const { run } = useAction()

  async function handleClick() {
    await navigator.clipboard.writeText(command)

    if (mode === 'action') {
      // action 形态：S5 起真接 useAction 的 dry-run 预览 → 确认 → 真执行全流程（03 §2.10）。
      if (!action) {
        messageApi.error('CommandChip mode="action" 缺少 action 属性，无法执行（仅完成复制）')
        return
      }
      const result = await run(action, payload ?? {}, { title: confirmTitle })
      if (result) onDone?.(result) // null = 用户取消，不回调（契约「null = 用户取消」）
      return
    }

    messageApi.success('已复制，仅复制不执行')
  }

  return (
    <>
      {contextHolder}
      <button type="button" className={styles.chip} onClick={handleClick} title={command}>
        <code className={styles.command}>{command}</code>
        <span className={styles.copyIcon} aria-hidden="true">
          ⧉
        </span>
      </button>
    </>
  )
}
