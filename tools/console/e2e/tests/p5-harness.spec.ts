import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test, expect } from './fixture'
import { gotoAuthed } from './authNav'
import { REPO_ROOT } from './cliJson'

// P5 治理线（`#/harness`）—— 03-前端执行方案.md §2.7。注册表 + 运行账本 + 报告阅读器 + 待审提议
// 聚合，只读断言（结构化提议直落 / 散文派发 job 两个按钮都不点）。
//
// 没有 `media` 子命令覆盖 harness 账本/提议投影（不像 P1/P2/P4 能直接用 `--json` 核对），
// 这里改用其唯一数据源 `harness/logs/index.jsonl` 原文，在 Node 侧重放 server 的
// deriveProposals 判据（applied===false && findings>0 && 有 report 字段——02 §2.1 原文，
// server/src/routes/projections.ts 同名函数）做只读交叉核对，而不是硬编码数字。
test.describe('P5 治理线', () => {
  test('任务注册表 / 运行账本 / 待审提议聚合区域可见', async ({ page, aiAssert }) => {
    await gotoAuthed(page, '/harness')
    // 页面纵向内容远超一屏（注册表 11 行 + 账本/阅读器 + 提议聚合/复盘矩阵），midscene 按当前视口截图，
    // 一次 aiAssert 覆盖不到滚动之外的区块——分两段断言，各自先把目标区块滚入视口再问。
    await aiAssert('页面显示治理任务注册表（含任务名与 skill 列）与运行账本区域')

    await page.locator('[data-testid="proposal-list"]').scrollIntoViewIfNeeded()
    // 滚动后卡片列表本体必在视口内，但区块自身 <h2> 标题贴着滚动边界，可能被顶部吸顶横条遮挡
    // ——断言卡片内容本身（散文/结构化标签 + 对应操作按钮），不依赖标题文字是否露在可视区。
    await aiAssert('当前视口显示多张提议卡片，每张标有「散文」或「结构化」标签，并各有一个「派发入库任务」或「应用提议」按钮')
  })

  test('待审提议卡片数与 harness/logs/index.jsonl 的 applied=false 判据一致', async ({ page }) => {
    const raw = readFileSync(join(REPO_ROOT, 'harness/logs/index.jsonl'), 'utf8')
    const lines = raw.split('\n').filter((l) => l.trim() !== '')
    let expected = 0
    for (const line of lines) {
      try {
        const obj = JSON.parse(line) as { applied?: boolean; findings?: number; report?: unknown }
        if (obj.applied === false && (obj.findings ?? 0) > 0 && typeof obj.report === 'string') expected += 1
      } catch {
        // 坏行跳过，与 core/parsers/harness.ts 的 parseIndexJsonl 同语义
      }
    }
    expect(expected).toBeGreaterThan(0) // 先自证现网确有待审提议，断言才有意义

    await gotoAuthed(page, '/harness')
    const list = page.locator('[data-testid="proposal-list"]')
    await expect(list).toBeVisible()
    await expect(list.locator('.proposal')).toHaveCount(expected)
  })
})
