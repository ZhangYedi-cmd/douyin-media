import { defineConfig } from 'vitest/config'

// 全仓测试跑器 = vitest（2026-08-18 用户拍板，推翻 01 执行方案原定 node:test + tsx）。
// projects 按 workspaces 自动发现各包内的 *.test.ts；e2e/ 用 playwright 跑，不归 vitest。
export default defineConfig({
  test: {
    projects: ['packages/*'],
  },
})
