import styles from './backlog.module.css'

// 03 §2.6 行展开「scores 六维」：对照 docs/design/backlog.html 的 .dim/.dims + .hb-bar 进度条。
export interface DimBarsProps {
  scores: Record<string, number> | null
}

// 字段名对齐 content/_backlog/backlog.yaml 头注释：「scores 六维原始分
// {practical,social,emotion,hook,timeliness,trigger}」，1~5 分制。
const DIM_ORDER = ['practical', 'social', 'emotion', 'hook', 'timeliness', 'trigger'] as const
const DIM_LABELS: Record<(typeof DIM_ORDER)[number], string> = {
  practical: '实用',
  social: '社交货币',
  emotion: '情绪',
  hook: '钩子',
  timeliness: '时效',
  trigger: '触发',
}
const DIM_MAX = 5

export function DimBars({ scores }: DimBarsProps) {
  if (!scores || Object.keys(scores).length === 0) {
    return (
      <p className="muted" style={{ fontSize: 'var(--text-xs)' }}>
        无六维打分（系列题免引擎打分，score 留空）
      </p>
    )
  }
  const entries = DIM_ORDER.filter((k) => typeof scores[k] === 'number').map((k) => [k, scores[k]!] as const)
  return (
    <div className={styles.dims}>
      {entries.map(([k, v]) => (
        <div className={styles.dim} key={k}>
          <span className="muted">{DIM_LABELS[k]}</span>
          <div className="hb-bar">
            <i style={{ width: `${Math.max(0, Math.min(100, (v / DIM_MAX) * 100))}%` }} />
          </div>
          <span className="num">{v.toFixed(1)}</span>
        </div>
      ))}
    </div>
  )
}
