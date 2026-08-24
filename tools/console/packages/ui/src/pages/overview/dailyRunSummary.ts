// R1（看板 UX 修复第三波，2026-08-19）：今日运行卡片正文粘连成一句破句——
// server（packages/server/src/derive/trace.ts 的 deriveDailyTrace，本波不许碰 server）拼出的
// `summary = \`${title} —— ${phaseLabel}\``，UI 侧原样跟在 mono 的「日期 · slug」后面只隔一个
// 全角空格，读起来是「slug」直接连上「标题」；末尾又把 phaseLabel 重复了一遍——卡片右上角的
// 徽标已经在显示同一个 phaseLabel。
//
// UI 层不能改 server 拼字符串的地方，只能在渲染前把它拆开：summary 固定以
// ` —— ${phaseLabel}` 收尾（trace.ts 唯一拼接处），用 phaseLabel 反推裁掉这条尾巴，只留标题本身。
// phaseLabel 对不上（不在结尾、或根本没出现——比如 idle 态 summary 是一整句独立说明，不是
// 「标题 —— phaseLabel」形状）时原样返回整句，不瞎猜、不丢信息。
export function stripPhaseSuffix(summary: string, phaseLabel: string): string {
  if (!phaseLabel) return summary
  const idx = summary.lastIndexOf(phaseLabel)
  // 必须确实出现在结尾（之后不能再有别的字符），否则说明这句话不是「标题 —— phaseLabel」的形状。
  if (idx === -1 || idx + phaseLabel.length !== summary.length) return summary
  const head = summary.slice(0, idx)
  // 裁掉标题和 phaseLabel 之间的连接符（"——"/"-"/空白），只留标题正文。
  const cleaned = head.replace(/[\s\-—]+$/, '')
  return cleaned.length > 0 ? cleaned : summary
}
