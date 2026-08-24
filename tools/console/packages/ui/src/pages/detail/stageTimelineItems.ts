import type { MetaStatus } from '@console/core'
import { statusLabel } from '../../components/StatusTag'

export interface StageTimelineItem {
  key: MetaStatus
  title: string
  description: string
  status: 'process' | 'finish' | 'wait' | 'error'
}

/**
 * server 下发的 timeline 仍是 META_STATUS_ORDER 全量映射（8 格，含 rejected，server 端不裁剪——
 * 它只管「每个状态有没有时间戳」）。这里是 UI 决定怎么呈现的地方，纯逻辑抽出来单测（本包无
 * jsdom，只能测不碰 DOM 的纯函数），StageTimeline.tsx 只管渲染。
 *
 * R3（看板 UX 修复第三波，2026-08-19）：rejected 是分支终态，不是流程第 8 步——正常内容永远不会
 * 走到它，却要一直空占一格显示「—」。改成：current !== 'rejected' 时该节点整个不出现；真被
 * 否掉时（current === 'rejected'）才现身，且渲染成 error 态终点（红叉），不是普通 process 蓝点。
 *
 * 旧版头注释的取舍是「server 下发什么就原样渲染什么，逐字段照抄比自己裁剪更可信」——这条在
 * 「rejected 该不该占一格」这件事上是错的：保留 server 给的时间戳数据不等于必须把明显是分支、
 * 不是主干的节点也摆进主时间轴。过滤节点和忠实展示数据并不矛盾。
 */
export function buildStageTimelineItems(
  timeline: { status: MetaStatus; at: string | null }[],
  current: MetaStatus,
): StageTimelineItem[] {
  return timeline
    .filter((node) => node.status !== 'rejected' || current === 'rejected')
    .map((node) => {
      const isCurrent = node.status === current
      const status: StageTimelineItem['status'] = isCurrent
        ? node.status === 'rejected'
          ? 'error'
          : 'process'
        : node.at
          ? 'finish'
          : 'wait'
      return { key: node.status, title: statusLabel(node.status), description: node.at ?? '—', status }
    })
}
