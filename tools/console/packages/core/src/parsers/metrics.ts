// harness/logs/metrics.jsonl 解析（01-CLI执行方案.md §2.13 行 schema）。坏行跳过并计数，不抛穿。
import type { MetricsRecord } from '../types.js'

export interface ParsedMetricsJsonl {
  records: MetricsRecord[]
  badLines: number
}

export function parseMetricsJsonl(raw: string): ParsedMetricsJsonl {
  const lines = raw.split('\n').filter((l) => l.trim() !== '')
  const records: MetricsRecord[] = []
  let badLines = 0
  for (const line of lines) {
    try {
      const obj = JSON.parse(line) as MetricsRecord
      records.push(obj)
    } catch {
      badLines += 1
    }
  }
  return { records, badLines }
}
