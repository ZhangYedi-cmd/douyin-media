// media next（01-CLI执行方案.md §2.2）。只读：模拟取题——会取谁、为什么。
import type { Command } from 'commander'
import { buildSnapshot, pickNext } from '@console/core'
import { addCommonOptions, getRoot } from '../common.js'
import { emitErr, emitOk } from '../envelope.js'

export function registerNext(program: Command): void {
  const cmd = program.command('next').description('模拟取题：会取谁、为什么（只读）')
  addCommonOptions(cmd)
  cmd.action((opts: { root?: string; json?: boolean }) => {
    const json = !!opts.json
    try {
      const root = getRoot(opts)
      const snap = buildSnapshot(root)
      const decision = pickNext(snap.backlog)
      emitOk('next', json, decision, () => {
        if (decision.decision === 'empty') {
          console.log('选题池中无 idea 可取。')
          return
        }
        console.log(`取题决策：${decision.decision}`)
        console.log(`  id=${decision.id}  score=${decision.score}  track=${decision.track}  format=${decision.format}`)
        console.log(`  title=${decision.title}`)
        if (decision.reason) console.log(`  reason=${decision.reason}`)
        if (decision.runnerUp.length > 0) {
          console.log(`  runnerUp: ${decision.runnerUp.map((r) => `${r.id}(${r.score})`).join(', ')}`)
        }
        for (const w of decision.warnings) console.log(`  ⚠ ${w}`)
      })
    } catch (err) {
      emitErr('next', json, err)
    }
  })
}
