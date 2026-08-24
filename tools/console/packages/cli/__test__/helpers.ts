// CLI 集成测试帮助函数：跑真实构建产物（execFile(node, [dist/index.js, …])——§2.16 事务测试策略）。
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))

export const CLI_DIST = path.join(here, '../dist/index.js')

// cli 包自身不放大仓 fixture 副本；直接复用 core 包已建的真实文件快照（同一仓两个 workspace 包）。
export const FIXTURE_REPO_ROOT = path.resolve(here, '../../core/__test__/fixtures/repo')

export interface CliResult {
  stdout: string
  stderr: string
  status: number
}

export function runCli(args: string[], env?: NodeJS.ProcessEnv): CliResult {
  try {
    const stdout = execFileSync('node', [CLI_DIST, ...args], {
      encoding: 'utf8',
      env: { ...process.env, ...env },
    })
    return { stdout, stderr: '', status: 0 }
  } catch (err: unknown) {
    const e = err as { stdout?: Buffer | string; stderr?: Buffer | string; status?: number }
    return {
      stdout: e.stdout?.toString() ?? '',
      stderr: e.stderr?.toString() ?? '',
      status: e.status ?? 1,
    }
  }
}

export function runCliJson<T = unknown>(args: string[], env?: NodeJS.ProcessEnv): { result: CliResult; json: T } {
  const result = runCli(args, env)
  return { result, json: JSON.parse(result.stdout) as T }
}
