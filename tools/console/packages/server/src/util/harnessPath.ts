// harness run 的 report 字段路径归一化。
//
// 背景（2026-08-18 首次落地时的判断）：主仓 harness/logs/index.jsonl 的 report 字段被认为
// 100% 存的是相对 harness/ 的路径（如 "logs/2026-07-18-retro.md"），而 02-后端执行方案.md 的
// 例子与 `media backlog apply --proposal` 都按仓根拼接，两边对不上，故在 server 读边界统一
// 归一化成仓相对形式：对外（GET /api/harness 的 reportPath、供 /api/file 打开、供
// apply-proposal/backlog-apply 请求体使用）与对内（读 index.jsonl 原始数据比对）都用本函数。
//
// **2026-08-19 修正：那个「100%」的前提是错的。** 用户在看板点开治理报告时报「加载失败：文件
// 不存在」，路径被拼成 `harness/content/_research/research-2026-07-19.md`。实测真实账本 35 条：
//   · 30 条形如 `logs/<date>-<task>.md`  → 相对 harness/，**要**补前缀
//   · 5 条形如 `content/_research/<date>.md`（ideate 任务的研究稿）→ 已是仓根相对，**不能**补
// 一律补前缀会把这 5 条的链接全打断。改为按「文件到底在哪」判定，而不是按路径长相猜：
// 先看仓根下存不存在，再看 harness/ 下存不存在，两处都没有才回退到旧行为（补前缀）——
// 这样将来无论哪条线新增什么形状的 report 路径，都不需要再改这个函数。
import fs from 'node:fs'
import path from 'node:path'

/**
 * @param raw  index.jsonl 里 report 字段的原文
 * @param root 仓根绝对路径；省略时退化为「补 harness/ 前缀」的旧行为（纯函数、不碰磁盘，
 *             供无法拿到 root 的调用方与单测使用）
 * @returns 仓根相对路径
 */
export function normalizeHarnessReportPath(raw: string, root?: string): string {
  if (raw.startsWith('harness/')) return raw
  if (root) {
    // 仓根下就存在 → 本来就是仓相对路径（ideate 的 content/_research/*.md 走这条）
    if (fs.existsSync(path.join(root, raw))) return raw
    // harness/ 下存在 → 是相对 harness/ 的路径（logs/*.md 走这条）
    if (fs.existsSync(path.join(root, 'harness', raw))) return `harness/${raw}`
    // 两处都没有：文件可能已被删/移走。回退旧行为，让报告阅读器照常报「文件不存在」，
    // 不在这里静默改写路径掩盖问题。
  }
  return `harness/${raw}`
}
