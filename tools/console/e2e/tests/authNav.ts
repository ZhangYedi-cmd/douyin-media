// 鉴权导航助手（G3 六页用例池共用，见 05-实施计划-Codex分工.md §2 G3 终验 ⑥）。
//
// packages/ui/src/lib/api.ts 的 getToken() 只在 `location.hash` 精确匹配 `#token=…` 时播种
// localStorage；HashRouter 用同一个 hash 做路由（`#/kanban`、`#/content/:slug`…），二者不能
// 共存于同一次导航——首次导航播种 token 后，api.ts 会 history.replaceState 把 hash 清空，
// 落到根路由。所以非根页面必须两步导航：① `/#token=<token>` 播种 → ② 目标路由。
// 每条测试独立 Playwright context（隔离 localStorage/cookies），故每条测试都要重新播种一次。
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import type { Page } from '@playwright/test'

const here = dirname(fileURLToPath(import.meta.url))
// tests/ -> e2e/ -> console/ 下的 .runtime/token（start.sh 启动时写入，見 05 §7）。
const TOKEN_PATH = join(here, '../../.runtime/token')

export function readToken(): string {
  return readFileSync(TOKEN_PATH, 'utf8').trim()
}

/** route 形如 '/'（总览）| '/kanban' | '/backlog' | '/harness' | '/metrics' | '/content/<slug>'。 */
export async function gotoAuthed(page: Page, route: string): Promise<void> {
  const token = readToken()
  await page.goto(`/#token=${encodeURIComponent(token)}`)
  if (route !== '/') {
    await page.goto(`/#${route}`)
  }
}
