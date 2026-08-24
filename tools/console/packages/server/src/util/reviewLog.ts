// 3-review.md 留痕读取 + 重做计数——生产线（P3 详情页）与 job runner（rework 幂等/上限判定）共享同一口径，
// 沿 tools/feishu-bot/server.py `_append_review` / `_count_rework` 同一格式约定，只读不写。
import fs from 'node:fs'
import path from 'node:path'

export function readReviewLog(root: string, contentDirRel: string): string {
  try {
    return fs.readFileSync(path.join(root, contentDirRel, '3-review.md'), 'utf8')
  } catch {
    return ''
  }
}

/** 已自动/人工重做次数 = 3-review.md 里「打回·重做」留痕条数（沿 feishu server `_count_rework` 同一口径）。 */
export function countRework(raw: string): number {
  return (raw.match(/打回·重做/g) ?? []).length
}
