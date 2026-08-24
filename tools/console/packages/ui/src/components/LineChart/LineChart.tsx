import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { computeLineChartLayout } from './layout'
import type { LineChartPoint } from './layout'

// 03 §2.9 LineChartProps——参数化 SVG 折线（拍板 F5，~60 行，不上图表库）。
export interface LineChartProps {
  points: LineChartPoint[] // y=null 表示缺值断线
  height?: number // viewBox 高，默认 240
  yFormat?(v: number): string // 如 v => `${v}%`
  minPoints?: number // 有效点少于此(默认 5)不画线，渲染 fallback
  fallback?: ReactNode // 通常传快照表引导文案
  annotateMax?: boolean // 峰值直接标注（对照原型）
}

const WIDTH = 640

// 交互：mousemove 最近点十字线 + tooltip（对照 metrics.html 实现意图，React 重写）。
// 复用 theme.css 全局 .chart/.chart .axis/.chart .gridline/.chart-tip（非祖先限定，跨组件可直接用）。
export function LineChart({ points, height = 240, yFormat, minPoints = 5, fallback, annotateMax }: LineChartProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const layout = computeLineChartLayout(points, { width: WIDTH, height, minPoints })

  if (!layout.drawable) {
    return (
      <div className="chart">{fallback ?? <p className="muted">数据点不足（少于 {minPoints} 个有效值），暂不绘制趋势线</p>}</div>
    )
  }

  const valid = layout.points.filter((p) => p.valid)
  const hover = hoverIdx !== null ? valid[hoverIdx] : undefined
  const formatY = (v: number) => (yFormat ? yFormat(v) : String(Math.round(v * 10) / 10))

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect || valid.length === 0) return
    const sx = ((e.clientX - rect.left) / rect.width) * WIDTH
    let best = 0
    valid.forEach((p, i) => {
      if (Math.abs(p.cx - sx) < Math.abs(valid[best]!.cx - sx)) best = i
    })
    setHoverIdx(best)
  }

  return (
    <div className="chart">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${height}`}
        role="img"
        aria-label="趋势折线图，悬停查看各点数值"
        onMouseMove={onMove}
        onMouseLeave={() => setHoverIdx(null)}
      >
        {layout.gridLines.map((g) => (
          <g key={g.y}>
            <line className="gridline" x1={layout.padding.left} y1={g.y} x2={WIDTH - layout.padding.right} y2={g.y} />
            <text className="axis" x={layout.padding.left - 6} y={g.y + 4} textAnchor="end">
              {formatY(g.value)}
            </text>
          </g>
        ))}
        {layout.points.map((p, i) => (
          <text key={i} className="axis" x={p.cx} y={height - 10} textAnchor="middle">
            {p.point.x}
          </text>
        ))}
        {hover ? (
          <line x1={hover.cx} y1={layout.padding.top} x2={hover.cx} y2={height - layout.padding.bottom} stroke="var(--border)" strokeWidth={1} />
        ) : null}
        <path d={layout.pathD} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinejoin="round" />
        {valid.map((p, i) => (
          <circle key={i} cx={p.cx} cy={p.cy} r={hoverIdx === i ? 5 : 3.5} fill="var(--surface)" stroke="var(--accent)" strokeWidth={2} />
        ))}
        {annotateMax && layout.maxPoint ? (
          <text
            x={layout.maxPoint.cx}
            y={layout.maxPoint.cy - 10}
            textAnchor="middle"
            style={{ font: '600 11px var(--font-mono)', fill: 'var(--fg)' }}
          >
            {formatY(layout.maxPoint.point.y as number)}
          </text>
        ) : null}
      </svg>
      {hover ? (
        <div className="chart-tip on" style={{ left: `${(hover.cx / WIDTH) * 100}%`, top: `${(hover.cy / height) * 100}%` }}>
          {hover.point.tip ?? (hover.point.y !== null ? formatY(hover.point.y) : '—')}
        </div>
      ) : null}
    </div>
  )
}
