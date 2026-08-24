import { Timeline } from 'antd'
import type { AuditTrailEntry } from '@console/server/api-types'

// 03 §2.5 ⑤：审核记录（Timeline 竖向留痕），数据源 = server 解析 3-review.md 的 `- [<stamp>] <text>` 行。
export interface AuditTrailProps {
  entries: AuditTrailEntry[]
}

const KIND_COLOR: Record<string, string> = {
  // 非预设色一律引 theme.css token（红线 3）——'orange' 字面量会绕过 token 体系（W3ab 验收 minor）
  rework: 'var(--warn)',
  todo: 'var(--warn)',
  'rework-limit': 'red',
  feishu: 'blue',
  note: 'green',
}

export function AuditTrail({ entries }: AuditTrailProps) {
  if (entries.length === 0) {
    return (
      <p className="muted" style={{ fontSize: 'var(--text-xs)' }}>
        还没有审核记录。
      </p>
    )
  }
  return (
    <Timeline
      items={entries.map((e, i) => ({
        key: `${i}-${e.at ?? ''}`,
        color: KIND_COLOR[e.kind] ?? 'gray',
        children: (
          <div>
            <p>{e.text}</p>
            {e.at ? (
              <time className="mono muted" style={{ fontSize: 11 }}>
                {e.at}
              </time>
            ) : null}
          </div>
        ),
      }))}
    />
  )
}
