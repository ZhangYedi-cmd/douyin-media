import { test, expect } from './fixture'
import { gotoAuthed } from './authNav'
import { mediaJson } from './cliJson'

// P3 详情（`#/content/:slug`）—— 03-前端执行方案.md §2.5。全站写动作最密的页，但本用例池
// 只读断言，不点任何决策按钮（05 §2 G3 ⑥ 红线：全部只读）。真实 slug：hy3-moe-teardown
// （05 任务书指定；现网 status=review，见 `media st hy3-moe-teardown --json`）。
const SLUG = 'hy3-moe-teardown'

test.describe('P3 详情', () => {
  test('真实 slug 打开：标题/状态/阶段时间轴/审核决策区可见', async ({ page, aiAssert }) => {
    await gotoAuthed(page, `/content/${SLUG}`)
    await aiAssert(
      '页面显示该内容的标题、一个状态徽标、一条阶段时间轴（多个节点横排），右侧有一个标题为「审核决策」的面板，内含审核意见输入框',
    )
  })

  test('状态/标题/决策按钮集合与 `media st <slug> --json` 一致', async ({ page }) => {
    const st = mediaJson<{ status: string; title: string; legalNext: string[] }>(['st', SLUG])
    const DECISION_LABEL: Record<string, string> = { drafting: '打回修改', approved: '审核通过', rejected: '否决' }

    await gotoAuthed(page, `/content/${SLUG}`)
    await expect(page.getByRole('heading', { level: 1 })).toContainText(st.title)
    await expect(page.locator('.eyebrow').filter({ hasText: SLUG })).toBeVisible() // 面包屑「生产看板 / slug」

    for (const to of st.legalNext) {
      const label = DECISION_LABEL[to]
      if (label) await expect(page.getByRole('button', { name: label, exact: true })).toBeVisible()
    }
  })
})
