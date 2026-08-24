import { test, expect } from './fixture'
import { gotoAuthed } from './authNav'
import { mediaJson } from './cliJson'

// P1 总览（`#/`）—— 03-前端执行方案.md §2.3。晨检页：侧栏导航 + 警报区 + 待办区。全部只读断言，
// 不点任何写按钮（05 实施计划 §2 G3 ⑥ 红线）。
test.describe('P1 总览', () => {
  test('可达且核心区块渲染（侧栏导航 / 警报或待办区域）', async ({ page, aiAssert }) => {
    await gotoAuthed(page, '/')
    await aiAssert('页面含侧栏导航（总览/看板/选题池/治理/数据）与警报或待办区域')
  })

  test('警报区条数与 `media check --json` 一致（逐条 key 对照口径见 03 §2.3①）', async ({ page }) => {
    const check = mediaJson<{ errors: number; warns: number; infos: number; alerts: unknown[] }>(['check'])
    const expectedTotal = check.errors + check.warns + check.infos
    expect(check.alerts.length).toBe(expectedTotal) // 先自证 CLI 输出内部自洽，再拿它当断言基准

    await gotoAuthed(page, '/')
    const alertSection = page.locator('[data-testid="alert-section"]')
    await expect(alertSection).toBeVisible()
    await expect(alertSection.locator('.alert')).toHaveCount(expectedTotal)
  })
})
