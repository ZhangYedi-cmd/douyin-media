import { describe, it, expect } from 'vitest'
import { computeLineChartLayout } from '../../../components/LineChart/layout'
import type { LineChartPoint } from '../../../components/LineChart/layout'

const OPTS = { width: 640, height: 240 }

function pts(ys: (number | null)[]): LineChartPoint[] {
  return ys.map((y, i) => ({ x: `d${i}`, y }))
}

// S10 验收③：折线数据点 <5 时不画线只出表格（判定逻辑抽纯函数配 vitest，构造 4 点数据可证）。
describe('computeLineChartLayout', () => {
  it('4 个有效点（默认 minPoints=5）→ 不可画，drawable=false', () => {
    const layout = computeLineChartLayout(pts([1, 2, 3, 4]), OPTS)
    expect(layout.drawable).toBe(false)
    expect(layout.validCount).toBe(4)
    expect(layout.pathD).toBe('')
    expect(layout.maxPoint).toBeNull()
  })

  it('5 个有效点（默认阈值边界）→ 可画，drawable=true', () => {
    const layout = computeLineChartLayout(pts([10, 20, 15, 30, 25]), OPTS)
    expect(layout.drawable).toBe(true)
    expect(layout.validCount).toBe(5)
    expect(layout.pathD.startsWith('M')).toBe(true)
  })

  it('minPoints 可自定义：3 个有效点 + minPoints=3 → 可画', () => {
    const layout = computeLineChartLayout(pts([1, 2, 3]), { ...OPTS, minPoints: 3 })
    expect(layout.drawable).toBe(true)
    expect(layout.validCount).toBe(3)
  })

  it('空数组 → 不可画，不抛异常', () => {
    const layout = computeLineChartLayout([], OPTS)
    expect(layout.drawable).toBe(false)
    expect(layout.validCount).toBe(0)
  })

  it('总点数达标但夹杂 null → 只统计有效点数，null 处断线（pathD 出现多段 M）', () => {
    // 6 个点，其中 1 个 null：有效点=5，达到默认阈值，应可画；null 前后各自成一段子路径。
    const layout = computeLineChartLayout(pts([10, 20, null, 15, 30, 25]), OPTS)
    expect(layout.drawable).toBe(true)
    expect(layout.validCount).toBe(5)
    const segments = layout.pathD.split('M').filter(Boolean)
    expect(segments.length).toBe(2) // 断成两段：[10,20] 一段，[15,30,25] 一段
  })

  it('全部 null → 有效点为 0，不可画', () => {
    const layout = computeLineChartLayout(pts([null, null, null, null, null]), OPTS)
    expect(layout.drawable).toBe(false)
    expect(layout.validCount).toBe(0)
  })

  it('maxPoint 取有效点中 y 最大的一个', () => {
    const points: LineChartPoint[] = [
      { x: 'a', y: 10 },
      { x: 'b', y: 35 },
      { x: 'c', y: 22 },
      { x: 'd', y: 18 },
      { x: 'e', y: 27 },
    ]
    const layout = computeLineChartLayout(points, OPTS)
    expect(layout.drawable).toBe(true)
    expect(layout.maxPoint?.point.x).toBe('b')
    expect(layout.maxPoint?.point.y).toBe(35)
  })

  it('x 坐标随索引均匀分布在 padding 内', () => {
    const layout = computeLineChartLayout(pts([1, 2, 3, 4, 5]), OPTS)
    expect(layout.points[0]!.cx).toBe(layout.padding.left)
    expect(layout.points.at(-1)!.cx).toBe(OPTS.width - layout.padding.right)
  })

  it('全部同值时不因除零产生 NaN 坐标', () => {
    const layout = computeLineChartLayout(pts([7, 7, 7, 7, 7]), OPTS)
    expect(layout.drawable).toBe(true)
    for (const p of layout.points) {
      expect(Number.isFinite(p.cy)).toBe(true)
    }
  })

  it('gridLines 固定 4 条，y 覆盖绘图区上下边界', () => {
    const layout = computeLineChartLayout(pts([10, 20, 15, 30, 25]), OPTS)
    expect(layout.gridLines).toHaveLength(4)
    expect(layout.gridLines[0]!.y).toBe(layout.padding.top)
    expect(layout.gridLines.at(-1)!.y).toBe(OPTS.height - layout.padding.bottom)
  })
})
