// UI 层通用格式化。放这里的判据：同一条格式化规则被两处以上界面用到——写散了必然漂移
// （项目规则「同一规则只写一处」）。
//
// 2026-08-19 建立，起因是一个真实缺陷：运行日志的事件时间直接渲染了 `NormEvent.at` 原文
// （`2026-08-19T05:45:48.606Z`，UTC + ISO），而同一页上方的里程碑时间轴走的是本地 `13:46:05`——
// 同一个界面两种时间口径、还差 8 小时，读的人要么以为任务跑了两次，要么以为时间轴错了。
// 判据（07-界面用语对照表）：这串字符不会被人原样复制去对账，属于「读」的信息 → 说人话。

/** ISO 时间串 → 本地 `HH:mm:ss`。解析不出来时原样返回（宁可露出原文，也不显示一个假时间）。 */
export function clockTime(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleTimeString('zh-CN', { hour12: false })
}
