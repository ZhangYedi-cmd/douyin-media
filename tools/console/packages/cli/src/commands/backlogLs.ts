// media backlog ls（01-CLI执行方案.md §2.3）。只读：选题池查询。
import path from 'node:path'
import type { Command } from 'commander'
import { backlogPath, buildSnapshot, previewExpiry, MediaError } from '@console/core'
import type { BacklogStatus, BacklogTopic } from '@console/core'
import { addCommonOptions, getRoot } from '../common.js'
import { emitErr, emitOk } from '../envelope.js'

const KNOWN_STATUS: BacklogStatus[] = ['idea', 'picked', 'published', 'expired', 'rejected', 'archived']
const KNOWN_TRACK = ['depth', 'traffic'] as const
const KNOWN_SORT = ['score', 'created'] as const

interface LsOpts {
  root?: string
  json?: boolean
  status?: string[]
  track?: string
  sort?: string
  expiring?: boolean
  limit?: string
}

export function registerBacklogLs(backlogGroup: Command): void {
  const cmd = backlogGroup.command('ls').description('选题池查询（只读）')
  addCommonOptions(cmd)
  cmd
    .option('--status <statuses...>', 'idea|picked|published|expired|rejected|archived，可多值，缺省 idea')
    .option('--track <track>', 'depth|traffic')
    .option('--sort <field>', 'score|created，缺省 score 降序')
    .option('--expiring', '只列临近/已逾期机械过期条目')
    .option('--limit <n>', '限制条数')
  cmd.action((opts: LsOpts) => {
    const json = !!opts.json
    try {
      if (opts.status) {
        for (const s of opts.status) {
          if (!KNOWN_STATUS.includes(s as BacklogStatus)) {
            console.error(`用法错误：--status 非法枚举值 "${s}"，合法值：${KNOWN_STATUS.join('|')}`)
            process.exit(2)
          }
        }
      }
      if (opts.track && !(KNOWN_TRACK as readonly string[]).includes(opts.track)) {
        console.error(`用法错误：--track 非法枚举值 "${opts.track}"，合法值：${KNOWN_TRACK.join('|')}`)
        process.exit(2)
      }
      if (opts.sort && !(KNOWN_SORT as readonly string[]).includes(opts.sort)) {
        console.error(`用法错误：--sort 非法枚举值 "${opts.sort}"，合法值：${KNOWN_SORT.join('|')}`)
        process.exit(2)
      }

      const root = getRoot(opts)
      const now = new Date()
      const snap = buildSnapshot(root)

      // 选题池是单文件真相源，损坏必须炸出来（§2.3 失败行为，不同于其余命令对 parseError 的降级容忍）。
      const relBacklogPath = path.relative(root, backlogPath(root))
      const backlogParseError = snap.parseErrors.find((e) => e.path === relBacklogPath)
      if (backlogParseError) {
        throw new MediaError('E_PARSE', `backlog.yaml 解析损坏：${backlogParseError.error}`)
      }

      const count: Partial<Record<BacklogStatus, number>> = {}
      for (const t of snap.backlog.topics) count[t.status] = (count[t.status] ?? 0) + 1

      const statusFilter = new Set<BacklogStatus>((opts.status as BacklogStatus[] | undefined) ?? ['idea'])
      let topics: BacklogTopic[] = snap.backlog.topics.filter((t) => statusFilter.has(t.status))
      if (opts.track) topics = topics.filter((t) => t.track === opts.track)

      if (opts.expiring) {
        topics = topics.filter((t) => previewExpiry(t, now) !== null)
      }

      const sortField = opts.sort ?? 'score'
      topics = [...topics].sort((a, b) => {
        if (sortField === 'created') return a.created < b.created ? -1 : a.created > b.created ? 1 : 0
        const sa = a.score ?? Number.NEGATIVE_INFINITY
        const sb = b.score ?? Number.NEGATIVE_INFINITY
        return sb - sa
      })

      if (opts.limit) {
        const n = Number(opts.limit)
        if (Number.isFinite(n) && n >= 0) topics = topics.slice(0, n)
      }

      const rows = topics.map((t) => {
        const preview = opts.expiring ? previewExpiry(t, now) : null
        return {
          id: t.id,
          title: t.title,
          track: t.track,
          format: t.format,
          status: t.status,
          score: t.score,
          tier: t.tier,
          urgency: t.urgency,
          created: t.created,
          tags: t.tags,
          ...(opts.expiring ? { expiresIn: preview ? Math.ceil(preview.days) : null, expireRule: preview?.rule ?? null } : {}),
        }
      })

      const data = { nextUp: snap.backlog.nextUp, count, topics: rows }
      emitOk('backlog.ls', json, data, () => {
        console.log(`选题池：${JSON.stringify(count)}  next_up=${snap.backlog.nextUp ?? '空'}`)
        for (const r of rows) console.log(`  ${r.id}  ${r.status}  ${r.score ?? '-'}  ${r.track}/${r.format}  ${r.title}`)
      })
    } catch (err) {
      emitErr('backlog.ls', json, err)
    }
  })
}
