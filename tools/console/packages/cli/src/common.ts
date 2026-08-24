// 全局参数与写命令公共上下文（01-CLI执行方案.md §2.0）。
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Command } from 'commander'
import { resolveRoot } from '@console/core'

// tools/console/packages/cli/dist/common.js → 上 3 层就是 tools/console/（audit.jsonl 固定住这里，§2.17）。
const CONSOLE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')

export function getConsoleRoot(): string {
  return CONSOLE_ROOT
}

export interface CommonOpts {
  root?: string
  json?: boolean
}

export interface WriteOpts extends CommonOpts {
  dryRun?: boolean
}

export function getRoot(opts: CommonOpts): string {
  return resolveRoot(opts.root)
}

/** 写命令 actor：env MEDIA_ACTOR 优先，缺省 os.userInfo().username（§2.0 全局参数表）。 */
export function getActor(): string {
  return process.env.MEDIA_ACTOR || os.userInfo().username
}

/** 挂到每个子命令上的通用选项（读命令用；写命令另加 --dry-run）。 */
export function addCommonOptions(cmd: Command): Command {
  return cmd.option('--root <path>', '主仓根目录（缺省读 env PIPELINE_REPO_ROOT，再缺省向上找）').option('--json', '结构化输出')
}

export function addWriteOptions(cmd: Command): Command {
  return addCommonOptions(cmd).option('--dry-run', '打印将发生的文件变更，不落盘')
}
