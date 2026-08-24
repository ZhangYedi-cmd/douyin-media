// 测试 fixture 路径帮助函数：全部真实文件快照拷贝自 fixtures/repo/（一次性拷贝，不是主仓软链）。
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))

export const FIXTURE_REPO_ROOT = path.join(here, 'fixtures/repo')

export function fixturePath(...segments: string[]): string {
  return path.join(FIXTURE_REPO_ROOT, ...segments)
}

/** 事务测试用：复制 fixture 仓到临时目录，测试可放心让 writer 真实落盘，用完调用方负责 rm。 */
export function copyFixtureRepoToTemp(): string {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'console-writer-'))
  fs.cpSync(FIXTURE_REPO_ROOT, tmp, { recursive: true })
  return tmp
}
