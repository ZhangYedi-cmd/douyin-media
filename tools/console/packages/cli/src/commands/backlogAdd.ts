// media backlog add <file.yaml>（01-CLI执行方案.md §2.8）。批量入池：schema 校验 + 自动编号 + 30 天去重。写事务。
import fs from 'node:fs'
import path from 'node:path'
import type { Command } from 'commander'
import { MediaError, parseYamlValue } from '@console/core'
import type { BacklogTopic, Snapshot } from '@console/core'
import { runTransaction } from '@console/core/writer'
import { editInsertAfterNode, formatScalarQuoted } from '@console/core/writer'
import type { Node, PlannedWrite, YAMLSeq } from '@console/core/writer'
import { addWriteOptions, getActor, getConsoleRoot, getRoot } from '../common.js'
import { emitErr, emitOk } from '../envelope.js'

const SCORE_KEYS = ['practical', 'social', 'emotion', 'hook', 'timeliness', 'trigger'] as const
const TIER_VALUES = ['S', 'A', 'B', 'C', 'D']
const RELATIVE_BACKLOG = 'content/_backlog/backlog.yaml'
// backlog 条目字段书写顺序唯一真相源（真实仓 fixture 逐条对照）：新条目按此序渲染。
const CANONICAL_TOPIC_ORDER = [
  'id', 'title', 'alt_titles', 'track', 'format', 'status', 'content_path',
  'score', 'tier', 'scores', 'urgency', 'reason', 'links', 'tags', 'created', 'metrics',
]

interface NormalizedCandidate {
  title: string
  alt_titles: string[]
  track: 'depth' | 'traffic'
  format: 'kouban' | 'tuwen'
  score: number | null
  tier: string | null
  scores: Record<string, number> | null
  urgency: 'queue' | 'today'
  reason: string
  links: string[]
  tags: string[]
  created: string
}

function today(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** 日历天数差（不是 24h 整倍数）——按「本地日期」取整，避免命令运行的钟点漂移把恰好 30 天前的条目挤出窗口。 */
function daysBetween(createdIso: string, now: Date): number {
  const created = new Date(`${createdIso}T00:00:00`)
  if (Number.isNaN(created.getTime())) return Number.POSITIVE_INFINITY
  const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((nowMidnight.getTime() - created.getTime()) / 86_400_000)
}

/** §2.8 schema 逐条校验；任一候选不合格即整文件收集全部错误一次性报出（E_SCHEMA，零写入）。 */
function validateAndNormalize(raw: unknown): NormalizedCandidate[] {
  if (typeof raw !== 'object' || raw === null || !Array.isArray((raw as Record<string, unknown>).candidates)) {
    throw new MediaError('E_SCHEMA', '候选文件缺少顶层 candidates 数组')
  }
  const list = (raw as { candidates: unknown[] }).candidates
  if (list.length === 0) throw new MediaError('E_SCHEMA', 'candidates 数组为空，无候选可入池')

  const errors: string[] = []
  const normalized: NormalizedCandidate[] = []

  list.forEach((c, i) => {
    const idx = i + 1
    if (typeof c !== 'object' || c === null) {
      errors.push(`#${idx}: 候选须为对象`)
      return
    }
    const o = c as Record<string, unknown>
    const push = (msg: string) => errors.push(`#${idx}: ${msg}`)

    if (typeof o.title !== 'string' || o.title.trim() === '') push('title 必填非空字符串')

    const altTitlesRaw = o.alt_titles === undefined ? [] : o.alt_titles
    if (!Array.isArray(altTitlesRaw) || !altTitlesRaw.every((x) => typeof x === 'string')) {
      push('alt_titles 须为字符串数组（选填，缺省 []）')
    }

    if (o.track !== 'depth' && o.track !== 'traffic') push('track 须为 depth|traffic')
    if (o.format !== 'kouban' && o.format !== 'tuwen') push('format 须为 kouban|tuwen')

    const scoreRaw = o.score === undefined ? null : o.score
    if (scoreRaw !== null && typeof scoreRaw !== 'number') push('score 须为数字或 null')

    const tierRaw = o.tier === undefined ? null : o.tier
    if (tierRaw !== null && (typeof tierRaw !== 'string' || !TIER_VALUES.includes(tierRaw))) {
      push('tier 须为 S|A|B|C|D 或 null')
    }

    let scoresRaw = o.scores === undefined ? null : o.scores
    if (scoresRaw !== null) {
      if (typeof scoresRaw !== 'object' || Array.isArray(scoresRaw)) {
        push('scores 须为对象或 null')
        scoresRaw = null
      } else {
        for (const k of SCORE_KEYS) {
          const v = (scoresRaw as Record<string, unknown>)[k]
          if (typeof v !== 'number' || !Number.isInteger(v) || v < 1 || v > 5) {
            push(`scores.${k} 须为 1-5 整数（六键齐全）`)
          }
        }
      }
    }

    if (o.urgency !== 'queue' && o.urgency !== 'today') push('urgency 须为 queue|today')
    if (typeof o.reason !== 'string' || o.reason.trim() === '') push('reason 必填非空字符串')

    const linksRaw = o.links
    if (!Array.isArray(linksRaw) || linksRaw.length === 0 || !linksRaw.every((x) => typeof x === 'string' && x.trim() !== '')) {
      push('links 须为非空字符串数组（≥1）')
    }
    const tagsRaw = o.tags
    if (!Array.isArray(tagsRaw) || tagsRaw.length === 0 || !tagsRaw.every((x) => typeof x === 'string' && x.trim() !== '')) {
      push('tags 须为非空字符串数组（≥1，去重比对键）')
    }

    const createdRaw = o.created === undefined ? today() : o.created
    if (typeof createdRaw !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(createdRaw)) {
      push('created 格式须为 YYYY-MM-DD（选填，缺省今天）')
    }

    normalized.push({
      title: typeof o.title === 'string' ? o.title : '',
      alt_titles: Array.isArray(altTitlesRaw) ? (altTitlesRaw as string[]) : [],
      track: (o.track as 'depth' | 'traffic') ?? 'depth',
      format: (o.format as 'kouban' | 'tuwen') ?? 'kouban',
      score: typeof scoreRaw === 'number' ? scoreRaw : null,
      tier: typeof tierRaw === 'string' ? tierRaw : null,
      scores: scoresRaw as Record<string, number> | null,
      urgency: (o.urgency as 'queue' | 'today') ?? 'queue',
      reason: typeof o.reason === 'string' ? o.reason : '',
      links: Array.isArray(linksRaw) ? (linksRaw as string[]) : [],
      tags: Array.isArray(tagsRaw) ? (tagsRaw as string[]) : [],
      created: typeof createdRaw === 'string' ? createdRaw : today(),
    })
  })

  if (errors.length > 0) {
    throw new MediaError('E_SCHEMA', `候选文件 schema 校验失败（整文件拒收）：${errors.join('；')}`)
  }
  return normalized
}

interface DupResult {
  topic: BacklogTopic
  sharedTags: string[]
}

/** 撞车判定：tags 交集≥2；候选无 tags 命中时退化为标题子串 + links 完全重合（§2.8 去重规则，对齐 douyin-ideate 现行退化规则）。 */
function findDuplicate(candidate: NormalizedCandidate, pool: BacklogTopic[]): DupResult | null {
  for (const existing of pool) {
    const shared = candidate.tags.filter((t) => existing.tags.includes(t))
    if (shared.length >= 2) return { topic: existing, sharedTags: shared }
  }
  for (const existing of pool) {
    const titleOverlap = existing.title.includes(candidate.title) || candidate.title.includes(existing.title)
    const linkOverlap = candidate.links.some((l) => existing.links.includes(l))
    if (titleOverlap && linkOverlap) return { topic: existing, sharedTags: [] }
  }
  return null
}

function renderFlowScores(scores: Record<string, number>): string {
  return `{${SCORE_KEYS.map((k) => `${k}: ${scores[k]}`).join(', ')}}`
}

function renderTopicEntry(id: string, c: NormalizedCandidate): string {
  const lines: string[] = []
  lines.push(`  - id: ${id}`)
  lines.push(`    title: ${formatScalarQuoted(c.title)}`)
  if (c.alt_titles.length > 0) {
    lines.push(`    alt_titles:`)
    for (const a of c.alt_titles) lines.push(`      - ${formatScalarQuoted(a)}`)
  } else {
    lines.push(`    alt_titles: []`)
  }
  lines.push(`    track: ${c.track}`)
  lines.push(`    format: ${c.format}`)
  lines.push(`    status: idea`)
  lines.push(`    score: ${c.score === null ? 'null' : c.score}`)
  lines.push(`    tier: ${c.tier === null ? 'null' : c.tier}`)
  lines.push(`    scores: ${c.scores === null ? 'null' : renderFlowScores(c.scores)}`)
  lines.push(`    urgency: ${c.urgency}`)
  lines.push(`    reason: ${formatScalarQuoted(c.reason)}`)
  lines.push(`    links:`)
  for (const l of c.links) lines.push(`      - ${formatScalarQuoted(l)}`)
  lines.push(`    tags: [${c.tags.join(', ')}]`)
  lines.push(`    created: ${c.created}`)
  lines.push(`    metrics: {}`)
  return lines.map((l) => `${l}\n`).join('')
}

export function registerBacklogAdd(backlogGroup: Command): void {
  const cmd = backlogGroup.command('add <file>').description('批量入池：schema 校验 + 自动编号 + 30 天去重（写事务）')
  addWriteOptions(cmd)
  cmd.option('--force <n...>', '放行候选文件中第 n 条（1-based）撞车条目，可多次给')
  cmd.action((file: string, opts: { root?: string; json?: boolean; dryRun?: boolean; force?: string[] }) => {
    const json = !!opts.json
    try {
      const candidatePath = path.isAbsolute(file) ? file : path.resolve(process.cwd(), file)
      let fileRaw: string
      try {
        fileRaw = fs.readFileSync(candidatePath, 'utf8')
      } catch {
        throw new MediaError('E_NOT_FOUND', `候选文件不存在或不可读：${candidatePath}`)
      }
      let parsed: unknown
      try {
        parsed = parseYamlValue(fileRaw)
      } catch (e) {
        throw new MediaError('E_SCHEMA', `候选文件 YAML 解析失败：${e instanceof Error ? e.message : String(e)}`)
      }
      const candidates = validateAndNormalize(parsed)

      const forceIdx = new Set((opts.force ?? []).map((n) => Number(n)))

      const root = getRoot(opts)

      let added: { index: number; id: string; title: string }[] = []
      let rejected: { index: number; title: string; conflictWith: string; sharedTags: string[] }[] = []

      const result = runTransaction(
        { root, consoleRoot: getConsoleRoot(), cmd: 'backlog.add', argv: process.argv.slice(2), actor: getActor(), dryRun: !!opts.dryRun },
        (snap: Snapshot) => {
          added = []
          rejected = []
          const now = new Date()
          const pool = snap.backlog.topics.filter((t) => t.status !== 'archived' && daysBetween(t.created, now) <= 30)
          const existingIds = new Set(snap.backlog.topics.map((t) => t.id))
          const usedSeq = new Map<string, number>()

          const accepted: { id: string; candidate: NormalizedCandidate }[] = []

          candidates.forEach((c, i) => {
            const idx = i + 1
            const dup = findDuplicate(c, pool)
            if (dup && !forceIdx.has(idx)) {
              rejected.push({ index: idx, title: c.title, conflictWith: dup.topic.id, sharedTags: dup.sharedTags })
              return
            }
            const prefix = `${c.created}-`
            let max = 0
            for (const id of existingIds) {
              if (id.startsWith(prefix)) {
                const n = Number(id.slice(prefix.length))
                if (Number.isFinite(n) && n > max) max = n
              }
            }
            const usedMax = usedSeq.get(c.created) ?? 0
            const seq = Math.max(max, usedMax) + 1
            usedSeq.set(c.created, seq)
            const id = `${c.created}-${String(seq).padStart(3, '0')}`
            existingIds.add(id)
            accepted.push({ id, candidate: c })
            added.push({ index: idx, id, title: c.title })
          })

          if (accepted.length === 0) return []

          const write: PlannedWrite = {
            path: RELATIVE_BACKLOG,
            op: 'yaml-edit',
            describe: `新增 ${accepted.length} 条选题`,
            fields: accepted.map((a) => `topics[+${a.id}]`),
            computeEdits: (doc, raw) => {
              const seq = doc.getIn(['topics']) as YAMLSeq
              const text = accepted.map((a) => renderTopicEntry(a.id, a.candidate)).join('')
              const lastItem = seq.items[seq.items.length - 1] as Node | undefined
              if (lastItem?.range) {
                return [editInsertAfterNode(raw, lastItem, text)]
              }
              const seqRange = (seq as unknown as { range?: [number, number, number] }).range
              if (!seqRange) throw new MediaError('E_SCHEMA', 'backlog.yaml topics 序列缺少 range，无法定位插入点')
              return [{ start: seqRange[2], end: seqRange[2], replacement: text }]
            },
          }
          return [write]
        },
      )

      const data = { added, rejected }
      emitOk(
        'backlog.add',
        json,
        data,
        () => {
          console.log(result.dryRun ? '（dry-run）' : `已入池 ${added.length} 条，拒收 ${rejected.length} 条`)
          for (const a of added) console.log(`  + ${a.id} ${a.title}`)
          for (const r of rejected) console.log(`  x #${r.index} ${r.title}（撞 ${r.conflictWith}，共享标签 ${r.sharedTags.join(',') || '无'}）`)
        },
        { writes: result.writes, alerts: result.alerts },
      )
    } catch (err) {
      emitErr('backlog.add', json, err)
    }
  })
}
