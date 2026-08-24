// media dashboard rebuild（01-CLI执行方案.md §2.12）。手动全量重生成 dashboard 机器区；日常不用，写命令自带。
import fs from 'node:fs'
import path from 'node:path'
import type { Command } from 'commander'
import {
  MediaError,
  computeAlerts,
  dashboardPath,
  hasAllMarkers,
  renderZone,
  replaceZones,
} from '@console/core'
import { runTransaction } from '@console/core/writer'
import type { PlannedWrite } from '@console/core/writer'
import { addWriteOptions, getActor, getConsoleRoot, getRoot } from '../common.js'
import { emitErr, emitOk } from '../envelope.js'

export function registerDashboardRebuild(dashboardGroup: Command): void {
  const cmd = dashboardGroup.command('rebuild').description('手动全量重生成 dashboard 机器区（写事务）')
  addWriteOptions(cmd)
  cmd.action((opts: { root?: string; json?: boolean; dryRun?: boolean }) => {
    const json = !!opts.json
    try {
      const root = getRoot(opts)
      const dryRun = !!opts.dryRun

      const result = runTransaction(
        {
          root,
          consoleRoot: getConsoleRoot(),
          cmd: 'dashboard.rebuild',
          argv: process.argv.slice(2),
          actor: getActor(),
          dryRun,
        },
        (snap) => {
          const dashAbs = dashboardPath(root)
          if (!fs.existsSync(dashAbs)) {
            throw new MediaError('E_NO_MARKERS', 'dashboard.md 不存在')
          }
          const dashRaw = fs.readFileSync(dashAbs, 'utf8')
          if (!hasAllMarkers(dashRaw)) {
            throw new MediaError('E_NO_MARKERS', 'dashboard.md 缺少 auto:wip/auto:backlog/auto:alerts 三对标记，拒绝写入')
          }
          const now = new Date()
          const alerts = computeAlerts(snap, now)
          const newContent = replaceZones(dashRaw, {
            wip: renderZone('wip', snap, alerts),
            backlog: renderZone('backlog', snap, alerts),
            alerts: renderZone('alerts', snap, alerts),
          })
          const write: PlannedWrite = {
            path: path.relative(root, dashAbs),
            op: 'file-write',
            describe: '重生成 auto:wip / auto:backlog / auto:alerts 三区',
            fields: ['auto:wip', 'auto:backlog', 'auto:alerts'],
            content: newContent,
          }
          return [write]
        },
      )

      const alertCount = result.alerts.length
      const data = { zones: ['wip', 'backlog', 'alerts'], writes: result.writes }
      emitOk('dashboard.rebuild', json, data, () => {
        console.log(result.dryRun ? '（dry-run，未落盘）' : '已重生成 dashboard 三区')
        for (const w of result.writes) {
          console.log(`  ${w.path}`)
          if (w.diff) console.log(w.diff)
        }
      }, { writes: result.writes, alerts: result.alerts })
      void alertCount
    } catch (err) {
      emitErr('dashboard.rebuild', json, err)
    }
  })
}
