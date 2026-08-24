import { describe, expect, it } from 'vitest'
import {
  buildTimeline,
  computeDurationMs,
  describeToolAction,
  formatDuration,
  previewSummary,
  previewTruncationNote,
  stallingText,
} from '../../../components/JobLogView/jobLogParse'
import type { NormEvent } from '@console/cc-stream'

// 2026-08-19 总指挥实测反馈：步骤卡标题不能直接用 CC 内部工具名（Bash/Read/Skill…）——用户当初
// 打低分的头号理由是"黑话太多"。已知工具给「人话动词 + 原文名字」标题，命令/路径/skill 名本身
// 仍保留原文（07-对照表白名单）；映射表未命中的工具，label 硬性原样显示工具名，不编「未知工具」。
describe('describeToolAction', () => {
  it('Bash：label 固定「执行命令」，detail 是 command 原文（不翻译不改写）', () => {
    expect(describeToolAction('Bash', { command: 'ls -la', description: 'List files' })).toEqual({
      label: '执行命令',
      detail: 'ls -la',
    })
  })

  it('Bash 缺 command：detail 退到 JSON 摘要，label 仍是「执行命令」（不假装不认识 Bash）', () => {
    const result = describeToolAction('Bash', { description: 'no command field' })
    expect(result.label).toBe('执行命令')
    expect(result.detail).toContain('no command field')
  })

  it('Read：label 是「读文件 <路径>」，路径已在标题里，不再重复给 detail', () => {
    expect(describeToolAction('Read', { file_path: '/a/b.md', offset: 1 })).toEqual({ label: '读文件 /a/b.md' })
  })

  it('Write：label 是「写文件 <路径>」', () => {
    expect(describeToolAction('Write', { file_path: '/a/b.md' })).toEqual({ label: '写文件 /a/b.md' })
  })

  it('Edit/NotebookEdit：label 是「改文件 <路径>」', () => {
    expect(describeToolAction('Edit', { file_path: '/a/b.md' })).toEqual({ label: '改文件 /a/b.md' })
    expect(describeToolAction('NotebookEdit', { file_path: '/a/b.ipynb' })).toEqual({ label: '改文件 /a/b.ipynb' })
  })

  it('Skill：label 是「调用技能 <skill 名>」，args 作为 detail（有 args 时）', () => {
    expect(describeToolAction('Skill', { skill: 'douyin-publish', args: 'ep-a --publish' })).toEqual({
      label: '调用技能 douyin-publish',
      detail: 'ep-a --publish',
    })
  })

  it('Skill：无 args 时 detail 为 undefined（真实日志里常见，如 {skill:"benchmark-refresher"}）', () => {
    expect(describeToolAction('Skill', { skill: 'benchmark-refresher' })).toEqual({ label: '调用技能 benchmark-refresher' })
  })

  it('Glob：label 固定「找文件」，detail 是 pattern + path', () => {
    expect(describeToolAction('Glob', { pattern: '*.ts', path: 'src' })).toEqual({ label: '找文件', detail: '*.ts · src' })
  })

  it('Grep：label 固定「搜代码」', () => {
    expect(describeToolAction('Grep', { pattern: 'TODO' })).toEqual({ label: '搜代码', detail: 'TODO' })
  })

  it('Task：label 固定「派子任务」，detail 是 description + subagent_type', () => {
    expect(describeToolAction('Task', { description: '找 bug', subagent_type: 'Explore' })).toEqual({
      label: '派子任务',
      detail: '找 bug · Explore',
    })
  })

  it('TodoWrite：label 固定「更新待办」，detail 是待办条数', () => {
    expect(describeToolAction('TodoWrite', { todos: [{ content: 'a' }, { content: 'b' }] })).toEqual({
      label: '更新待办',
      detail: '2 项',
    })
  })

  it('映射表未命中的工具（如未来的 MCP 工具）：label 原样是工具名，不显示「未知工具」', () => {
    const result = describeToolAction('mcp__some_server__do_thing', { pattern: 'x.*y' })
    expect(result.label).toBe('mcp__some_server__do_thing')
    expect(result.detail).toBe('x.*y')
  })

  it('映射表未命中且无常见字段：detail 退到 JSON 摘要，label 依然原样是工具名', () => {
    const result = describeToolAction('WebFetch', { weird: 1, shape: true })
    expect(result.label).toBe('WebFetch')
    expect(result.detail).toContain('"weird":1')
  })

  it('input 不是对象（如 undefined）：已知工具仍给固定 label，detail 走「（无参数）」', () => {
    expect(describeToolAction('Bash', undefined)).toEqual({ label: '执行命令', detail: '（无参数）' })
  })

  it('command 为空字符串（trim 后为空）：视为缺失，detail 退到 JSON 摘要', () => {
    const result = describeToolAction('Bash', { command: '   ' })
    expect(result.detail).not.toBe('   ')
  })
})

describe('stallingText（不用内部名"卡顿"，说清楚具体在等什么）', () => {
  it('rate_limit：触发限流的文案', () => {
    expect(stallingText('rate_limit')).toBe('触发限流，正在等待重试')
  })
  it('api_retry：接口重试的文案', () => {
    expect(stallingText('api_retry')).toBe('接口调用失败，正在自动重试')
  })
})

describe('computeDurationMs', () => {
  it('两端都有效：返回毫秒差', () => {
    expect(computeDurationMs('2026-08-19T05:00:00.000Z', '2026-08-19T05:00:02.500Z')).toBe(2500)
  })

  it('任一缺失：返回 undefined（别编）', () => {
    expect(computeDurationMs(undefined, '2026-08-19T05:00:00.000Z')).toBeUndefined()
    expect(computeDurationMs('2026-08-19T05:00:00.000Z', undefined)).toBeUndefined()
    expect(computeDurationMs(undefined, undefined)).toBeUndefined()
  })

  it('时间戳无法解析：返回 undefined', () => {
    expect(computeDurationMs('not-a-date', '2026-08-19T05:00:00.000Z')).toBeUndefined()
  })

  it('结束早于开始（时钟/顺序异常）：返回 undefined，不假装有耗时', () => {
    expect(computeDurationMs('2026-08-19T05:00:05.000Z', '2026-08-19T05:00:00.000Z')).toBeUndefined()
  })
})

describe('formatDuration', () => {
  it('小于 1 秒：显示毫秒', () => {
    expect(formatDuration(300)).toBe('300ms')
  })
  it('1 秒到 1 分钟：显示秒（一位小数）', () => {
    expect(formatDuration(2500)).toBe('2.5s')
  })
  it('超过 1 分钟：显示「M分S秒」', () => {
    expect(formatDuration(125000)).toBe('2分5秒')
  })
})

// 输出块默认折叠后，摘要行必须带上体量——一条读了 10KB 文件的步骤和一条几乎没有输出的步骤，
// 收起来后不能长得一模一样，否则「折叠」就变成了「藏起来」。
describe('previewSummary', () => {
  it('未截断：只报字节数', () => {
    expect(previewSummary(328, false)).toBe('查看输出（328 字节）')
  })
  it('已截断：说清只看得到前 20 行，以及原文总共多大', () => {
    expect(previewSummary(10557, true)).toBe('查看输出（前 20 行，共 10557 字节）')
  })
  it('bytes 缺失：退到裸标签，不编数字', () => {
    expect(previewSummary(undefined, true)).toBe('查看输出')
    expect(previewSummary(undefined, undefined)).toBe('查看输出')
  })
})

describe('previewTruncationNote', () => {
  it('未截断：返回 undefined', () => {
    expect(previewTruncationNote(false, 1000)).toBeUndefined()
    expect(previewTruncationNote(undefined, 1000)).toBeUndefined()
  })
  it('截断且有 bytes：「还有 N 字节未显示」', () => {
    expect(previewTruncationNote(true, 4096)).toBe('还有 4096 字节未显示')
  })
  it('截断但 bytes 缺失：兜底文案，不编数字', () => {
    expect(previewTruncationNote(true, undefined)).toBe('完整内容已被截断（原始大小未知）')
  })
})

describe('buildTimeline', () => {
  it('tool + toolDone 按 id 配对成一张步骤卡，不是两条独立记录', () => {
    const events: NormEvent[] = [
      { kind: 'tool', id: 't1', name: 'Bash', input: { command: 'ls' }, at: '2026-08-19T05:00:00.000Z' },
      { kind: 'toolDone', id: 't1', ok: true, preview: 'a.txt', at: '2026-08-19T05:00:01.000Z' },
    ]
    const timeline = buildTimeline(events)
    expect(timeline).toHaveLength(1)
    expect(timeline[0]).toEqual({
      kind: 'step',
      step: {
        id: 't1',
        name: 'Bash',
        input: { command: 'ls' },
        startedAt: '2026-08-19T05:00:00.000Z',
        endedAt: '2026-08-19T05:00:01.000Z',
        durationMs: 1000,
        status: 'ok',
        preview: 'a.txt',
        truncated: undefined,
        bytes: undefined,
        interrupted: undefined,
      },
    })
  })

  it('toolDone.ok=false → status 为 failed', () => {
    const events: NormEvent[] = [
      { kind: 'tool', id: 't1', name: 'Bash', input: {}, at: '2026-08-19T05:00:00.000Z' },
      { kind: 'toolDone', id: 't1', ok: false, at: '2026-08-19T05:00:01.000Z' },
    ]
    const timeline = buildTimeline(events)
    expect(timeline[0]).toMatchObject({ kind: 'step', step: { status: 'failed' } })
  })

  it('只有 tool、没等到 toolDone（任务仍在跑）：status 为 pending，仍保留这张卡', () => {
    const events: NormEvent[] = [{ kind: 'tool', id: 't1', name: 'Bash', input: {}, at: '2026-08-19T05:00:00.000Z' }]
    const timeline = buildTimeline(events)
    expect(timeline).toHaveLength(1)
    expect(timeline[0]).toMatchObject({ kind: 'step', step: { status: 'pending' } })
    if (timeline[0].kind === 'step') {
      expect(timeline[0].step.endedAt).toBeUndefined()
      expect(timeline[0].step.durationMs).toBeUndefined()
    }
  })

  it('孤立 toolDone（没见过对应 tool）：不静默吞掉，造一张「（未知工具）」步骤卡', () => {
    const events: NormEvent[] = [{ kind: 'toolDone', id: 'ghost', ok: true, preview: 'x', at: '2026-08-19T05:00:00.000Z' }]
    const timeline = buildTimeline(events)
    expect(timeline).toHaveLength(1)
    expect(timeline[0]).toMatchObject({ kind: 'step', step: { id: 'ghost', name: '（未知工具）', status: 'ok', preview: 'x' } })
  })

  it('interrupted=true 原样透传到步骤卡', () => {
    const events: NormEvent[] = [
      { kind: 'tool', id: 't1', name: 'Bash', input: {}, at: '2026-08-19T05:00:00.000Z' },
      { kind: 'toolDone', id: 't1', ok: false, interrupted: true, at: '2026-08-19T05:00:01.000Z' },
    ]
    const timeline = buildTimeline(events)
    expect(timeline[0]).toMatchObject({ kind: 'step', step: { interrupted: true } })
  })

  it('say 同 messageId 第二次出现：覆盖式更新原位置，不新增一条（增量流式去重语义）', () => {
    const events: NormEvent[] = [
      { kind: 'say', messageId: 'm1', text: 'Hel', at: '2026-08-19T05:00:00.000Z' },
      { kind: 'tool', id: 't1', name: 'Bash', input: {}, at: '2026-08-19T05:00:01.000Z' },
      { kind: 'say', messageId: 'm1', text: 'Hello world', at: '2026-08-19T05:00:02.000Z' },
    ]
    const timeline = buildTimeline(events)
    expect(timeline).toHaveLength(2) // 不是 3 条
    expect(timeline[0]).toEqual({ kind: 'say', messageId: 'm1', text: 'Hello world', at: '2026-08-19T05:00:02.000Z' }) // 原位置被覆盖，位置不变
    expect(timeline[1].kind).toBe('step')
  })

  it('不同 messageId 的 say 各自独立成条', () => {
    const events: NormEvent[] = [
      { kind: 'say', messageId: 'm1', text: 'a' },
      { kind: 'say', messageId: 'm2', text: 'b' },
    ]
    expect(buildTimeline(events)).toHaveLength(2)
  })

  it('started/thinking/stalling/done 原样按序追加', () => {
    const events: NormEvent[] = [
      { kind: 'started', sessionId: 's1', at: '2026-08-19T05:00:00.000Z' },
      { kind: 'thinking', text: '思考中', at: '2026-08-19T05:00:01.000Z' },
      { kind: 'stalling', reason: 'rate_limit', at: '2026-08-19T05:00:02.000Z' },
      { kind: 'done', ok: true, costUsd: 1.23, turns: 5, durationMs: 9000, at: '2026-08-19T05:00:03.000Z' },
    ]
    const timeline = buildTimeline(events)
    expect(timeline.map((e) => e.kind)).toEqual(['started', 'thinking', 'stalling', 'done'])
    expect(timeline[3]).toEqual({ kind: 'done', ok: true, costUsd: 1.23, turns: 5, durationMs: 9000, at: '2026-08-19T05:00:03.000Z' })
  })

  // 2026-08-19 总指挥实测补充：headless 模式下 CC 一律抹掉思考明文（12 份真实日志 111 个思考块
  // 100% 空），归一层已改为只在明文非空时才吐 thinking；这里在消费侧再加一层防御性锁定——
  // 「没有该类事件时界面整个不出现」不能靠运气，必须是 buildTimeline 从源头就不产出这类条目。
  it('thinking.text 为空串：不产生任何时间轴条目（不是造一条内容为空的折叠块）', () => {
    const events: NormEvent[] = [
      { kind: 'tool', id: 't1', name: 'Bash', input: {}, at: '2026-08-19T05:00:00.000Z' },
      { kind: 'thinking', text: '', at: '2026-08-19T05:00:01.000Z' },
    ]
    const timeline = buildTimeline(events)
    expect(timeline).toHaveLength(1) // 只有那张步骤卡，thinking 被过滤掉
    expect(timeline.some((e) => e.kind === 'thinking')).toBe(false)
  })

  it('thinking.text 全是空白字符：同样视为空，不产生条目', () => {
    const events: NormEvent[] = [{ kind: 'thinking', text: '   \n  ', at: '2026-08-19T05:00:00.000Z' }]
    expect(buildTimeline(events)).toEqual([])
  })

  it('事件流里完全没有 thinking 事件：时间轴里自然也没有 kind=thinking 的条目', () => {
    const events: NormEvent[] = [
      { kind: 'started', sessionId: 's1' },
      { kind: 'say', messageId: 'm1', text: 'hi' },
      { kind: 'done', ok: true },
    ]
    const timeline = buildTimeline(events)
    expect(timeline.some((e) => e.kind === 'thinking')).toBe(false)
  })

  it('混合序列：整体顺序与事件到达顺序一致（全链路可读的核心诉求）', () => {
    const events: NormEvent[] = [
      { kind: 'started', sessionId: 's1' },
      { kind: 'say', messageId: 'm1', text: '开始' },
      { kind: 'tool', id: 't1', name: 'Skill', input: { skill: 'x' } },
      { kind: 'toolDone', id: 't1', ok: true },
      { kind: 'tool', id: 't2', name: 'Bash', input: { command: 'ls' } },
      { kind: 'toolDone', id: 't2', ok: false },
      { kind: 'done', ok: false },
    ]
    const timeline = buildTimeline(events)
    expect(timeline.map((e) => e.kind)).toEqual(['started', 'say', 'step', 'step', 'done'])
  })

  it('空数组：返回空时间轴', () => {
    expect(buildTimeline([])).toEqual([])
  })
})
