// 红线自证测试：server 禁 import '@console/core/writer'（含深路径）——02-后端执行方案.md §2.4 原文要求
// 登记一条 eslint `no-restricted-imports` 规则来焊死这条线。本仓 server 依赖表当前只有 hono/@hono/node-server/
// chokidar + @console/core/@console/cc-stream（05-实施计划-Codex分工.md 交接指令明确写「server 依赖…已预装，
// 禁止再 npm install（缺依赖停下报告）」），eslint 未预装、也不在可安装白名单内——故这里用一个等价力度、
// 零新依赖的 grep 断言测试代替 eslint 规则，跑在 `npm test` 里，效果相同（改错了这里会红），只是拿掉了
// IDE 实时报错这一层体验。若后续 eslint 依赖到位，可平替为真正的 no-restricted-imports 规则，删掉本文件。
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const SRC_DIR = path.resolve(HERE, '..')
const TEST_DIR = path.resolve(HERE, '../../__test__')

function walk(dir: string): string[] {
  const out: string[] = []
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    if (name.name === 'node_modules' || name.name === 'dist') continue
    const full = path.join(dir, name.name)
    if (name.isDirectory()) out.push(...walk(full))
    else if (/\.tsx?$/.test(name.name)) out.push(full)
  }
  return out
}

describe('红线：server 禁 import @console/core/writer（含深路径）', () => {
  it('src/ 与 __test__/ 下无一处出现该 import 字面量', () => {
    const files = [...walk(SRC_DIR), ...(fs.existsSync(TEST_DIR) ? walk(TEST_DIR) : [])]
    const offenders = files.filter((f) => {
      if (f === fileURLToPath(import.meta.url)) return false // 本文件自身提到该字符串用于比对，不算违规
      const content = fs.readFileSync(f, 'utf8')
      return content.includes('@console/core/writer')
    })
    expect(offenders).toEqual([])
  })
})
