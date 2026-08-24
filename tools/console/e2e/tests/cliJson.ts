// 数字断言的唯一真相源助手：跑一次 `media <cmd> --json`，取其 data 字段，供页面渲染数字比对
// （README 约定「精确数值断言仍走常规 expect，数据源对照 `media * --json`」）。只读命令：
// st / check / backlog ls / next——绝不在此文件里拼装任何写事务参数。
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
// tests/ -> e2e/ -> console/ -> tools/ -> 主仓根（douyin-media）。
export const REPO_ROOT = join(here, '../../../..')
// tests/ -> e2e/ -> console/packages/cli/dist/index.js。
const CLI_BIN = join(here, '../../packages/cli/dist/index.js')

export function mediaJson<T = unknown>(args: string[]): T {
  // `media check` 是唯一已知反例：CLI 文档原文「一致性体检（只读；治理线日巡以退出码判红）」——
  // errors>0 时进程按设计退出码=1，但 stdout 仍是结构良好的 `{ ok:true, data }`（现网常态：
  // 3 条存量遗留 error，见 05 任务书任务 C）。execFileSync 默认非零退出码即抛错，这里改用
  // execFileSync 的 { encoding } 不够，需手动捕获——非零退出但 stdout 能 parse 出 ok:true 就
  // 当成功处理；否则说明是真失败（如 --root 不存在），照常抛出。
  let out: string
  try {
    out = execFileSync('node', [CLI_BIN, ...args, '--root', REPO_ROOT, '--json'], { encoding: 'utf8' })
  } catch (err) {
    const e = err as { stdout?: string }
    if (typeof e.stdout === 'string' && e.stdout.trim() !== '') {
      out = e.stdout
    } else {
      throw err
    }
  }
  const parsed = JSON.parse(out) as { ok: boolean; cmd: string; data: T }
  return parsed.data
}
