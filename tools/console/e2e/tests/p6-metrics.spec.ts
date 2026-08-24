import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test, expect } from './fixture'
import { gotoAuthed } from './authNav'
import { REPO_ROOT } from './cliJson'

// P6 数据复盘（`#/metrics`）—— 03-前端执行方案.md §2.8。唯一数据源 harness/logs/metrics.jsonl；
// 空态是一等公民（S10 验收①）——本用例池按 05 任务书要求专断言空态引导文案，判据先从文件系统
// 独立核实「现网确实是空态」（不装有），再断言页面显示对应引导文案。
test.describe('P6 数据复盘', () => {
  test('空态：无数据快照时显示引导补数据的文案', async ({ page, aiAssert }) => {
    const metricsPath = join(REPO_ROOT, 'harness/logs/metrics.jsonl')
    const isEmpty = !existsSync(metricsPath) || readFileSync(metricsPath, 'utf8').trim() === ''
    test.skip(!isEmpty, 'harness/logs/metrics.jsonl 现网已有数据，空态用例暂不适用（非用例错，待后续数据清空/新装环境复验）')

    await gotoAuthed(page, '/metrics')
    await expect(page.getByText('media metrics record', { exact: false })).toBeVisible()
    await aiAssert('页面显示空数据提示，说明尚无数据快照，并引导用户运行某个命令来补数据（提及 media metrics record）')
  })
})
