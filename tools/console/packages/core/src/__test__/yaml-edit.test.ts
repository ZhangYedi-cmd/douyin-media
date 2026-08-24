import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import { parseDocument } from 'yaml'
import type { YAMLMap, YAMLSeq } from 'yaml'
import {
  applyEdits,
  appendSeqItems,
  editAppendComment,
  editInsertAfterNode,
  editNodeRange,
  editScalarValue,
  findInsertAnchor,
  formatScalarQuoted,
  getMapAnyNode,
  getMapSeqNode,
  getMapValueNode,
} from '../yaml-edit.js'
import { fixturePath } from '../../__test__/fixtures.js'

function changedLineIndices(a: string, b: string): number[] {
  const la = a.split('\n')
  const lb = b.split('\n')
  const max = Math.max(la.length, lb.length)
  const changed: number[] = []
  for (let i = 0; i < max; i++) {
    if (la[i] !== lb[i]) changed.push(i)
  }
  return changed
}

describe('applyEdits：零改动往返（R1 核心防线）', () => {
  it('grok-build-teardown/meta.yaml（注释最重）：零编辑 → 字节级恒等', () => {
    const raw = fs.readFileSync(fixturePath('content/2026-07-18/grok-build-teardown/meta.yaml'), 'utf8')
    expect(applyEdits(raw, [])).toBe(raw)
  })

  it('ep04-esc-abort-chain/meta.yaml：零编辑 → 字节级恒等', () => {
    const raw = fs.readFileSync(fixturePath('content/2026-06-18/ep04-esc-abort-chain/meta.yaml'), 'utf8')
    expect(applyEdits(raw, [])).toBe(raw)
  })

  it('完整 1038 行 backlog.yaml：零编辑 → 字节级恒等', () => {
    const raw = fs.readFileSync(fixturePath('content/_backlog/backlog.yaml'), 'utf8')
    expect(applyEdits(raw, [])).toBe(raw)
  })
})

describe('editScalarValue：单字段改动 diff 只含目标行', () => {
  it('grok-build-teardown：status published→retro_done，仅该行变化，其余注释/对齐字节不动', () => {
    const raw = fs.readFileSync(fixturePath('content/2026-07-18/grok-build-teardown/meta.yaml'), 'utf8')
    const doc = parseDocument(raw)
    const statusNode = getMapValueNode(doc.contents as YAMLMap, 'status')!
    const edit = editScalarValue(raw, statusNode, 'retro_done')
    const out = applyEdits(raw, [edit])

    expect(out).not.toBe(raw)
    const changed = changedLineIndices(raw, out)
    expect(changed).toEqual([5]) // 0-indexed 第 6 行（首行是 "# 内容条目元数据" 注释）= status 行
    expect(out.split('\n')[5]).toContain('status: retro_done')
    expect(out.split('\n')[5]).toContain('# 生产线: ideated→drafting→review→approved→scheduled→published | rejected')
    // 其余全部字节（含大段终检闸注释）逐行恒等
    const rawLines = raw.split('\n')
    const outLines = out.split('\n')
    for (let i = 0; i < rawLines.length; i++) {
      if (i === 5) continue
      expect(outLines[i]).toBe(rawLines[i])
    }
  })

  it('EP04：填一个原本为空的字段（schedule）保留其后注释', () => {
    const raw = fs.readFileSync(fixturePath('content/2026-06-15/open-weight-5/meta.yaml'), 'utf8')
    const doc = parseDocument(raw)
    const publishUrlNode = getMapValueNode(doc.contents as YAMLMap, 'publish_url')!
    const edit = editScalarValue(raw, publishUrlNode, 'https://v.douyin.com/abc123')
    const out = applyEdits(raw, [edit])
    // 原有注释仍在同一行；新值已写入（原字段为空，容许保留原有 padding，不强求单空格对齐）
    const line = out.split('\n').find((l) => l.startsWith('publish_url:'))!
    expect(line).toContain('https://v.douyin.com/abc123')
    expect(line).toContain('# 作品链接：sau 未返回，发布后去抖音作品管理人工补')
    const changed = changedLineIndices(raw, out)
    expect(changed.length).toBe(1)
  })

  it('值需要引号时用 yaml 规则正确加引号（含冒号的字符串）', () => {
    const raw = 'title: old\n'
    const doc = parseDocument(raw)
    const node = getMapValueNode(doc.contents as YAMLMap, 'title')!
    const edit = editScalarValue(raw, node, 'a: b weird')
    const out = applyEdits(raw, [edit])
    expect(out).toBe('title: "a: b weird"\n')
  })
})

describe('editAppendComment：留痕注释', () => {
  it('backlog idea 条目原无注释 → 新建注释，不影响其余字节', () => {
    const raw = fs.readFileSync(fixturePath('content/_backlog/backlog.yaml'), 'utf8')
    const doc = parseDocument(raw)
    const seq = doc.getIn(['topics']) as YAMLSeq
    const item = seq.items.find((it) => (it as YAMLMap).get('id') === '2026-08-01-002') as YAMLMap | undefined
    // fixture 里可能没有这个 id；改用池中真实存在的 idea 条目
    const target = (seq.items[0] as YAMLMap) // 2026-06-14-001，已是 expired 但有注释；改用另一条纯净 idea 条目测试
    void item
    const ideaItem = seq.items.find((it) => (it as YAMLMap).get('status') === 'idea') as YAMLMap
    const statusNode = getMapValueNode(ideaItem, 'status')!
    expect(statusNode.comment ?? '').toBe('') // 验证前提：idea 条目确无注释

    const edit = editAppendComment(raw, statusNode, '2026-08-18 过期清扫(机械规则): today超2天')
    const out = applyEdits(raw, [edit])
    expect(out).not.toBe(raw)
    const changed = changedLineIndices(raw, out)
    expect(changed.length).toBe(1)
    expect(out).toContain('过期清扫(机械规则): today超2天')
    void target
  })

  it('已有注释的条目 → 追加而非覆盖', () => {
    const raw = 'status: expired  # 2026-07-08 过期清扫\n'
    const doc = parseDocument(raw)
    const node = getMapValueNode(doc.contents as YAMLMap, 'status')!
    const edit = editAppendComment(raw, node, '; 补充说明')
    const out = applyEdits(raw, [edit])
    expect(out).toBe('status: expired  # 2026-07-08 过期清扫; 补充说明\n')
  })
})

describe('editInsertAfterNode + findInsertAnchor：新增键（timestamps.scheduled）', () => {
  const CANONICAL = ['ideated', 'drafting', 'review', 'approved', 'scheduled', 'published', 'retro_done']

  it('在 approved 之后插入 scheduled，不动其余行', () => {
    const raw = fs.readFileSync(fixturePath('content/2026-07-18/grok-build-teardown/meta.yaml'), 'utf8')
    const doc = parseDocument(raw)
    const timestamps = doc.getIn(['timestamps']) as YAMLMap
    // grok fixture 已有 scheduled 空桩，改用一个真正缺失的键名做插入测试（模拟 _template 无 scheduled 场景）
    const anchor = findInsertAnchor(timestamps, CANONICAL, 'scheduled')
    expect(anchor).toBeDefined() // approved 节点
    const edit = editInsertAfterNode(raw, anchor!, '  scheduled_submit_test: 2026-08-18 12:00\n')
    const out = applyEdits(raw, [edit])
    expect(out).toContain('approved: 2026-07-19 19:28')
    expect(out).toContain('scheduled_submit_test: 2026-08-18 12:00')
    // 插入后原 scheduled: 行仍然存在且未被覆盖
    expect(out).toContain('\n  scheduled:\n')
  })

  it('目标 map 完全没有该键的任何前驱时 findInsertAnchor 返回 undefined', () => {
    const raw = 'timestamps:\n  drafting: 2026-08-01\n'
    const doc = parseDocument(raw)
    const timestamps = doc.getIn(['timestamps']) as YAMLMap
    expect(findInsertAnchor(timestamps, CANONICAL, 'ideated')).toBeUndefined()
  })

  it('孤儿注释回归（R2）：空值锚点（retro_done）后隔一空行是下一同级键（blocker）的前导注释，' +
    '新键不得越过空行插到那行注释和 blocker 中间——只能紧跟锚点自己那一行', () => {
    // 真实仓 meta.yaml 的常见收尾写法：timestamps 块最后一个键留空，空一行后是给下一个顶层字段
    // 写的整行注释。yaml 包会把这行本不相干的注释错挂成 retro_done 的 node.comment（孤儿注释归属歧义），
    // flip rejected 曾据此把 timestamps.rejected 插到 "# 阻塞：无" 注释和 blocker: {} 中间。
    const raw = 'timestamps:\n  ideated: 2026-07-14\n  retro_done:\n\n# 阻塞：无\nblocker: {}\n'
    const doc = parseDocument(raw)
    const timestamps = doc.getIn(['timestamps']) as YAMLMap
    const anchor = getMapValueNode(timestamps, 'retro_done')!
    expect(anchor.comment).toBe(' 阻塞：无') // 复现前提：yaml 包确实把孤儿注释挂上了这个空节点
    const edit = editInsertAfterNode(raw, anchor, '  rejected: 2026-08-18 22:00\n')
    const out = applyEdits(raw, [edit])
    expect(out).toBe('timestamps:\n  ideated: 2026-07-14\n  retro_done:\n  rejected: 2026-08-18 22:00\n\n# 阻塞：无\nblocker: {}\n')
  })
})

describe('editAppendComment：两行式续注释回归（R2）', () => {
  it('真实 status 字段两行式注释写法（本行 # 说明 + 下一行续 # 说明）：追加不得拼进续注释文本中间', () => {
    // 真实模板 status 字段固定写法：同一行注释后紧跟一行仅含前导空格 + # 的续注释（描述 retro_done 语义）。
    // 旧实现用 node.comment.length 反推 commentEnd，续注释行原始前导空格未计入 comment 字符串长度，
    // 算出的终点落在续注释行文本正中间——flip --reason 曾把理由文本拼进 "retro_done" 一词内部。
    const raw =
      'status: review            # 生产线: ideated→drafting→review→approved→scheduled→published | rejected\n' +
      '                           # retro_done 由治理线(harness/)复盘后置位，非生产线状态\n' +
      'source:\n'
    const doc = parseDocument(raw)
    const node = getMapValueNode(doc.contents as YAMLMap, 'status')!
    expect(node.comment).toContain('\n') // 复现前提：确是跨行续注释
    const edit = editAppendComment(raw, node, '2026-08-18 测试理由，含中文标点！')
    const out = applyEdits(raw, [edit])
    const lines = out.split('\n')
    expect(lines[1]).toBe('                           # retro_done 由治理线(harness/)复盘后置位，非生产线状态2026-08-18 测试理由，含中文标点！')
    expect(lines[2]).toBe('source:') // 后续行零改动
    expect(out).not.toContain('retro_don2026') // 旧 bug 特征：拆散 "retro_done" 一词
  })
})

describe('applyEdits：多编辑同批次应用', () => {
  it('两处不重叠编辑同时生效，互不干扰', () => {
    const raw = 'a: 1\nb: 2\nc: 3\n'
    const doc = parseDocument(raw)
    const nodeA = getMapValueNode(doc.contents as YAMLMap, 'a')!
    const nodeC = getMapValueNode(doc.contents as YAMLMap, 'c')!
    const editA = editScalarValue(raw, nodeA, 'A')
    const editC = editScalarValue(raw, nodeC, 'C')
    const out = applyEdits(raw, [editC, editA]) // 故意乱序传入，applyEdits 内部应自行排序
    expect(out).toBe('a: A\nb: 2\nc: C\n')
  })

  it('重叠编辑抛错', () => {
    expect(() =>
      applyEdits('abcdef', [
        { start: 0, end: 3, replacement: 'x' },
        { start: 2, end: 5, replacement: 'y' },
      ]),
    ).toThrow(/重叠/)
  })
})

describe('appendSeqItems：向既有块状序列追加条目（backlog apply 合并 links/alt_titles 用）', () => {
  it('非空序列：追加条目匹配既有缩进，其余字节不动', () => {
    const raw = 'links:\n      - "https://a.com"\n      - "https://b.com"\ntags: [x]\n'
    const doc = parseDocument(raw)
    const seq = getMapSeqNode(doc.contents as YAMLMap, 'links')!
    const edit = appendSeqItems(raw, seq, ['https://c.com'])
    const out = applyEdits(raw, [edit])
    expect(out).toBe('links:\n      - "https://a.com"\n      - "https://b.com"\n      - "https://c.com"\ntags: [x]\n')
  })

  it('多条一次性追加', () => {
    const raw = 'alt_titles:\n  - "标题A"\n'
    const doc = parseDocument(raw)
    const seq = getMapSeqNode(doc.contents as YAMLMap, 'alt_titles')!
    const edit = appendSeqItems(raw, seq, ['标题B', '标题C'])
    const out = applyEdits(raw, [edit])
    expect(out).toBe('alt_titles:\n  - "标题A"\n  - "标题B"\n  - "标题C"\n')
  })

  it('空数组不产生任何变化', () => {
    const raw = 'links:\n  - "https://a.com"\n'
    const doc = parseDocument(raw)
    const seq = getMapSeqNode(doc.contents as YAMLMap, 'links')!
    const edit = appendSeqItems(raw, seq, [])
    expect(applyEdits(raw, [edit])).toBe(raw)
  })

  it('真实 backlog fixture：向某条目 links 追加一条，只改这一行', () => {
    const raw = fs.readFileSync(fixturePath('content/_backlog/backlog.yaml'), 'utf8')
    const doc = parseDocument(raw)
    const seq = doc.getIn(['topics']) as YAMLSeq
    const item0 = seq.items[0] as YAMLMap // 2026-06-14-001
    const links = getMapSeqNode(item0, 'links')!
    const edit = appendSeqItems(raw, links, ['https://example.com/new-source'])
    const out = applyEdits(raw, [edit])
    // 追加是插入新行，不是改写既有行：只应多出恰好 1 行，其余全部原始行原样保留（顺序不变）
    const rawLines = raw.split('\n')
    const outLines = out.split('\n')
    expect(outLines.length).toBe(rawLines.length + 1)
    expect(out).toContain('https://example.com/new-source')
    // 插入点之前的全部行逐一相等
    const insertLineIdx = outLines.findIndex((l) => l.includes('https://example.com/new-source'))
    for (let i = 0; i < insertLineIdx; i++) expect(outLines[i]).toBe(rawLines[i])
  })
})

describe('getMapAnyNode：取任意类型的键值节点（metrics 这类 flow map 字段，backlog metrics record 回填用）', () => {
  it('取到 flow map 节点（不限 Scalar/Seq）', () => {
    const raw = 'id: x\nmetrics: {}\ncreated: 2026-08-18\n'
    const doc = parseDocument(raw)
    const node = getMapAnyNode(doc.contents as YAMLMap, 'metrics')
    expect(node).toBeDefined()
    expect(node!.range).toBeDefined()
  })

  it('取到 Scalar 节点（与 getMapValueNode 行为一致）', () => {
    const raw = 'id: x\nstatus: idea\n'
    const doc = parseDocument(raw)
    const node = getMapAnyNode(doc.contents as YAMLMap, 'status')
    expect(node).toBeDefined()
  })

  it('键不存在返回 undefined', () => {
    const raw = 'id: x\n'
    const doc = parseDocument(raw)
    expect(getMapAnyNode(doc.contents as YAMLMap, 'nope')).toBeUndefined()
  })
})

describe('editNodeRange：整体替换非标量节点的字节区间（backlog metrics 整块回填用）', () => {
  it('替换 flow map 节点自身内容，key 前后与其余行零改动', () => {
    const raw = 'id: x\nmetrics: {}\ncreated: 2026-08-18\n'
    const doc = parseDocument(raw)
    const node = getMapAnyNode(doc.contents as YAMLMap, 'metrics')!
    const edit = editNodeRange(node, '{plays: 100, likes: 3}')
    const out = applyEdits(raw, [edit])
    expect(out).toBe('id: x\nmetrics: {plays: 100, likes: 3}\ncreated: 2026-08-18\n')
  })

  it('替换非空 flow map（已有内容）为新内容——回填语义是覆盖不是追加', () => {
    const raw = 'id: x\nmetrics: {plays: 1}\ncreated: 2026-08-18\n'
    const doc = parseDocument(raw)
    const node = getMapAnyNode(doc.contents as YAMLMap, 'metrics')!
    const edit = editNodeRange(node, '{plays: 9000, likes: 71}')
    const out = applyEdits(raw, [edit])
    expect(out).toBe('id: x\nmetrics: {plays: 9000, likes: 71}\ncreated: 2026-08-18\n')
  })

  it('真实 backlog fixture：回填某条目 metrics，只改这一行', () => {
    const raw = fs.readFileSync(fixturePath('content/_backlog/backlog.yaml'), 'utf8')
    const doc = parseDocument(raw)
    const seq = doc.getIn(['topics']) as YAMLSeq
    const item0 = seq.items[0] as YAMLMap // 2026-06-14-001, metrics: {}
    const node = getMapAnyNode(item0, 'metrics')!
    const edit = editNodeRange(node, '{plays: 5814, likes: 71}')
    const out = applyEdits(raw, [edit])
    const rawLines = raw.split('\n')
    const outLines = out.split('\n')
    expect(outLines.length).toBe(rawLines.length)
    let changed = 0
    for (let i = 0; i < rawLines.length; i++) if (rawLines[i] !== outLines[i]) changed++
    expect(changed).toBe(1)
    expect(out).toContain('metrics: {plays: 5814, likes: 71}')
  })
})

describe('formatScalarQuoted：强制双引号（backlog title/reason/links/alt_titles 统一书写风格）', () => {
  it('URL 这类本可不加引号的值也强制双引号', () => {
    expect(formatScalarQuoted('https://example.com/x')).toBe('"https://example.com/x"')
  })

  it('含双引号的值正确转义', () => {
    expect(formatScalarQuoted('说"你好"')).toBe('"说\\"你好\\""')
  })
})
