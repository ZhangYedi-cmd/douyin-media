#!/usr/bin/env node
import fs from 'node:fs'
import { Command } from 'commander'
import { pathToFileURL } from 'node:url'
import { registerSt } from './commands/st.js'
import { registerNext } from './commands/next.js'
import { registerBacklogLs } from './commands/backlogLs.js'
import { registerCheck } from './commands/check.js'
import { registerDoctor } from './commands/doctor.js'
import { registerDashboardRebuild } from './commands/dashboardRebuild.js'
import { registerPromote } from './commands/promote.js'
import { registerPublishDone } from './commands/publishDone.js'
import { registerFlip } from './commands/flip.js'
import { registerNextUp } from './commands/nextUp.js'
import { registerBacklogAdd } from './commands/backlogAdd.js'
import { registerBacklogSweep } from './commands/backlogSweep.js'
import { registerBacklogApply } from './commands/backlogApply.js'
import { registerMetricsRecord } from './commands/metricsRecord.js'

export function createProgram(): Command {
  const program = new Command()
  program.name('media').description('流水线记账 CLI（skill 保留判断，交出笔）').version('0.0.0')

  registerSt(program)
  registerNext(program)
  registerCheck(program)
  registerDoctor(program)
  registerPromote(program)
  registerPublishDone(program)
  registerFlip(program)

  const backlog = program.command('backlog').description('选题池（backlog.yaml）相关命令')
  registerBacklogLs(backlog)
  registerBacklogAdd(backlog)
  registerBacklogSweep(backlog)
  registerBacklogApply(backlog)

  const dashboard = program.command('dashboard').description('dashboard.md 机器区相关命令')
  registerDashboardRebuild(dashboard)

  const metrics = program.command('metrics').description('复盘数据记账相关命令')
  registerMetricsRecord(metrics)

  registerNextUp(program)

  return program
}

// 仅当作为可执行入口直接运行时才解析 argv；被 vitest import 时不触发（否则会吃掉测试进程的 argv）。
// `npm link` 挂出的全局 bin 是符号链接：Node 加载 ESM 时对 import.meta.url 解析真实路径，
// 但 process.argv[1] 保留调用时的（未解析）符号链接路径——不先 realpath 会导致 isMain 恒假，
// 链接后的 `media` 全局命令悄悄不执行任何命令、静默 exit 0（§2.17 bin 链接验收要求 npm link 可跑，实测发现此坑）。
function realFileUrl(p: string): string {
  try {
    return pathToFileURL(fs.realpathSync(p)).href
  } catch {
    return pathToFileURL(p).href
  }
}
const isMain = process.argv[1] !== undefined && import.meta.url === realFileUrl(process.argv[1])

if (isMain) {
  createProgram().parse()
}
