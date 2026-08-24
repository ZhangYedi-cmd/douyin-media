// media st [slug]（01-CLI执行方案.md §2.1）。只读：在制总览 / 单条全量。
import type { Command } from 'commander'
import { buildSnapshot, legalNext, MediaError } from '@console/core'
import type { ContentEntry, MetaStatus, Snapshot } from '@console/core'
import { addCommonOptions, getRoot } from '../common.js'
import { emitErr, emitOk } from '../envelope.js'

const IN_PROGRESS: MetaStatus[] = ['ideated', 'drafting', 'review', 'approved', 'scheduled']

function brief(c: ContentEntry) {
  const status = c.meta?.status ?? null
  return {
    slug: c.slug,
    dir: c.dir,
    status,
    since: status ? (c.meta!.timestamps[status] ?? null) : null,
    blocker: c.meta?.blocker ?? {},
    legalNext: status ? legalNext(status) : [],
    parseError: c.parseError ?? null,
  }
}

function pointerOk(snap: Snapshot, entry: ContentEntry): boolean {
  if (!entry.meta?.source) return false
  const topic = snap.backlog.topics.find((t) => t.id === entry.meta!.source)
  if (!topic) return false
  if (!topic.content_path) return true // 未回填不算断裂（picked 前）
  return topic.content_path.replace(/\/+$/, '') === entry.dir.replace(/\\/g, '/')
}

function fullRecord(snap: Snapshot, entry: ContentEntry) {
  if (!entry.meta) {
    return { slug: entry.slug, dir: entry.dir, status: null, parseError: entry.parseError ?? null }
  }
  const meta = entry.meta
  const topic = snap.backlog.topics.find((t) => t.id === meta.source)
  return {
    slug: entry.slug,
    dir: entry.dir,
    status: meta.status,
    title: meta.title,
    type: meta.type,
    pillar: meta.pillar,
    source: meta.source,
    publish_url: meta.publish_url,
    schedule: meta.schedule,
    timestamps: meta.timestamps,
    blocker: meta.blocker,
    deliverables: entry.deliverables,
    legalNext: legalNext(meta.status),
    backlogStatus: topic?.status ?? null,
    pointerOk: pointerOk(snap, entry),
  }
}

export function registerSt(program: Command): void {
  const cmd = program.command('st [slug]').description('在制总览 / 单条全量（只读）')
  addCommonOptions(cmd)
  cmd.option('--all', '总览含 published/retro_done（缺省只列在制 + rejected）')
  cmd.action((slug: string | undefined, opts: { root?: string; json?: boolean; all?: boolean }) => {
    const json = !!opts.json
    try {
      const root = getRoot(opts)
      const snap = buildSnapshot(root)

      if (slug) {
        const entry = snap.contents.find((c) => c.slug === slug)
        if (!entry) throw new MediaError('E_NOT_FOUND', `内容条目不存在：${slug}`)
        const data = fullRecord(snap, entry)
        emitOk('st', json, data, () => {
          console.log(JSON.stringify(data, null, 2))
        })
        return
      }

      const statuses = new Set<MetaStatus>(opts.all ? [...IN_PROGRESS, 'published', 'retro_done'] : IN_PROGRESS)
      const items = snap.contents.filter((c) => c.meta && statuses.has(c.meta.status)).map(brief)
      const rejected = snap.contents.filter((c) => c.meta?.status === 'rejected').map(brief)
      const data = { items, rejected }
      emitOk('st', json, data, () => {
        console.log(`在制 ${items.length} 条：`)
        for (const it of items) console.log(`  ${it.slug}  ${it.status}  ${it.dir}`)
        if (rejected.length > 0) {
          console.log(`rejected 待决 ${rejected.length} 条：`)
          for (const it of rejected) console.log(`  ${it.slug}  ${it.dir}`)
        }
      })
    } catch (err) {
      emitErr('st', json, err)
    }
  })
}
