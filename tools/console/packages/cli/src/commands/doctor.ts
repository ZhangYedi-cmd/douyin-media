// media doctor <slug> | --all（内容产物格式 lint）。只读：规则实现 = core/doctor.ts。
// 与 check 分工：check 验状态账本一致性，doctor 验产物格式——互不重叠（见 core/doctor.ts 头注）。
import type { Command } from 'commander'
import { buildSnapshot, MediaError, runDoctor } from '@console/core'
import type { Alert, ContentEntry } from '@console/core'
import { addCommonOptions, getRoot } from '../common.js'
import { emitErr, emitOk } from '../envelope.js'

export function registerDoctor(program: Command): void {
  const cmd = program.command('doctor [slug]').description('内容产物格式体检（只读；check 验账本，doctor 验产物）')
  addCommonOptions(cmd)
  cmd.option('--all', '全量扫描 content/*/*（自动跳过 content/_* 保留目录，如 _template/_backlog/_research/_test）')
  cmd.action((slug: string | undefined, opts: { root?: string; json?: boolean; all?: boolean }) => {
    const json = !!opts.json
    try {
      if (!slug && !opts.all) {
        throw new MediaError('E_BAD_ARG', '需指定 <slug> 或 --all 二选一')
      }
      if (slug && opts.all) {
        throw new MediaError('E_BAD_ARG', '<slug> 与 --all 二选一，不可同时给')
      }

      const root = getRoot(opts)
      const snap = buildSnapshot(root)

      let targets: ContentEntry[]
      if (slug) {
        const entry = snap.contents.find((c) => c.slug === slug)
        if (!entry) throw new MediaError('E_NOT_FOUND', `内容条目不存在：${slug}`)
        targets = [entry]
      } else {
        targets = snap.contents
      }

      const alerts: Alert[] = runDoctor(root, targets, snap.backlog.topics)
      const errors = alerts.filter((a) => a.level === 'error').length
      const warns = alerts.filter((a) => a.level === 'warn').length
      const infos = alerts.filter((a) => a.level === 'info').length
      const data = { scanned: targets.length, errors, warns, infos, alerts }

      emitOk('doctor', json, data, () => {
        for (const a of alerts) {
          console.log(`[${a.level.toUpperCase()}] ${a.subject} ${a.rule}: ${a.message}`)
        }
        console.log(`doctor 体检 ${targets.length} 条：${errors} error / ${warns} warn / ${infos} info`)
      })
      process.exitCode = errors > 0 ? 1 : 0
    } catch (err) {
      emitErr('doctor', json, err)
    }
  })
}
