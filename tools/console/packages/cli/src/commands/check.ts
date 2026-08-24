// media check（01-CLI执行方案.md §2.4）。只读：一致性体检，规则实现 = core/alerts.ts（与看板 P1 同一份代码）。
import type { Command } from 'commander'
import { buildSnapshot, computeAlerts } from '@console/core'
import { addCommonOptions, getRoot } from '../common.js'
import { emitErr, emitOk } from '../envelope.js'

export function registerCheck(program: Command): void {
  const cmd = program.command('check').description('一致性体检（只读；治理线日巡以退出码判红）')
  addCommonOptions(cmd)
  cmd.action((opts: { root?: string; json?: boolean }) => {
    const json = !!opts.json
    try {
      const root = getRoot(opts)
      const snap = buildSnapshot(root)
      const now = new Date()
      const alerts = computeAlerts(snap, now)

      const errors = alerts.filter((a) => a.level === 'error').length
      const warns = alerts.filter((a) => a.level === 'warn').length
      const infos = alerts.filter((a) => a.level === 'info').length
      const data = { errors, warns, infos, alerts }

      emitOk('check', json, data, () => {
        console.log(`体检结果：${errors} error / ${warns} warn / ${infos} info`)
        for (const a of alerts) {
          const mark = a.level === 'error' ? '✗' : a.level === 'warn' ? '⚠' : 'ℹ'
          console.log(`  ${mark} [${a.rule}] ${a.subject}: ${a.message}`)
        }
      })
      process.exitCode = errors > 0 ? 1 : 0
    } catch (err) {
      emitErr('check', json, err)
    }
  })
}
