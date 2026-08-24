// harness/logs/index.jsonl 解析（治理线任务执行记录，append-only）。坏行跳过并计数，不抛穿。
import type { HarnessRun } from '../types.js'

export interface ParsedHarnessIndex {
  runs: HarnessRun[]
  badLines: number
}

export function parseIndexJsonl(raw: string): ParsedHarnessIndex {
  const lines = raw.split('\n').filter((l) => l.trim() !== '')
  const runs: HarnessRun[] = []
  let badLines = 0
  for (const line of lines) {
    try {
      const obj = JSON.parse(line) as HarnessRun
      runs.push(obj)
    } catch {
      badLines += 1
    }
  }
  return { runs, badLines }
}
