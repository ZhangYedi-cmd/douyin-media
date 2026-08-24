// media next-up set <id> / clear（01-CLI执行方案.md §2.11）。人钦点取题指针。写事务。
import type { Command } from 'commander'
import { MediaError } from '@console/core'
import type { Snapshot } from '@console/core'
import { runTransaction } from '@console/core/writer'
import { editScalarValue, getMapValueNode } from '@console/core/writer'
import type { PlannedWrite, YAMLMap } from '@console/core/writer'
import { addWriteOptions, getActor, getConsoleRoot, getRoot } from '../common.js'
import { emitErr, emitOk } from '../envelope.js'

const RELATIVE_BACKLOG = 'content/_backlog/backlog.yaml'

function doNextUp(
  root: string,
  target: string | null, // null = clear
  common: { json?: boolean; dryRun?: boolean },
): { data: { nextUp: string | null; prev: string | null }; result: ReturnType<typeof runTransaction> } {
  let prev: string | null = null
  const result = runTransaction(
    { root, consoleRoot: getConsoleRoot(), cmd: 'next-up', argv: process.argv.slice(2), actor: getActor(), dryRun: !!common.dryRun },
    (snap: Snapshot) => {
      prev = snap.backlog.nextUp
      if (target !== null) {
        const topic = snap.backlog.topics.find((t) => t.id === target)
        if (!topic) throw new MediaError('E_NOT_FOUND', `backlog 条目不存在：${target}`)
        if (topic.status !== 'idea') throw new MediaError('E_BAD_STATUS', `${target} 当前状态 ${topic.status}，next_up 只能指向 idea 条目`)
      }
      const write: PlannedWrite = {
        path: RELATIVE_BACKLOG,
        op: 'yaml-edit',
        describe: target !== null ? `next_up → ${target}` : 'next_up → null',
        fields: ['next_up'],
        computeEdits: (doc, raw) => {
          const node = getMapValueNode(doc.contents as YAMLMap, 'next_up')
          if (!node) throw new MediaError('E_NOT_FOUND', 'backlog.yaml 缺少 next_up 字段')
          return [editScalarValue(raw, node, target)]
        },
      }
      return [write]
    },
  )
  return { data: { nextUp: target, prev }, result }
}

export function registerNextUp(program: Command): void {
  const group = program.command('next-up').description('人钦点取题指针相关命令')

  const setCmd = group.command('set <id>').description('人钦点下一条取题（id 须为 idea 状态）')
  addWriteOptions(setCmd)
  setCmd.action((id: string, opts: { root?: string; json?: boolean; dryRun?: boolean }) => {
    const json = !!opts.json
    try {
      const root = getRoot(opts)
      const { data, result } = doNextUp(root, id, opts)
      emitOk(
        'next-up',
        json,
        data,
        () => console.log(result.dryRun ? '（dry-run）' : `next_up：${data.prev ?? '空'} → ${data.nextUp}`),
        { writes: result.writes, alerts: result.alerts },
      )
    } catch (err) {
      emitErr('next-up', json, err)
    }
  })

  const clearCmd = group.command('clear').description('清空取题指针（幂等）')
  addWriteOptions(clearCmd)
  clearCmd.action((opts: { root?: string; json?: boolean; dryRun?: boolean }) => {
    const json = !!opts.json
    try {
      const root = getRoot(opts)
      const { data, result } = doNextUp(root, null, opts)
      emitOk(
        'next-up',
        json,
        data,
        () => console.log(result.dryRun ? '（dry-run）' : `next_up：${data.prev ?? '空'} → 空`),
        { writes: result.writes, alerts: result.alerts },
      )
    } catch (err) {
      emitErr('next-up', json, err)
    }
  })
}
