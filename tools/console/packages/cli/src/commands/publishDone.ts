// media publish-done <slug>（01-CLI执行方案.md §2.7）。Step 5 三翻齐 + v0.2 补填语义。写事务。
import path from 'node:path'
import type { Command } from 'commander'
import { MediaError, findContentDirBySlug } from '@console/core'
import type { Snapshot } from '@console/core'
import { runTransaction } from '@console/core/writer'
import { editInsertAfterNode, editScalarValue, findTopicNode, getMapValueNode } from '@console/core/writer'
import type { PlannedWrite, YAMLMap } from '@console/core/writer'
import { addWriteOptions, getActor, getConsoleRoot, getRoot } from '../common.js'
import { emitErr, emitOk } from '../envelope.js'

function nowStamp(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function parseLocal(s: string): Date | null {
  const iso = s.length <= 10 ? `${s}T00:00:00` : `${s.replace(' ', 'T')}:00`
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : d
}

export function registerPublishDone(program: Command): void {
  const cmd = program.command('publish-done <slug>').description('Step 5 三翻齐：meta→published/scheduled + backlog picked→published（写事务）')
  addWriteOptions(cmd)
  cmd
    .option('--scheduled <datetime>', '定时发布：YYYY-MM-DD HH:mm')
    .option('--url <url>', '作品链接回填')
  cmd.action((slug: string, opts: { root?: string; json?: boolean; dryRun?: boolean; scheduled?: string; url?: string }) => {
    const json = !!opts.json
    try {
      if (opts.url && !/^https?:\/\//.test(opts.url)) throw new MediaError('E_BAD_ARG', `--url 须 http(s):// 开头：${opts.url}`)
      let scheduledDate: Date | null = null
      if (opts.scheduled) {
        scheduledDate = parseLocal(opts.scheduled)
        if (!scheduledDate) throw new MediaError('E_BAD_ARG', `--scheduled 时间格式非法：${opts.scheduled}`)
        if (scheduledDate.getTime() <= Date.now()) throw new MediaError('E_BAD_ARG', `--scheduled 必须晚于当前时间：${opts.scheduled}`)
      }

      const root = getRoot(opts)
      let mode: 'normal' | 'scheduled-done' | 'backfill' = 'normal'
      let metaStatusAfter = ''
      let backlogIdUsed: string | null = null
      let backlogStatusAfter: string | null = null

      const result = runTransaction(
        { root, consoleRoot: getConsoleRoot(), cmd: 'publish-done', argv: process.argv.slice(2), actor: getActor(), dryRun: !!opts.dryRun },
        (snap: Snapshot) => {
          const entry = snap.contents.find((c) => c.slug === slug)
          if (!entry || !entry.meta) throw new MediaError('E_NOT_FOUND', `内容条目不存在或解析失败：${slug}`)
          const meta = entry.meta

          if (!['approved', 'scheduled', 'published'].includes(meta.status)) {
            throw new MediaError('E_BAD_STATUS', `${slug} 当前状态 ${meta.status}，只能对 approved/scheduled/published 三态执行 publish-done`)
          }

          const dirAbs = findContentDirBySlug(root, slug)
          if (!dirAbs) throw new MediaError('E_NOT_FOUND', `定位不到内容目录：${slug}`)
          const relMeta = path.relative(root, path.join(dirAbs, 'meta.yaml'))
          const relBacklog = 'content/_backlog/backlog.yaml'

          if (meta.status === 'published') {
            // 补填语义（v0.2 §11.4）：仅回填链接，不动状态、不动 backlog
            if (!opts.url) throw new MediaError('E_ALREADY_PUBLISHED', `${slug} 已 published，补填必须带 --url`)
            mode = 'backfill'
            metaStatusAfter = 'published'
            const write: PlannedWrite = {
              path: relMeta,
              op: 'yaml-edit',
              describe: '补填 publish_url',
              fields: ['publish_url'],
              computeEdits: (doc, raw) => {
                const node = getMapValueNode(doc.contents as YAMLMap, 'publish_url')!
                return [editScalarValue(raw, node, opts.url!)]
              },
            }
            return [write]
          }

          // approved 或 scheduled：需要 backlog 对应条目存在（三翻齐缺一即拒）
          if (!meta.source) throw new MediaError('E_NOT_FOUND', `${slug} meta.source 为空，无法三翻齐`)
          const topic = snap.backlog.topics.find((t) => t.id === meta.source)
          if (!topic) throw new MediaError('E_NOT_FOUND', `backlog 查无 source 对应条目：${meta.source}`)
          backlogIdUsed = topic.id

          const stamp = nowStamp()
          const writes: PlannedWrite[] = []

          if (meta.status === 'scheduled') {
            // 定时到点收尾：scheduled→published
            mode = 'scheduled-done'
            metaStatusAfter = 'published'
            backlogStatusAfter = 'published'
            writes.push({
              path: relMeta,
              op: 'yaml-edit',
              describe: 'scheduled→published + timestamps.published' + (opts.url ? ' + publish_url' : ''),
              fields: ['status', 'timestamps.published', ...(opts.url ? ['publish_url'] : [])],
              computeEdits: (doc, raw) => {
                const map = doc.contents as YAMLMap
                const statusNode = getMapValueNode(map, 'status')!
                const edits = [editScalarValue(raw, statusNode, 'published')]
                const ts = doc.getIn(['timestamps']) as YAMLMap | undefined
                const publishedNode = ts ? getMapValueNode(ts, 'published') : undefined
                if (publishedNode) edits.push(editScalarValue(raw, publishedNode, stamp))
                if (opts.url) {
                  const urlNode = getMapValueNode(map, 'publish_url')!
                  edits.push(editScalarValue(raw, urlNode, opts.url))
                }
                return edits
              },
            })
            writes.push({
              path: relBacklog,
              op: 'yaml-edit',
              describe: `backlog(${topic.id}) picked→published`,
              fields: ['topics[].status'],
              computeEdits: (doc, raw) => {
                const node = findTopicNode(doc, topic.id)!
                return [editScalarValue(raw, getMapValueNode(node, 'status')!, 'published')]
              },
            })
          } else {
            // approved：正常发布，直达 published 或走 scheduled
            const toStatus = opts.scheduled ? 'scheduled' : 'published'
            mode = 'normal'
            metaStatusAfter = toStatus
            writes.push({
              path: relMeta,
              op: 'yaml-edit',
              describe: `approved→${toStatus}`,
              fields: ['status', `timestamps.${toStatus}`, ...(toStatus === 'scheduled' ? ['schedule'] : []), ...(opts.url ? ['publish_url'] : [])],
              computeEdits: (doc, raw) => {
                const map = doc.contents as YAMLMap
                const statusNode = getMapValueNode(map, 'status')!
                const edits = [editScalarValue(raw, statusNode, toStatus)]
                const ts = doc.getIn(['timestamps']) as YAMLMap | undefined
                const tsNode = ts ? getMapValueNode(ts, toStatus) : undefined
                if (tsNode) {
                  edits.push(editScalarValue(raw, tsNode, stamp))
                } else if (ts) {
                  // timestamps.scheduled 在模板里通常不存在，需新插入（approved 之后）
                  const approvedNode = getMapValueNode(ts, 'approved')
                  if (approvedNode) {
                    edits.push(editInsertAfterNode(raw, approvedNode, `  ${toStatus}: ${stamp}\n`))
                  }
                }
                if (toStatus === 'scheduled') {
                  const scheduleNode = getMapValueNode(map, 'schedule')!
                  edits.push(editScalarValue(raw, scheduleNode, opts.scheduled!))
                }
                if (opts.url) {
                  const urlNode = getMapValueNode(map, 'publish_url')!
                  edits.push(editScalarValue(raw, urlNode, opts.url))
                }
                return edits
              },
            })
            if (toStatus === 'published') {
              backlogStatusAfter = 'published'
              writes.push({
                path: relBacklog,
                op: 'yaml-edit',
                describe: `backlog(${topic.id}) picked→published`,
                fields: ['topics[].status'],
                computeEdits: (doc, raw) => {
                  const node = findTopicNode(doc, topic.id)!
                  return [editScalarValue(raw, getMapValueNode(node, 'status')!, 'published')]
                },
              })
            }
            // toStatus===scheduled 时 backlog 保持 picked（对齐 open-weight-5 现状惯例），不写
          }

          return writes
        },
      )

      const data = {
        slug,
        mode,
        metaStatus: metaStatusAfter,
        backlogId: backlogIdUsed,
        backlogStatus: backlogStatusAfter,
        url: opts.url ?? null,
      }
      emitOk(
        'publish-done',
        json,
        data,
        () => {
          console.log(result.dryRun ? '（dry-run）' : `publish-done 完成：${slug} → ${metaStatusAfter}`)
          for (const w of result.writes) console.log(`  ${w.path}`)
        },
        { writes: result.writes, alerts: result.alerts },
      )
    } catch (err) {
      emitErr('publish-done', json, err)
    }
  })
}
