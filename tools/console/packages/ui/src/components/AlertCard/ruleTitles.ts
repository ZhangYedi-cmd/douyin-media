// R5（看板 UX 修复第三波，2026-08-19，本波最大的一块）：core/src/alerts.ts 的 13 条 message
// 全是给 `media check` 命令行读者写的技术描述（如「backlog.status=published 但对应内容 meta
// 未达 published（找不到对应 content 条目）」），直接透传到界面上就是黑话。
//
// **不改 core/src/alerts.ts 的 message**——那份文案同时是命令行输出，命令行读者要的就是这种
// 精确度，改了会让 CLI 变糊（本波任务书的硬约束，packages/core 本身也不在本波改动范围内）。
// 正确做法是在 UI 层加这张 rule → 人话标题映射：rule id（CHK-01 ~ CHK-08）是 core computeAlerts()
// 固定写死的稳定连接键，alertGroups.ts 的分组键也是它——三处（core 产出 / alertGroups 分组 /
// 本映射）同源，不会因为改文案就跟丢。
//
// 人话标题的口径：说清「发生了什么 + 对我意味着什么」，不逐字翻译技术描述。
export const ALERT_RULE_TITLES: Record<string, string> = {
  'CHK-01': '选题池与内容目录对不上',
  'CHK-02': '已取题但对应内容目录丢了',
  'CHK-03': '已排期但超时没人确认发布',
  'CHK-04': '审核卡了太久没人处理',
  'CHK-05': '已发布但没回填作品链接',
  'CHK-06': '内容记录对不上它的选题来源',
  'CHK-07': '选题快要过期了',
  'CHK-08': '今天可能还没开工',
}

export interface AlertHeadline {
  /** 界面主行文案：命中映射用人话标题；未命中回退显示原始 message，不因漏配丢信息。 */
  title: string
  /** 是否命中了映射——渲染层据此判断次要行要不要再补一次原始 message（命中了才补，
   *  避免回退场景下「主行 = message，次要行又原样抄一遍 message」的重复）。 */
  hasMappedTitle: boolean
}

/**
 * rule → 人话标题，带回退。新增 rule 若没同步登记到 ALERT_RULE_TITLES，不会丢信息——
 * 直接把原始 message 顶上来当主行（唯一测试边界：未知 rule）。
 */
export function resolveAlertHeadline(rule: string, message: string): AlertHeadline {
  const title = ALERT_RULE_TITLES[rule]
  return title ? { title, hasMappedTitle: true } : { title: message, hasMappedTitle: false }
}
