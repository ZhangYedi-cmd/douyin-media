// 回放历史 + SSE 增量的合并协议（K 号数据侧契约，见 @console/server/api-types.ts JobLogEvent
// 头注释）：seq 严格等于该事件在 GET /api/jobs/:id/log 回放数组里的下标。客户端协议——
// 先订阅 SSE 开始缓冲，再拉一次历史（长度记 N，即 0..N-1）；随后到达的 SSE 事件里
// seq < N 的丢弃（已在历史里）、seq >= N 的按序 append。这段逻辑出错的表现是日志少几条或
// 重几条，肉眼极难发现，必须有测试兜住（总指挥原话）——单独抽成纯函数、不掺进组件。
import type { NormEvent } from '@console/cc-stream'
import type { JobLogEvent } from '@console/server/api-types'

/**
 * 合并规则：
 * - seq < history.length：已经在 history 里，丢弃。
 * - seq >= history.length：按 seq 分桶（Map），处理乱序到达（不假设 incoming 数组按 seq 有序）
 *   与重复 seq（同 seq 后到的覆盖先到的，通常内容相同，只是防御性处理，不让重复播报把时间轴叠两遍）。
 * - 从 history.length 开始逐个 seq 找连续前缀 append；出现空洞（比如收到 N+2 但还没收到 N+1）
 *   时，空洞之后的事件先扣住不放出来——不允许把 N+2 显示在 N+1 前面制造时间错乱，等空洞补上
 *   （通常是下一条 SSE 广播，或调用方下一次用更完整的 incoming 重新调用本函数）再一起放出来。
 *
 * 纯函数、无副作用：调用方既可以用它做「历史 + 已缓冲的增量」一次性合并（组件挂载/切换 job 时），
 * 也可以用它做「已知事件 + 新到一条」的增量 append（每次收到一条新 SSE 广播时，把当前已知数组
 * 当 history 传入、新事件当唯一的 incoming），两种用法是同一个函数、同一套语义。
 */
export function mergeLogEvents(history: NormEvent[], incoming: JobLogEvent[]): NormEvent[] {
  const n = history.length
  if (incoming.length === 0) return history

  const bySeq = new Map<number, NormEvent>()
  for (const { seq, event } of incoming) {
    if (seq < n) continue
    bySeq.set(seq, event) // 重复 seq：后到的覆盖先到的
  }
  if (bySeq.size === 0) return history

  const merged = history.slice()
  let seq = n
  while (bySeq.has(seq)) {
    merged.push(bySeq.get(seq)!)
    seq += 1
  }
  return merged
}
