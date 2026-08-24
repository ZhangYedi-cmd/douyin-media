// JobLogView 的纯逻辑层：把 GET /api/jobs/:id/log 吐出的 NormEvent[]（`@console/cc-stream` 契约，
// 2026-08-19 扩容为 6 种事件，见 packages/cc-stream/src/types.ts 顶部注释）加工成组件可直接渲染的
// 结构。抽成 .ts 与渲染分离是本包硬约束（无 jsdom，组件渲染不写测试，见 lib/api.test.ts 顶部说明）。
//
// 四件事：
// 1) buildTimeline——tool/toolDone 按 id 配对成「步骤卡」，与 say/thinking/stalling/started/done
//    按原始时间顺序合成一条线性时间轴（这正是「全链路」的字面意思：不拆散成几个互不相关的分区，
//    模型在想什么、干了什么、说了什么，原样按发生顺序摆在一起）。
// 2) describeToolAction——把 CC 内部工具名（Bash/Read/Skill…）+ 各自形状不同的 input，翻成
//    「人话动词 + 原文名字」的步骤卡标题（如「执行命令」「读文件 /a/b.md」），详见该函数上方
//    2026-08-19 总指挥实测反馈的完整说明。
// 3) computeDurationMs/formatDuration/previewTruncationNote——耗时与截断提示的纯计算，
//    任一输入缺失就返回 undefined，调用方据此决定「不显示」而不是编一个假值。
// 4) stallingText——stalling 事件的人话文案（不用内部名"卡顿"）。
import type { NormEvent } from '@console/cc-stream'

// ── 步骤卡：tool + toolDone 配对结果 ───────────────────────────────────────

export interface StepCard {
  id: string
  name: string
  input: unknown
  startedAt?: string
  endedAt?: string
  durationMs?: number
  /** 'pending' = 只见过 tool、还没等到 toolDone（任务仍在跑，或日志被截断在半路）。 */
  status: 'pending' | 'ok' | 'failed'
  preview?: string
  truncated?: boolean
  bytes?: number
  /** Bash 专属：命令被中断，排障关键信号，UI 必须显著标出（任务卡原文）。 */
  interrupted?: boolean
}

export type TimelineEntry =
  | { kind: 'started'; sessionId: string; at?: string }
  | { kind: 'step'; step: StepCard }
  | { kind: 'say'; messageId: string; text: string; at?: string }
  | { kind: 'thinking'; text: string; at?: string }
  | { kind: 'stalling'; reason: 'api_retry' | 'rate_limit'; at?: string }
  | { kind: 'done'; ok: boolean; costUsd?: number; turns?: number; durationMs?: number; at?: string }

/**
 * 把事件流按发生顺序合成时间轴：
 * - tool 事件在原始位置插入一张 'pending' 步骤卡，toolDone 到达时按 id 找回原位置原地补全
 *   （不挪动位置——步骤卡在时间轴上的次序以它*开始*的时刻为准，不是结束的时刻）。
 * - toolDone 找不到对应 tool（正常不该发生，日志被截断/顺序错乱时的防御性兜底）：不静默吞掉，
 *   单独造一张「（未知工具）」步骤卡——这类异常本身就是排障要看的信号。
 * - say 按 messageId 覆盖式更新（类型契约原文「消费方以最新一条为准，不做拼接」）：同一
 *   messageId 第二次出现时替换原位置的文本，不额外新增一条（避免流式增量在时间轴上刷出多条
 *   几乎重复的气泡）。
 * - started/thinking/stalling/done 原样按序追加，不做任何加工。
 */
export function buildTimeline(events: NormEvent[]): TimelineEntry[] {
  const timeline: TimelineEntry[] = []
  const stepIndexById = new Map<string, number>()
  const sayIndexByMessageId = new Map<string, number>()

  for (const ev of events) {
    switch (ev.kind) {
      case 'started':
        timeline.push({ kind: 'started', sessionId: ev.sessionId, at: ev.at })
        break

      case 'tool': {
        stepIndexById.set(ev.id, timeline.length)
        timeline.push({
          kind: 'step',
          step: { id: ev.id, name: ev.name, input: ev.input, startedAt: ev.at, status: 'pending' },
        })
        break
      }

      case 'toolDone': {
        const idx = stepIndexById.get(ev.id)
        const entry = idx === undefined ? undefined : timeline[idx]
        if (!entry || entry.kind !== 'step') {
          // 孤立 toolDone：没见过对应的 tool 事件。
          timeline.push({
            kind: 'step',
            step: {
              id: ev.id,
              name: '（未知工具）',
              input: undefined,
              endedAt: ev.at,
              status: ev.ok ? 'ok' : 'failed',
              preview: ev.preview,
              truncated: ev.truncated,
              bytes: ev.bytes,
              interrupted: ev.interrupted,
            },
          })
          break
        }
        entry.step = {
          ...entry.step,
          endedAt: ev.at,
          status: ev.ok ? 'ok' : 'failed',
          preview: ev.preview,
          truncated: ev.truncated,
          bytes: ev.bytes,
          interrupted: ev.interrupted,
          durationMs: computeDurationMs(entry.step.startedAt, ev.at),
        }
        break
      }

      case 'say': {
        const idx = sayIndexByMessageId.get(ev.messageId)
        if (idx !== undefined) {
          timeline[idx] = { kind: 'say', messageId: ev.messageId, text: ev.text, at: ev.at }
        } else {
          sayIndexByMessageId.set(ev.messageId, timeline.length)
          timeline.push({ kind: 'say', messageId: ev.messageId, text: ev.text, at: ev.at })
        }
        break
      }

      case 'thinking':
        // 2026-08-19 总指挥实测补充：headless 模式下 CC 一律抹掉思考明文，thinking 事件的
        // text 恒为空串（12 份真实日志 111 个思考块 100% 空）；归一层已改为只在明文非空时才吐
        // thinking 事件，这里再做一层防御——万一底层缓存/旧格式仍漏进一条空文本，也不产出条目。
        // 「没有该类事件时界面整个不出现」的要求由此在源头满足：不产出条目，渲染层自然无从画出
        // 一个点开永远是空的折叠块。
        if (ev.text.trim().length > 0) {
          timeline.push({ kind: 'thinking', text: ev.text, at: ev.at })
        }
        break

      case 'stalling':
        timeline.push({ kind: 'stalling', reason: ev.reason, at: ev.at })
        break

      case 'done':
        timeline.push({ kind: 'done', ok: ev.ok, costUsd: ev.costUsd, turns: ev.turns, durationMs: ev.durationMs, at: ev.at })
        break
    }
  }

  return timeline
}

// ── 耗时：任一端缺失/不可解析就返回 undefined，调用方据此不显示，不编造 ──────────

export function computeDurationMs(startedAt?: string, endedAt?: string): number | undefined {
  if (!startedAt || !endedAt) return undefined
  const start = Date.parse(startedAt)
  const end = Date.parse(endedAt)
  if (Number.isNaN(start) || Number.isNaN(end)) return undefined
  const diff = end - start
  return diff >= 0 ? diff : undefined // 负数说明时钟/顺序异常，不假装有耗时
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  const totalSec = Math.round(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return `${min}分${sec}秒`
}

// ── stalling 人话文案 ───────────────────────────────────────────────────
// 2026-08-19 总指挥实测反馈："stalling"（内部名，字面意思"卡顿"）不能直接上屏——它的真实含义
// 是"在等 API 重试或撞了限流"，说成"卡顿中"会让人误以为任务坏了，其实只是正常的自动重试在进行。

export function stallingText(reason: 'api_retry' | 'rate_limit'): string {
  return reason === 'rate_limit' ? '触发限流，正在等待重试' : '接口调用失败，正在自动重试'
}

// ── preview 截断提示 ────────────────────────────────────────────────────

/** truncated 为假时不提示；为真时优先报「还有 N 字节未显示」（bytes = 截断前原文总字节数，
 *  cc-stream 类型契约原文），bytes 缺失才退到不带数字的兜底文案。 */
export function previewTruncationNote(truncated: boolean | undefined, bytes: number | undefined): string | undefined {
  if (!truncated) return undefined
  return typeof bytes === 'number' ? `还有 ${bytes} 字节未显示` : '完整内容已被截断（原始大小未知）'
}

/**
 * 步骤卡输出块折叠态的摘要行（2026-08-19 用户走查反馈：「执行记录可以默认折叠显示……省的最后
 * 把整个页面弄得特别长」）。折叠后仍要让人知道**有输出、有多大**，否则「折叠」就变成了「藏起来」——
 * 一条读了 10KB 文件的步骤和一条没有任何输出的步骤，收起来后不能长得一模一样。
 */
export function previewSummary(bytes: number | undefined, truncated: boolean | undefined): string {
  if (typeof bytes !== 'number') return '查看输出'
  return truncated ? `查看输出（前 20 行，共 ${bytes} 字节）` : `查看输出（${bytes} 字节）`
}

// ── 工具 input 取文案 ───────────────────────────────────────────────────
// 2026-08-19 总指挥实测反馈（用户当初打低分的头号理由是"黑话太多"）：步骤卡不能直接把 CC 内部
// 工具名（Bash/Read/Skill…）当标题——12 份真实日志里工具名只出现 4 种（Bash 128 次、Skill 9、
// Read 6、Edit 1），但 CC 的工具集会变，明天就可能冒出 Task/TodoWrite/WebFetch/MCP 工具。
// 处理原则：能认出的工具给「人话动词 + 原文」标题（如「执行命令」「读文件 /a/b.md」），命令/
// 路径/skill 名本身仍保留原文不翻译（07-对照表白名单）；认不出的工具**原样显示工具名**，
// 不编「未知工具」这种话——命不中映射表是常态，不是异常。

export interface ToolAction {
  /** 人话标题：已知工具是「动词」或「动词 + 原文名字」；未命中映射表时原样是工具名本身。 */
  label: string
  /** 详情：默认单行截断、点击可展开的原文（命令全文 / skill 参数 / 搜索模式等）。不是所有工具都有。 */
  detail?: string
}

function asRecord(input: unknown): Record<string, unknown> | undefined {
  return input && typeof input === 'object' && !Array.isArray(input) ? (input as Record<string, unknown>) : undefined
}

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() !== '' ? v : undefined
}

function jsonPreview(value: unknown): string {
  if (value === undefined) return '（无参数）'
  try {
    const text = JSON.stringify(value)
    return text.length > 200 ? `${text.slice(0, 200)}…` : text
  } catch {
    return String(value)
  }
}

/** input 形状不对/取不出预期字段时的兜底：仍用该工具本该有的标题，detail 退到 JSON 摘要
 *（不静默显示空白，也不因为一个字段缺失就假装不认识这个工具）。 */
function fallbackDetail(rec: Record<string, unknown> | undefined, input: unknown): string {
  return rec ? jsonPreview(rec) : jsonPreview(input)
}

/**
 * 按工具名取「人要看的那句话」。已知工具（形状取自 tools/console/logs/jobs/ 下真实历史日志
 * 实测）按各自真实 input 精确取字段；未命中映射表的工具，label 原样显示工具名（硬要求），
 * detail 按常见字段名（command/file_path/pattern/url/query/path）兜底试一遍，全部落空才退到
 * JSON 摘要。
 */
export function describeToolAction(name: string, input: unknown): ToolAction {
  const rec = asRecord(input)

  switch (name) {
    case 'Bash': {
      const command = rec ? str(rec.command) : undefined
      return { label: '执行命令', detail: command ?? fallbackDetail(rec, input) }
    }
    case 'Skill': {
      const skill = rec ? str(rec.skill) : undefined
      if (!skill) return { label: name, detail: fallbackDetail(rec, input) }
      return { label: `调用技能 ${skill}`, detail: rec ? str(rec.args) : undefined }
    }
    case 'Read': {
      const path = rec ? str(rec.file_path) : undefined
      return path ? { label: `读文件 ${path}` } : { label: name, detail: fallbackDetail(rec, input) }
    }
    case 'Write': {
      const path = rec ? str(rec.file_path) : undefined
      return path ? { label: `写文件 ${path}` } : { label: name, detail: fallbackDetail(rec, input) }
    }
    case 'Edit':
    case 'NotebookEdit': {
      const path = rec ? str(rec.file_path) : undefined
      return path ? { label: `改文件 ${path}` } : { label: name, detail: fallbackDetail(rec, input) }
    }
    case 'Glob': {
      const detail = rec ? [str(rec.pattern), str(rec.path)].filter((v): v is string => !!v).join(' · ') : ''
      return { label: '找文件', detail: detail || undefined }
    }
    case 'Grep': {
      const detail = rec ? [str(rec.pattern), str(rec.path)].filter((v): v is string => !!v).join(' · ') : ''
      return { label: '搜代码', detail: detail || undefined }
    }
    case 'Task': {
      const detail = rec ? [str(rec.description), str(rec.subagent_type)].filter((v): v is string => !!v).join(' · ') : ''
      return { label: '派子任务', detail: detail || undefined }
    }
    case 'TodoWrite': {
      const todos = rec?.todos
      return { label: '更新待办', detail: Array.isArray(todos) ? `${todos.length} 项` : undefined }
    }
    default: {
      // 映射表未命中：label 原样是工具名（硬要求，"命不中"是常态不是异常）；detail 按常见字段名
      // （command/file_path/pattern/url/query/path）兜底试一遍，全部落空才退到 JSON 摘要——
      // 不让一个没见过的工具在卡片上开天窗。
      const fallback = rec
        ? (str(rec.command) ?? str(rec.file_path) ?? str(rec.pattern) ?? str(rec.url) ?? str(rec.query) ?? str(rec.path))
        : undefined
      return { label: name, detail: fallback ?? fallbackDetail(rec, input) }
    }
  }
}
