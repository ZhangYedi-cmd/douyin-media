import { Link } from 'react-router-dom'
import type { Alert } from '@console/core'
import { resolveAlertHeadline } from './ruleTitles'

// 03 §2.9 AlertCardProps——分级警报（P1 警报区、P5 可复用）。
export interface AlertCardProps {
  alert: Alert // type-only import from '@console/core'（S2 销账 lib/types.ts 临时镜像后改回）
  onOpenFile?(path: string): void // alert.evidencePath → FileDrawer
}

// 色档由 level 映射（error→danger 色 / warn→warn 色 / info→默认），对照 docs/design/overview.html .alert.a-danger/.a-warn。
const LEVEL_CLASS: Record<Alert['level'], string> = {
  error: 'a-danger',
  warn: 'a-warn',
  info: '',
}

// 复用 theme.css 全局 .alert/.sev/.why/.act（非祖先限定，overview.html 同款结构）。
//
// R5（第三波修复，2026-08-19）：alert.message 来自 core computeAlerts()，同时是 `media check`
// 命令行输出，不能为了界面好看去改它（会让 CLI 变糊）。这里改用 ruleTitles.ts 的
// resolveAlertHeadline() 把主行（<b>）换成人话标题，subject（内容 slug / 选题 id，身份证式的
// 标识，07-界面用语对照表 §8 白名单允许保留原文）和原始 message 一起降到次要行（.why，本来就是
// muted 小字）——命中映射时次要行补一次原始 message 做技术细节；没命中映射（回退用 message
// 本身当主行）时次要行只留 subject，不把 message 重复展示一遍。
export function AlertCard({ alert, onOpenFile }: AlertCardProps) {
  const { subject, message, count, evidencePath, action, level, rule } = alert
  const titleSuffix = count && count > 1 ? ` ×${count}` : '' // count>1 时标题尾缀「×N」
  const { title, hasMappedTitle } = resolveAlertHeadline(rule, message)
  const detailParts = [subject, hasMappedTitle ? message : null].filter((p): p is string => !!p)

  return (
    <div className={`alert ${LEVEL_CLASS[level]}`.trim()}>
      <span className="sev" />
      <div>
        <b>
          {title}
          {titleSuffix}
        </b>
        <p className="why">
          {detailParts.join(' · ')}
          {evidencePath ? (
            <>
              {detailParts.length > 0 ? ' · ' : ''}
              <code
                onClick={onOpenFile ? () => onOpenFile(evidencePath) : undefined}
                style={onOpenFile ? { cursor: 'pointer' } : undefined}
                title={onOpenFile ? '点击查看证据文件' : evidencePath}
              >
                {evidencePath}
              </code>
            </>
          ) : null}
        </p>
      </div>
      {action ? (
        <span className="act">
          <Link to={action.to}>{action.label}</Link>
        </span>
      ) : null}
    </div>
  )
}
