// LineChart 的判定与几何计算——纯函数，不碰 DOM（03 §2.9 LineChartProps 的落地基础，拍板 F5：
// 折线 = 参数化 SVG 组件，不上图表库）。抽出来单测，覆盖「折线数据点 <5 时不画线只出表格」（S10 验收③）。

/** 03 §2.9：y=null 表示该点缺值（断线，不是 0）。 */
export interface LineChartPoint {
  x: string
  y: number | null
  tip?: string
}

export interface LineChartLayoutOptions {
  width: number
  height: number
  minPoints?: number // 有效点（y!==null）少于此数不画线，默认 5（03 §2.9 minPoints）
}

interface Padding {
  top: number
  right: number
  bottom: number
  left: number
}

export interface PlottedPoint {
  cx: number
  cy: number // 无效点为 NaN，渲染层按 valid 判断，不读 cy
  valid: boolean
  point: LineChartPoint
}

export interface LineChartLayout {
  drawable: boolean // false = 有效点不足，渲染层应转去渲 fallback
  validCount: number
  padding: Padding
  points: PlottedPoint[] // 与入参 points 一一对应（含无效点，供画 x 轴标签用）
  pathD: string // SVG path d；null 处断线=多段 M
  gridLines: { y: number; value: number }[] // value 是原始刻度数值，格式化交给渲染层（可套 yFormat）
  maxPoint: PlottedPoint | null // annotateMax 用；仅在 drawable 时非空
}

const PADDING: Padding = { top: 20, right: 20, bottom: 30, left: 40 }
const GRID_COUNT = 4

export function computeLineChartLayout(points: LineChartPoint[], opts: LineChartLayoutOptions): LineChartLayout {
  const minPoints = opts.minPoints ?? 5
  const padding = PADDING
  const validCount = points.filter((p) => p.y !== null).length
  const drawable = validCount >= minPoints

  if (!drawable) {
    return { drawable: false, validCount, padding, points: [], pathD: '', gridLines: [], maxPoint: null }
  }

  const values = points.map((p) => p.y).filter((y): y is number => y !== null)
  const rawMin = Math.min(...values)
  const rawMax = Math.max(...values)
  const span = rawMax - rawMin || Math.abs(rawMax) || 1 // 全等值时给个非零跨度，避免除零把点全挤一线
  const yMin = rawMin - span * 0.1
  const yMax = rawMax + span * 0.1

  const innerWidth = opts.width - padding.left - padding.right
  const innerHeight = opts.height - padding.top - padding.bottom
  const xStep = points.length > 1 ? innerWidth / (points.length - 1) : 0

  const plotted: PlottedPoint[] = points.map((p, i) => {
    const valid = p.y !== null
    return {
      cx: padding.left + xStep * i,
      cy: valid ? padding.top + innerHeight * (1 - (p.y! - yMin) / (yMax - yMin)) : NaN,
      valid,
      point: p,
    }
  })

  // 连续有效点各自成一段子路径，遇 null 断开（新起一个 M），对齐「y=null 表示缺值断线」。
  let pathD = ''
  let drawing = false
  let maxPoint: PlottedPoint | null = null
  for (const pt of plotted) {
    if (!pt.valid) {
      drawing = false
      continue
    }
    pathD += drawing ? ` L${pt.cx},${pt.cy}` : `M${pt.cx},${pt.cy}`
    drawing = true
    if (maxPoint === null || pt.point.y! > maxPoint.point.y!) maxPoint = pt
  }

  const gridLines = Array.from({ length: GRID_COUNT }, (_, i) => ({
    y: padding.top + innerHeight * (i / (GRID_COUNT - 1)),
    value: yMax - ((yMax - yMin) / (GRID_COUNT - 1)) * i,
  }))

  return { drawable: true, validCount, padding, points: plotted, pathD, gridLines, maxPoint }
}
