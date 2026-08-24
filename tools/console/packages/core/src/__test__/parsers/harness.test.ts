import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import { parseIndexJsonl } from '../../parsers/harness.js'
import { fixturePath } from '../../../__test__/fixtures.js'

describe('parseIndexJsonl', () => {
  it('全行解析真实 harness/logs/index.jsonl，行数与文件非空行一致', () => {
    const raw = fs.readFileSync(fixturePath('harness/logs/index.jsonl'), 'utf8')
    const nonEmptyLines = raw.split('\n').filter((l) => l.trim() !== '').length
    const { runs, badLines } = parseIndexJsonl(raw)
    expect(badLines).toBe(0)
    expect(runs.length).toBe(nonEmptyLines)
  })

  it('坏行跳过并计数，不抛穿', () => {
    const raw = '{"ts":"a","task":"retro"}\nnot-json\n{"ts":"b","task":"ideate"}\n'
    const { runs, badLines } = parseIndexJsonl(raw)
    expect(runs.length).toBe(2)
    expect(badLines).toBe(1)
  })

  it('空文件返回空数组', () => {
    const { runs, badLines } = parseIndexJsonl('')
    expect(runs).toEqual([])
    expect(badLines).toBe(0)
  })
})
