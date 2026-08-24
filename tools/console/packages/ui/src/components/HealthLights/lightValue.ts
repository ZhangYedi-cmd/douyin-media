// E3（看板 UX 修复第一波）：顶栏四盏健康灯原设计只有词 + 色点，具体数值（最近构建耗时/队列长度/
// 最近文件事件……）全部埋在 Tooltip 里，正常态下四个绿点是纯装饰。这里把 GET /api/health 已经
// 下发的原始字段格式化成一眼可读的短文案，直接显示在灯旁边；level 仍由 server 算好透传，
// 本文件只管「文案」，不重新判定「颜色」。
import type { HealthData } from '@console/server/api-types'

const MINUTE_MS = 60_000
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS

/** 相对时间文案：<1min 刚刚 / <60min N 分钟前 / <24h N 小时前 / 否则 N 天前；无值/非法值 '—'。 */
export function formatRelative(iso: string | null | undefined, now: Date): string {
  if (!iso) return '—'
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return '—'
  const diff = now.getTime() - t
  if (diff < MINUTE_MS) return '刚刚' // 含时钟漂移导致的极小负值，兜底不显示负数
  if (diff < HOUR_MS) return `${Math.floor(diff / MINUTE_MS)} 分钟前`
  if (diff < DAY_MS) return `${Math.floor(diff / HOUR_MS)} 小时前`
  return `${Math.floor(diff / DAY_MS)} 天前`
}

/** 耗时文案：<1000ms 显示整数 ms，否则显示 1 位小数的秒。 */
export function formatMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

/**
 * 每盏灯的主文案（light.id 与 server routes/read.ts 硬编码的四个灯一一对应：
 * snapshot=快照/watcher=文件监听/jobs=任务队列/tick=定时体检）。未知 id 兜底空串
 * （新增灯种时 server/UI 两侧都得跟着改，这里只做防御，不代替契约）。
 */
export function lightValueText(lightId: string, data: HealthData, now: Date): string {
  switch (lightId) {
    case 'snapshot':
      return data.snapshot.parseErrors > 0 ? `${data.snapshot.parseErrors} 个失败` : formatMs(data.snapshot.buildMs)
    case 'watcher':
      return data.watcher.watching ? formatRelative(data.watcher.lastEventAt, now) : '未监听'
    case 'jobs':
      // label 本身已经是「任务队列」，数值不重复「队列」二字，避免读成「任务队列 队列 0」。
      return data.jobs.active ? `进行中 · 排队 ${data.jobs.queued}` : `${data.jobs.queued}`
    case 'tick':
      return formatRelative(data.tick.lastAt, now)
    default:
      return ''
  }
}
