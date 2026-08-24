import { Steps } from 'antd'
import type { MetaStatus } from '@console/core'
import { buildStageTimelineItems } from './stageTimelineItems'
import styles from './detail.module.css'

// 03 §2.5 ②：阶段时间轴（Steps 横向，节点吃 meta.timestamps）。
// 「哪些节点出现 / 什么状态」的纯逻辑抽到 stageTimelineItems.ts 的 buildStageTimelineItems()
// （含 R3 rejected 取舍的完整说明，见该文件头注释）——本组件只管渲染。
//
// R2（第三波修复，2026-08-19）：8 格（filter 掉 rejected 后通常 7 格）横向挤在窄屏详情页
// （≤1024）会把「已排期」「复盘完成」这类多字标签挤断成「已排/期」「复盘完/成」。给 Steps
// 包一层横向可滚动容器 + 标题禁止内部换行（detail.module.css .timelineScroll）：宁可在极窄视口
// 滚动着看，也不要断字。
export interface StageTimelineProps {
  timeline: { status: MetaStatus; at: string | null }[]
  current: MetaStatus
}

export function StageTimeline({ timeline, current }: StageTimelineProps) {
  const items = buildStageTimelineItems(timeline, current)
  return (
    <div className={styles.timelineScroll}>
      <Steps items={items} size="small" />
    </div>
  )
}
