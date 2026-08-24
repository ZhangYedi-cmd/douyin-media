import { test, expect } from './fixture'
import { gotoAuthed } from './authNav'
import { mediaJson } from './cliJson'

// P4 选题池（`#/backlog`）—— 03-前端执行方案.md §2.6。Table 主视图 + 模拟取题卡，只读断言。
test.describe('P4 选题池', () => {
  test('水位摘要 / idea 池表格 / 模拟取题卡可见', async ({ page, aiAssert }) => {
    await gotoAuthed(page, '/backlog')
    await aiAssert('页面显示选题池水位摘要（含 idea 存量数字）、一个「模拟取题」卡片解释会取谁及原因、以及一张 idea 池表格')
  })

  test('idea 存量与表格行数与 `media backlog ls --json` 一致', async ({ page }) => {
    const backlog = mediaJson<{ count: { idea: number; picked: number; published: number; expired: number } }>(['backlog', 'ls'])

    await gotoAuthed(page, '/backlog')
    const stats = page.locator('[data-testid="pool-stats"] .stat').first()
    await expect(stats.locator('.v')).toHaveText(String(backlog.count.idea))

    const rows = page.locator('.ant-table-tbody tr.ant-table-row')
    await expect(rows).toHaveCount(backlog.count.idea)
  })
})
