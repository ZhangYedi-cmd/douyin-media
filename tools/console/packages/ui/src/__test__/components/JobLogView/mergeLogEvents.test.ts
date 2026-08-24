import { describe, expect, it } from 'vitest'
import { mergeLogEvents } from '../../../components/JobLogView/mergeLogEvents'
import type { NormEvent } from '@console/cc-stream'
import type { JobLogEvent } from '@console/server/api-types'

function ev(kind: string): NormEvent {
  return { kind: 'say', messageId: kind, text: kind } as NormEvent
}

describe('mergeLogEvents（K 号数据侧合并协议：seq 严格等于回放数组下标）', () => {
  it('seq < history.length：丢弃（已在历史里，不重复 append）', () => {
    const history = [ev('a'), ev('b')] // 长度 2，隐含 seq 0/1
    const incoming: JobLogEvent[] = [
      { seq: 0, event: ev('a-dup') },
      { seq: 1, event: ev('b-dup') },
    ]
    expect(mergeLogEvents(history, incoming)).toEqual(history) // 原样返回，未被污染
  })

  it('seq >= history.length：按序 append', () => {
    const history = [ev('a')]
    const incoming: JobLogEvent[] = [{ seq: 1, event: ev('b') }]
    expect(mergeLogEvents(history, incoming)).toEqual([ev('a'), ev('b')])
  })

  it('乱序到达：incoming 数组顺序与 seq 顺序不一致，仍按 seq 正确排列', () => {
    const history: NormEvent[] = []
    const incoming: JobLogEvent[] = [
      { seq: 2, event: ev('c') },
      { seq: 0, event: ev('a') },
      { seq: 1, event: ev('b') },
    ]
    expect(mergeLogEvents(history, incoming)).toEqual([ev('a'), ev('b'), ev('c')])
  })

  it('重复 seq：后到的覆盖先到的，不产生两条', () => {
    const history: NormEvent[] = []
    const incoming: JobLogEvent[] = [
      { seq: 0, event: ev('first') },
      { seq: 0, event: ev('second') },
    ]
    const merged = mergeLogEvents(history, incoming)
    expect(merged).toHaveLength(1)
    expect(merged[0]).toEqual(ev('second'))
  })

  it('空洞（收到 seq=2 但没收到 seq=1）：只 append 到空洞之前的连续前缀，不把 2 提前放出来', () => {
    const history = [ev('a')] // 长度 1，下一个该到的是 seq=1
    const incoming: JobLogEvent[] = [{ seq: 2, event: ev('c') }] // 缺 seq=1
    expect(mergeLogEvents(history, incoming)).toEqual(history) // 原样返回，c 被扣住
  })

  it('空洞补上后（后续再传一次，带上缺的那条）：一次性放出连续的部分', () => {
    const history = [ev('a')]
    // 模拟"先收到 seq=2 缓冲住，后来 seq=1 也到了"——调用方把两条一起喂进来
    const incoming: JobLogEvent[] = [
      { seq: 2, event: ev('c') },
      { seq: 1, event: ev('b') },
    ]
    expect(mergeLogEvents(history, incoming)).toEqual([ev('a'), ev('b'), ev('c')])
  })

  it('incoming 为空：原样返回 history（不产生新数组内容变化）', () => {
    const history = [ev('a')]
    expect(mergeLogEvents(history, [])).toEqual(history)
  })

  it('history 为空、incoming 从 seq=0 开始：从头 append', () => {
    const incoming: JobLogEvent[] = [
      { seq: 0, event: ev('a') },
      { seq: 1, event: ev('b') },
    ]
    expect(mergeLogEvents([], incoming)).toEqual([ev('a'), ev('b')])
  })

  it('增量 append 用法：把当前已知数组当 history、新到一条当 incoming，逐次调用等价于一次性合并', () => {
    let events: NormEvent[] = []
    events = mergeLogEvents(events, [{ seq: 0, event: ev('a') }])
    events = mergeLogEvents(events, [{ seq: 1, event: ev('b') }])
    events = mergeLogEvents(events, [{ seq: 2, event: ev('c') }])
    expect(events).toEqual([ev('a'), ev('b'), ev('c')])
  })
})
