import { test, expect } from './fixture'
import { gotoAuthed } from './authNav'
import { mediaJson } from './cliJson'

// P2 生产看板（`#/kanban`）—— 03-前端执行方案.md §2.4。拍板已瘦身为按状态分组的只读列表，
// 本页零写动作（写全部收敛在 P3），全部只读断言。
test.describe('P2 生产看板', () => {
  test('按状态分组渲染，可见分组标题与内容行', async ({ page, aiAssert }) => {
    await gotoAuthed(page, '/kanban')
    await aiAssert('页面按状态分组展示生产看板列表（如 review 待审 / scheduled 已排期等分组），每行可见标题与 slug')
  })

  test('review 分组条数与 `media st --json`（在制口径）一致', async ({ page }) => {
    const st = mediaJson<{ items: { status: string }[] }>(['st'])
    const reviewCount = st.items.filter((i) => i.status === 'review').length
    test.skip(reviewCount === 0, '当前在制数据无 review 条目，口径无从核对（真实数据随生产波动，非用例错）')

    await gotoAuthed(page, '/kanban')
    const section = page.locator('[data-testid="status-section-review"]')
    await expect(section).toBeVisible()
    // 分组小节头部的计数徽标是该分组内唯一的纯数字文本节点（标题/slug 均非纯数字）。
    await expect(section.getByText(new RegExp(`^${reviewCount}$`))).toBeVisible()
  })
})
