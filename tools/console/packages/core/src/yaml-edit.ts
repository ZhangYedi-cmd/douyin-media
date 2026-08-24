// YAML 原始字节点位编辑引擎（CLI 拍板 §4 / 01 方案 §2.15 落地细则）。
//
// R1 风险实测（见报告）：真实仓 25/25 个 meta.yaml + backlog.yaml 用 `parseDocument(raw).toString()`
// 做零改动往返测试**全部不一致**——根因是 yaml 包在 parse 阶段就把行内注释前的对齐空格丢了
// （Scalar.comment 只存 "# " 之后的文本，不存前导空格），toString() 再吐出来时统一压成一个空格，
// 不是 stringify 选项能调回来的信息损失。若真按「parseDocument → 改字段 → doc.toString()」实现 writer，
// 每次写命令都会把全文件的注释对齐一起冲掉，直接违反「diff 只含目标字段」的硬红线（红线 #1）。
//
// 解法：yaml 的 Document API 仅用于**定位**（找到目标 Scalar/Seq 节点及其在原始字符串中的字节 range），
// 真正的落盘变更走**原始字符串区间替换**（只换被点中的那一小段字节，其余字节含全部注释原样不动）。
// 这比「parseDocument→mutate→toString()」更贴近红线 #1「点位编辑，禁整文件重序列化」的字面要求——
// 本模块自始至终不调用 doc.toString() 处理整份文档。
import { stringify } from 'yaml'
import type { Document, Node, Scalar, YAMLMap, YAMLSeq } from 'yaml'
import { isMap, isScalar, isSeq } from 'yaml'

export interface RawEdit {
  start: number
  end: number // start === end 表示纯插入
  replacement: string
}

/** 把一组区间编辑应用到原始字符串（按位置排序，禁止重叠）。 */
export function applyEdits(raw: string, edits: RawEdit[]): string {
  if (edits.length === 0) return raw
  const sorted = [...edits].sort((a, b) => a.start - b.start)
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i]!.start < sorted[i - 1]!.end) {
      throw new Error(`yaml-edit: 编辑区间重叠 [${sorted[i - 1]!.start},${sorted[i - 1]!.end}) 与 [${sorted[i]!.start},${sorted[i]!.end})`)
    }
  }
  let out = ''
  let cursor = 0
  for (const e of sorted) {
    out += raw.slice(cursor, e.start)
    out += e.replacement
    cursor = e.end
  }
  out += raw.slice(cursor)
  return out
}

/** 用 yaml 自带的标量格式化规则得到正确转义/引号的值文本（不含尾随换行）。null 专门格式化成裸 `null` 关键字（不是空字符串 `''`——两者语义不同，backlog next_up 清空要的是前者）。 */
export function formatScalar(value: string | null): string {
  return stringify(value).replace(/\n$/, '')
}

/** 强制双引号格式化（不含尾随换行）。backlog title/reason/links/alt_titles/tags 等字符串字段全仓统一双引号风格，
 *  formatScalar 会按值形状自动挑纯量/引号（URL 这类无特殊字符的值会被判定成合法纯量而不加引号），
 *  这里显式对齐既有条目的书写风格，供新增/追加条目（backlog add / apply merge）使用。 */
export function formatScalarQuoted(value: string): string {
  return stringify(value, { defaultStringType: 'QUOTE_DOUBLE' }).replace(/\n$/, '')
}

function assertScalarRange(node: Scalar): [number, number, number] {
  if (!node.range) throw new Error('yaml-edit: 目标节点缺少 range（需 parseDocument 默认行为，不要传自定义 reviver）')
  return node.range
}

/**
 * 替换一个标量字段的值。
 * - 原值非空：只换值本体字节（range[0]..range[1]），其后的 padding/注释/换行一字节不动——最常见、最安全的路径。
 * - 原值为空（如模板留白的 `schedule:`）：range[0]===range[1]，在该零宽位置插入新值；
 *   若该行本就有尾随注释，插入值与注释间补一个分隔空格，其余原有 padding 原样保留在新值之后（允许略微不对齐，
 *   换来「其余字节零改动」这个更高优先级的承诺）。
 */
export function editScalarValue(raw: string, node: Scalar, newValue: string | null): RawEdit {
  const [start, end] = assertScalarRange(node)
  const text = formatScalar(newValue)
  if (start !== end) {
    return { start, end, replacement: text }
  }
  const needsLeadingSpace = start > 0 && raw[start - 1] !== ' ' && raw[start - 1] !== '\t'
  const hasTrailingComment = typeof node.comment === 'string' && node.comment.length > 0
  const prefix = needsLeadingSpace ? ' ' : ''
  const suffix = hasTrailingComment ? ' ' : ''
  return { start, end: start, replacement: `${prefix}${text}${suffix}` }
}

/**
 * 判断某节点「自带的尾随注释」是否真的挂在它自己那一行（R2 修复核心判据，见报告 repro）。
 *
 * yaml 包对「块内最后一个空值键，隔一个空行，后面跟下一个同级键的整行前导注释」这种写法
 * （模板里 `timestamps.retro_done:` 后空一行、`# 阻塞：无` 其实是给 `blocker: {}` 写的）存在孤儿注释
 * 归属歧义：会把那行本不相干的注释错挂成这个空值键的 `node.comment`。真正同一行的尾随注释
 * （valueEnd 到 `#` 之间只隔同一行内的空白，如 `status: review  # 说明`，含 status 模板那种紧跟不隔行
 * 的两行式续注释）与这种「隔着空行」的孤儿注释，靠 valueEnd 与 `#` 之间是否穿过一个换行来判定。
 */
function isOwnLineComment(raw: string, range: readonly [number, number, number]): boolean {
  const [, valueEnd] = range
  let i = valueEnd
  while (i < raw.length && (raw[i] === ' ' || raw[i] === '\t')) i++
  return raw[i] === '#'
}

/** 定位一个标量节点尾随注释的原始字节区间（不含 `#`本身可选；这里含 `#` 起始到注释文本结尾，不含换行）。
 * 孤儿注释（isOwnLineComment 判 false）一律当「无注释」处理，交给调用方新建注释，不去追加到不相干的行里。
 *
 * R2 修复（见报告 repro）：commentEnd 不得再用 `commentStart + 1 + node.comment.length` 反推——
 * yaml 包的多行续注释（如模板 status 字段「本行注释\n下一行续注释」两行式写法）里，`node.comment`
 * 只保留每行 `#` 之后的文本，续行 `#` 之前的原始前导空格不计入 comment 字符串长度，用长度反推出来的
 * 终点会落在续注释行文本中间，appendComment 追加的文本就整段拼进这行注释正中间（见 flip --reason 复现）。
 * range[2]（lineEnd）本身对「真同行注释」场景是字节精确的行终点（含全部续注释行 + 收尾换行），直接信
 * 它、减掉收尾换行即可——不用再拿 comment.length 做算术。 */
function findCommentRange(raw: string, node: Scalar): { start: number; end: number } | null {
  if (!node.comment) return null
  const range = assertScalarRange(node)
  if (!isOwnLineComment(raw, range)) return null
  const [, valueEnd, lineEnd] = range
  const tail = raw.slice(valueEnd, lineEnd)
  const hashIdx = tail.indexOf('#')
  if (hashIdx === -1) return null
  const commentStart = valueEnd + hashIdx
  const commentEnd = raw[lineEnd - 1] === '\n' ? lineEnd - 1 : lineEnd
  return { start: commentStart, end: commentEnd }
}

/**
 * 追加/新建注释留痕（sweep/apply/promote 用；§2.15 点 3）。
 * 已有注释：在其文本末尾（换行之前）拼接 suffix；没有注释：在值末尾新建 ` # ${suffix}`。
 */
export function editAppendComment(raw: string, node: Scalar, suffix: string): RawEdit {
  const existing = findCommentRange(raw, node)
  if (existing) {
    return { start: existing.end, end: existing.end, replacement: suffix }
  }
  const [, valueEnd] = assertScalarRange(node)
  return { start: valueEnd, end: valueEnd, replacement: ` # ${suffix}` }
}

/**
 * 在 anchorNode 所在整行末尾（含换行之后）插入一段新文本（用于 timestamps 新增键、backlog 新增条目等）。
 * anchorNode 必须是某个 Pair.value 或 Seq item 节点。
 *
 * R2 修复（见报告 repro）：不能无脑信 anchorNode.range[2] 当插入点——当 anchorNode 是其所在块状 map
 * 里最后一个键、且自身取值为空（模板占位如 `timestamps.retro_done:`）时，yaml 包会把它之后的空行
 * 和下一个同级键的整行前导注释一并计入这个空节点的 range/comment（孤儿注释归属的已知歧义，同
 * isOwnLineComment 判据），range[2] 因此跨过空行吞掉了本不属于它的注释行；插入文本就被塞到了别的
 * 字段的注释和该字段之间（如 `timestamps.rejected` 插到了 `# 阻塞：无` 注释和 `blocker: {}` 中间，
 * 见 flip --reason 复现）。只在 anchorNode 带「真同行尾随注释」时才信 range[2]（这种情况下 range[2]
 * 对「本节点自己的注释」是字节精确的行终点，含跨行续注释）；否则一律只找 anchorNode 自身物理行的
 * 换行符，绝不跨行外插——孤儿注释也走这条安全路径，不当成真注释处理。
 */
export function editInsertAfterNode(raw: string, anchorNode: Node, text: string): RawEdit {
  const range = (anchorNode as { range?: [number, number, number] }).range
  if (!range) throw new Error('yaml-edit: anchor 节点缺少 range')
  const comment = (anchorNode as { comment?: string }).comment
  const ownLineComment = typeof comment === 'string' && comment.length > 0 && isOwnLineComment(raw, range)
  let pos: number
  if (ownLineComment) {
    pos = range[2]
  } else {
    const nl = raw.indexOf('\n', range[1])
    pos = nl === -1 ? raw.length : nl + 1
  }
  return { start: pos, end: pos, replacement: text }
}

/** 取一个 YAMLMap 的键值节点（保留 Scalar 包装，不解包成 JS 值）；不存在返回 undefined。 */
export function getMapValueNode(map: YAMLMap, key: string): Scalar | undefined {
  const pair = map.items.find((p) => isScalar(p.key) && (p.key as Scalar).value === key)
  if (!pair || !isScalar(pair.value)) return undefined
  return pair.value as Scalar
}

/** 取一个 YAMLMap 的键值节点，要求是序列（links/alt_titles 这类块状列表）；不存在或不是序列返回 undefined。 */
export function getMapSeqNode(map: YAMLMap, key: string): YAMLSeq | undefined {
  const pair = map.items.find((p) => isScalar(p.key) && (p.key as Scalar).value === key)
  if (!pair || !isSeq(pair.value)) return undefined
  return pair.value as YAMLSeq
}

/** 取一个 YAMLMap 的键值节点，不限节点类型（Scalar/YAMLMap/YAMLSeq 皆可，如 backlog 的 `metrics: {...}` 整块字段）；不存在返回 undefined。 */
export function getMapAnyNode(map: YAMLMap, key: string): Node | undefined {
  const pair = map.items.find((p) => isScalar(p.key) && (p.key as Scalar).value === key)
  const value = pair?.value
  if (value === null || value === undefined || typeof value !== 'object' || !('range' in value)) return undefined
  return value as Node
}

/**
 * 整体替换一个节点自身的字节区间（range[0]..range[1]），不含其后 padding/注释/换行——那些原样保留。
 * 用于替换非标量的整块字段（如 backlog `metrics: {...}` 这类 flow map），editScalarValue 只认 Scalar 用不了这里。
 */
export function editNodeRange(node: Node, replacement: string): RawEdit {
  const range = (node as { range?: [number, number, number] }).range
  if (!range) throw new Error('yaml-edit: 目标节点缺少 range')
  return { start: range[0], end: range[1], replacement }
}

/**
 * 向一个既有块状序列（`key:\n  - a\n  - b\n`）末尾追加新条目（backlog apply 合并 links/alt_titles 用）。
 * 缩进取序列内既有条目行首的空白；序列为空时退化为 seq 自身 range 末尾插入，缩进用 fallbackIndent。
 * items 里的每个字符串强制加双引号（formatScalarQuoted），与既有条目风格保持一致——真实仓 links/alt_titles 习惯双引号。
 */
export function appendSeqItems(raw: string, seq: YAMLSeq, items: string[], fallbackIndent = '      '): RawEdit {
  if (items.length === 0) return { start: 0, end: 0, replacement: '' }
  const lastItem = seq.items[seq.items.length - 1] as Node | undefined
  let indent = fallbackIndent
  if (lastItem?.range) {
    const lineStart = raw.lastIndexOf('\n', lastItem.range[0] - 1) + 1
    const dashIdx = raw.indexOf('-', lineStart)
    if (dashIdx !== -1 && dashIdx < lastItem.range[0]) indent = raw.slice(lineStart, dashIdx)
  }
  const text = items.map((it) => `${indent}- ${formatScalarQuoted(it)}\n`).join('')
  if (lastItem?.range) {
    return editInsertAfterNode(raw, lastItem, text)
  }
  const seqRange = (seq as unknown as { range?: [number, number, number] }).range
  if (!seqRange) throw new Error('yaml-edit: appendSeqItems 目标序列缺少 range')
  return { start: seqRange[2], end: seqRange[2], replacement: text }
}

/** 按 canonical 顺序找「newKey 之前最近的、已存在于 map 中的 key」，供插入新键时定位锚点。 */
export function findInsertAnchor(map: YAMLMap, canonicalOrder: string[], newKey: string): Scalar | undefined {
  const idx = canonicalOrder.indexOf(newKey)
  if (idx === -1) return undefined
  for (let i = idx - 1; i >= 0; i--) {
    const node = getMapValueNode(map, canonicalOrder[i]!)
    if (node) return node
  }
  return undefined
}

export { isMap, isSeq, isScalar }
export type { Document, Node, Scalar, YAMLMap, YAMLSeq }
