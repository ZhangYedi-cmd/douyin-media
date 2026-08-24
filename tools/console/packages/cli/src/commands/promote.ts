// media promote <id> | --auto（01-CLI执行方案.md §2.5）。取题记账五处一次改齐。写事务。
import fs from 'node:fs'
import path from 'node:path'
import type { Command } from 'commander'
import { MediaError, contentDir, pickNext, templateDir } from '@console/core'
import type { Snapshot } from '@console/core'
import { runTransaction } from '@console/core/writer'
import {
  editAppendComment,
  editInsertAfterNode,
  editScalarValue,
  findTopicNode,
  getMapValueNode,
} from '@console/core/writer'
import type { PlannedWrite, YAMLMap } from '@console/core/writer'
import { addWriteOptions, getActor, getConsoleRoot, getRoot } from '../common.js'
import { emitErr, emitOk } from '../envelope.js'

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/

function today(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function registerPromote(program: Command): void {
  const cmd = program.command('promote [id]').description('取题记账：backlog idea→picked + 建目录 + 写 meta（写事务）')
  addWriteOptions(cmd)
  cmd
    .option('--auto', 'id 由 media next 同一套取题逻辑决定')
    .requiredOption('--slug <slug>', '目录名/内容 slug（kebab-case）')
    .option('--date <date>', '目录日期 YYYY-MM-DD，缺省今天')
  cmd.action((id: string | undefined, opts: { root?: string; json?: boolean; dryRun?: boolean; auto?: boolean; slug: string; date?: string }) => {
    const json = !!opts.json
    try {
      if (!id && !opts.auto) throw new MediaError('E_BAD_ARG', '需要 id 或 --auto 二选一')
      if (id && opts.auto) throw new MediaError('E_BAD_ARG', 'id 与 --auto 二选一，不可同时给')
      if (!SLUG_RE.test(opts.slug)) throw new MediaError('E_BAD_ARG', `--slug 格式非法（须 kebab-case）：${opts.slug}`)
      const date = opts.date ?? today()
      if (opts.date && !/^\d{4}-\d{2}-\d{2}$/.test(opts.date)) throw new MediaError('E_BAD_ARG', `--date 格式非法：${opts.date}`)

      const root = getRoot(opts)
      let resolvedId = id

      const result = runTransaction(
        { root, consoleRoot: getConsoleRoot(), cmd: 'promote', argv: process.argv.slice(2), actor: getActor(), dryRun: !!opts.dryRun },
        (snap: Snapshot) => {
          let targetId = id
          let decision: 'explicit' | 'score' | 'next_up' = 'explicit'
          if (opts.auto) {
            const pick = pickNext(snap.backlog)
            if (pick.decision === 'empty' || !pick.id) throw new MediaError('E_NOT_FOUND', '选题池中无 idea 可 --auto 取题')
            targetId = pick.id
            decision = pick.decision === 'next_up' ? 'next_up' : 'score'
          }
          resolvedId = targetId
          const topic = snap.backlog.topics.find((t) => t.id === targetId)
          if (!topic) throw new MediaError('E_NOT_FOUND', `backlog 条目不存在：${targetId}`)
          if (topic.status !== 'idea') throw new MediaError('E_BAD_STATUS', `backlog(${targetId}) 当前状态 ${topic.status}，只能 promote status=idea 的条目`)

          const targetDir = contentDir(root, date, opts.slug)
          if (fs.existsSync(targetDir)) throw new MediaError('E_DIR_EXISTS', `目标目录已存在：${path.relative(root, targetDir)}`)

          const tplDir = templateDir(root)
          if (!fs.existsSync(tplDir)) throw new MediaError('E_NO_TEMPLATE', `content/_template 不存在`)

          const relTargetDir = path.relative(root, targetDir)
          const relTplDir = path.relative(root, tplDir)
          const relBacklog = 'content/_backlog/backlog.yaml'

          const nextUpCleared = snap.backlog.nextUp === targetId

          const writes: PlannedWrite[] = [
            {
              path: relBacklog,
              op: 'yaml-edit',
              describe: `backlog(${targetId}) idea→picked + content_path 回填${nextUpCleared ? ' + next_up 清空' : ''}`,
              fields: ['topics[].status', 'topics[].content_path', ...(nextUpCleared ? ['next_up'] : [])],
              computeEdits: (doc, raw) => {
                const node = findTopicNode(doc, targetId!)
                if (!node) throw new MediaError('E_NOT_FOUND', `写入时 backlog 条目消失：${targetId}`)
                const statusNode = getMapValueNode(node, 'status')!
                const edits = [
                  editScalarValue(raw, statusNode, 'picked'),
                  editAppendComment(raw, statusNode, `${date} promote (media)`),
                ]
                // content_path 键在 idea 条目里通常不存在，需新插入（紧跟 status 之后，符合真实仓字段顺序）
                const existingContentPath = getMapValueNode(node, 'content_path')
                if (existingContentPath) {
                  edits.push(editScalarValue(raw, existingContentPath, relTargetDir))
                } else {
                  edits.push(editInsertAfterNode(raw, statusNode, `    content_path: ${relTargetDir}\n`))
                }
                if (nextUpCleared) {
                  const nextUpNode = getMapValueNode(doc.contents as YAMLMap, 'next_up')
                  if (nextUpNode) edits.push(editScalarValue(raw, nextUpNode, null))
                }
                return edits
              },
            },
            {
              path: relTargetDir,
              op: 'mkdir-copy',
              describe: `复制 ${relTplDir} → ${relTargetDir}`,
              fields: [],
              from: relTplDir,
            },
            {
              path: `${relTargetDir}/meta.yaml`,
              op: 'yaml-edit',
              describe: '写入 slug/title/type/pillar/source/timestamps.ideated',
              fields: ['slug', 'title', 'type', 'pillar', 'source', 'timestamps.ideated'],
              computeEdits: (doc, raw) => {
                const map = doc.contents as YAMLMap
                const slugNode = getMapValueNode(map, 'slug')!
                const titleNode = getMapValueNode(map, 'title')!
                const typeNode = getMapValueNode(map, 'type')!
                const pillarNode = getMapValueNode(map, 'pillar')!
                const sourceNode = getMapValueNode(map, 'source')!
                const edits = [
                  editScalarValue(raw, slugNode, opts.slug),
                  editScalarValue(raw, titleNode, topic.title),
                  editScalarValue(raw, typeNode, topic.format),
                  editScalarValue(raw, pillarNode, topic.track),
                  editScalarValue(raw, sourceNode, targetId!),
                ]
                const timestampsMap = doc.getIn(['timestamps']) as YAMLMap | undefined
                if (timestampsMap) {
                  const ideatedNode = getMapValueNode(timestampsMap, 'ideated')
                  if (ideatedNode) edits.push(editScalarValue(raw, ideatedNode, topic.created))
                }
                return edits
              },
            },
          ]

          void decision
          return writes
        },
      )

      const data = {
        id: resolvedId,
        slug: opts.slug,
        dir: path.relative(root, contentDir(root, date, opts.slug)),
      }
      emitOk('promote', json, data, () => {
        console.log(result.dryRun ? '（dry-run）' : '已 promote：')
        for (const w of result.writes) console.log(`  ${w.path}`)
      }, { writes: result.writes, alerts: result.alerts })
    } catch (err) {
      emitErr('promote', json, err)
    }
  })
}
