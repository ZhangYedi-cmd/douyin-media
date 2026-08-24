// 双层状态机：规则唯一真相源（01-CLI执行方案.md §2.14 / 上游拍板 §5.1）。
// meta 细粒度 + backlog 粗粒度两张迁移表；写命令的合法性判定全部经此，不得另写判断逻辑。
import { MediaError } from './errors.js'
import type { BacklogStatus, BacklogTopic, MetaStatus, Snapshot } from './types.js'

export interface TransitionSpec {
  requiresReason: boolean
  line: 'production' | 'harness'
  viaCommand: 'flip' | 'promote' | 'publish-done' | 'sweep' | 'apply' | 'add'
}

// meta.yaml 细粒度迁移表（忠实转写拍板 §5.1 / 01 方案 §2.14 表，逐格对照）。
// published/scheduled 只能经 `media publish-done` 写入——flip 命令层再加一道硬拒绝（§2.6），
// 这里的图仍如实描述“抽象上合法”的边，否则 publish-done 自身也无法复用同一张表。
export const META_TRANSITIONS: Record<MetaStatus, Partial<Record<MetaStatus, TransitionSpec>>> = {
  ideated: {
    drafting: { requiresReason: false, line: 'production', viaCommand: 'flip' },
  },
  drafting: {
    review: { requiresReason: false, line: 'production', viaCommand: 'flip' },
  },
  review: {
    drafting: { requiresReason: false, line: 'production', viaCommand: 'flip' }, // 打回重做
    approved: { requiresReason: false, line: 'production', viaCommand: 'flip' },
    rejected: { requiresReason: true, line: 'production', viaCommand: 'flip' },
  },
  approved: {
    drafting: { requiresReason: false, line: 'production', viaCommand: 'flip' }, // 2026-08-18 增补：审批后反悔改稿
    scheduled: { requiresReason: false, line: 'production', viaCommand: 'publish-done' },
    published: { requiresReason: false, line: 'production', viaCommand: 'publish-done' }, // 允许直达
  },
  scheduled: {
    published: { requiresReason: false, line: 'production', viaCommand: 'publish-done' },
  },
  published: {
    retro_done: { requiresReason: false, line: 'harness', viaCommand: 'flip' }, // 治理线唯一迁移
  },
  rejected: {
    drafting: { requiresReason: false, line: 'production', viaCommand: 'flip' }, // 人决定重做
  },
  retro_done: {}, // 终态；人工恢复可见性翻回 published 属人工例外，不进迁移表（§4 待定项 Q2，维持人工编辑）
}

// backlog.yaml 粗粒度迁移表（01 方案 §2.14 尾注）。
export const BACKLOG_TRANSITIONS: Record<BacklogStatus, Partial<Record<BacklogStatus, TransitionSpec>>> = {
  idea: {
    picked: { requiresReason: false, line: 'production', viaCommand: 'promote' },
    expired: { requiresReason: false, line: 'harness', viaCommand: 'sweep' }, // 规则化清扫，CLAUDE.md 记账例外
    archived: { requiresReason: false, line: 'harness', viaCommand: 'apply' },
    // 预留，现无命令触发（拍板原文）；无实现命令对应，姑标 'apply' 占位，供迁移表穷举测试对齐。
    rejected: { requiresReason: false, line: 'harness', viaCommand: 'apply' },
  },
  picked: {
    published: { requiresReason: false, line: 'production', viaCommand: 'publish-done' },
  },
  published: {},
  expired: {},
  rejected: {},
  archived: {},
}

export function assertMetaTransition(from: MetaStatus, to: MetaStatus): TransitionSpec {
  const spec = META_TRANSITIONS[from]?.[to]
  if (!spec) {
    const legal = legalNext(from)
    const legalStr = legal.length > 0 ? legal.join(', ') : '（无——终态）'
    throw new MediaError(
      'E_ILLEGAL_TRANSITION',
      `${from} → ${to} 非法：${from} 当前合法出边为 ${legalStr}`,
      { rule: 'state:meta' },
    )
  }
  return spec
}

export function assertBacklogTransition(from: BacklogStatus, to: BacklogStatus): TransitionSpec {
  const spec = BACKLOG_TRANSITIONS[from]?.[to]
  if (!spec) {
    const legal = Object.keys(BACKLOG_TRANSITIONS[from] ?? {})
    const legalStr = legal.length > 0 ? legal.join(', ') : '（无——终态）'
    throw new MediaError(
      'E_ILLEGAL_TRANSITION',
      `${from} → ${to} 非法：${from} 当前合法出边为 ${legalStr}`,
      { rule: 'state:backlog' },
    )
  }
  return spec
}

export function legalNext(from: MetaStatus): MetaStatus[] {
  return Object.keys(META_TRANSITIONS[from] ?? {}) as MetaStatus[]
}

export function legalNextBacklog(from: BacklogStatus): BacklogStatus[] {
  return Object.keys(BACKLOG_TRANSITIONS[from] ?? {}) as BacklogStatus[]
}

/** `media flip --help` 的活文档（拍板 §6.1 第 2 条：状态机规则只活在 core/state.ts，此函数是唯一渲染点）。 */
export function renderTransitionTable(): string {
  const statuses = Object.keys(META_TRANSITIONS) as MetaStatus[]
  const lines: string[] = []
  lines.push('meta.yaml 状态机（core/state.ts 唯一真相源）：')
  lines.push('')
  for (const from of statuses) {
    const edges = META_TRANSITIONS[from] ?? {}
    const targets = Object.keys(edges) as MetaStatus[]
    if (targets.length === 0) {
      lines.push(`  ${from} → （终态，无合法出边）`)
      continue
    }
    for (const to of targets) {
      const spec = edges[to]!
      const notes: string[] = [`via ${spec.viaCommand}`]
      if (spec.requiresReason) notes.push('需 --reason')
      if (spec.line === 'harness') notes.push('治理线')
      lines.push(`  ${from} → ${to}  (${notes.join(', ')})`)
    }
  }
  lines.push('')
  lines.push('注：flip 命令额外拒绝目标为 published/scheduled 的请求，须走 media publish-done（三翻齐事务）。')
  return lines.join('\n')
}

export interface PickDecision {
  decision: 'next_up' | 'score' | 'empty'
  id: string | null
  title: string | null
  score: number | null
  track: BacklogTopic['track'] | null
  format: BacklogTopic['format'] | null
  reason: string | null
  runnerUp: { id: string; score: number | null }[]
  warnings: string[]
}

/** 同分同赛道次级排序（§4 待定项 Q3「按预设」）：score 降序 → depth 优先 → created 早者 → id 字典序。 */
function compareIdeaTopics(a: BacklogTopic, b: BacklogTopic): number {
  const sa = a.score ?? Number.NEGATIVE_INFINITY
  const sb = b.score ?? Number.NEGATIVE_INFINITY
  if (sa !== sb) return sb - sa
  if (a.track !== b.track) return a.track === 'depth' ? -1 : 1
  if (a.created !== b.created) return a.created < b.created ? -1 : 1
  if (a.id < b.id) return -1
  if (a.id > b.id) return 1
  return 0
}

/** `media next` 与 `media promote --auto` 共用同一套取题逻辑（01 方案 §2.2）。 */
export function pickNext(backlog: Snapshot['backlog']): PickDecision {
  const warnings: string[] = []
  const ideas = backlog.topics.filter((t) => t.status === 'idea')
  const sorted = [...ideas].sort(compareIdeaTopics)

  let picked: BacklogTopic | undefined
  let decision: PickDecision['decision'] | undefined

  if (backlog.nextUp) {
    const target = backlog.topics.find((t) => t.id === backlog.nextUp)
    if (target && target.status === 'idea') {
      picked = target
      decision = 'next_up'
    } else if (target) {
      warnings.push(`next_up 指向的 ${backlog.nextUp} 当前状态为「${target.status}」（非 idea），已忽略指针改按 score 取题`)
    } else {
      warnings.push(`next_up 指向的 ${backlog.nextUp} 不存在，已忽略指针改按 score 取题`)
    }
  }

  if (!picked) {
    if (sorted.length === 0) {
      return {
        decision: 'empty',
        id: null,
        title: null,
        score: null,
        track: null,
        format: null,
        reason: null,
        runnerUp: [],
        warnings,
      }
    }
    picked = sorted[0]!
    decision = 'score'
  }

  const runnerUp = sorted
    .filter((t) => t.id !== picked!.id)
    .slice(0, 2)
    .map((t) => ({ id: t.id, score: t.score }))

  return {
    decision: decision!,
    id: picked.id,
    title: picked.title,
    score: picked.score,
    track: picked.track,
    format: picked.format,
    reason: picked.reason,
    runnerUp,
    warnings,
  }
}
