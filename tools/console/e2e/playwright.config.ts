import { CONSOLE_URL } from './env' // 必须第一个 import：承担 .env.e2e 加载与模型缺省值副作用
import { defineConfig } from '@playwright/test'

// 验收 e2e（G3 终验 + D 各页验收的 AI 断言层）。模型配置见 ./env.ts 与 ./README.md。
export default defineConfig({
  testDir: './tests',
  // midscene 每个 ai* 步骤 = 截图→视觉模型→坐标，单步常态 5~15s，90s 是官方对接基准值
  timeout: 90 * 1000,
  reporter: [
    ['list'],
    // midscene 报告：每步截图、模型输入输出、定位框，可回放 HTML，落 midscene_run/report/
    ['@midscene/web/playwright-reporter', { type: 'merged' }],
  ],
  use: {
    baseURL: CONSOLE_URL,
  },
})
