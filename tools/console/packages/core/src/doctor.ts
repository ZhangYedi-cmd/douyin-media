// media doctor 规则唯一实现（内容产物格式 lint）。
// 与 check/alerts.ts 分工：check 验状态账本一致性，doctor 验产物格式——互不重叠。
// 具体去重决策见各条规则注释；本文件不重复 CHK-01/05/06 已覆盖的指针/链接检查。
//
// 架构镜像 snapshot.ts / alerts.ts 的 IO-与-计算分离：
//   gatherDoctorInput()   —— 唯一 IO 入口，读 1-brief/2-script/4-publish 三个产物文件 + meta.yaml 原文
//   computeDoctorAlerts() —— 零 IO 纯函数，只吃 DoctorInput，方便单测不建 fixture 目录
import fs from 'node:fs'
import path from 'node:path'
import { parseYamlValue } from './yaml-read.js'
import { META_STATUS_ORDER } from './types.js'
import type { Alert, BacklogTopic, ContentEntry, ContentMeta, MetaStatus } from './types.js'

// ── 4-publish.md 字段解析：逐字符镜像 tools/feishu-bot/meta.py 的 _FIELD_RE ──
// 解析器是谁就按谁验，这是本需求的核（见任务背景）。两处正则改动必须同步，任何一处漂移
// 都会导致 doctor「体检通过」但飞书 server 实际读不出字段（或反之），这正是 doctor 要防的漂移本身。
const FIELD_RE = /^\s*[-*]\s*\*\*(.+?)\*\*[：:]\s*(.*)$/

export function parsePublishFields(text: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const line of text.split(/\r?\n/)) {
    const m = FIELD_RE.exec(line)
    if (!m) continue
    out[m[1]!.trim()] = m[2]!.trim()
  }
  return out
}

/** 镜像 meta.py 的 parse_tags：'#a #b #c' / 'a,b' → ['a','b']，空 token 丢弃。 */
export function parseTags(raw: string): string[] {
  if (!raw) return []
  return raw
    .split(/[#,\s]+/)
    .map((p) => p.trim())
    .filter((p) => p !== '')
}

/**
 * 从「封面」「媒体文件」bullet 的值里取出可核验的路径 token。
 * 真实语料常见 "assets/x.mp4（备注文字）" 混排——遇首个空白/括号/竖线即截断。
 * 截断结果不含 '/' 判定不是路径（如模板占位 "口播视频 / 图片清单"），
 * 以 '/' 收尾判定缺文件名（如模板占位 "assets/"）——两种都返回 null，落入"缺失"分支而非误判为"文件存在"。
 */
export function extractReferencedPath(value: string): string | null {
  const trimmed = value.trim()
  if (trimmed === '') return null
  const m = /^[^\s（(｜|]+/.exec(trimmed)
  if (!m) return null
  const token = m[0]!
  if (!token.includes('/')) return null
  if (token.endsWith('/')) return null
  return token
}

function hasH1(text: string): boolean {
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (line === '') continue
    return /^#\s+\S/.test(line)
  }
  return false
}

export interface DoctorPublishInput {
  exists: boolean
  nonEmpty: boolean
  fields: Record<string, string>
  coverPath: string | null
  coverPathExists: boolean
  mediaPath: string | null
  mediaPathExists: boolean
}

export interface DoctorInput {
  slug: string
  dir: string // 仓根相对路径，与 ContentEntry.dir 同约定
  meta: ContentMeta | null
  parseError?: string
  /** meta.yaml 里 status: 的原始标量文本；undefined = 取不到（meta 解析失败或字段缺失）。
   *  之所以要原始值：parseMetaFile 对非法 status 会静默降级成 'ideated'（core/parsers/meta.ts），
   *  只看 ContentMeta.status 永远合法、抓不到"曾经写错"这件事——doctor 要抓的正是这个。 */
  rawStatus: string | undefined
  /** 反查 meta.source 命中的 backlog 条目的 plan_file（非空=系列剧集）；查无条目/无该字段 = null。
   *  DOC-04 豁免专用，见 pipeline/2-create.md 输入节第 1 条："系列剧集用其 backlog 条目里的
   *  plan_file（外部 plan repo）当 1-brief 等价物"。 */
  seriesPlanFile: string | null
  brief: { exists: boolean; nonEmpty: boolean }
  script: { exists: boolean; nonEmpty: boolean; hasH1: boolean }
  publish: DoctorPublishInput
}

/**
 * status 达到哪一步，要求 timestamps 里对应的哪几个键必须非空。
 * 没有直接照抄 META_STATUS_ORDER 前缀，是因为真实数据校准后发现两个键不可靠，明确排除：
 *   - 'scheduled'：模板 timestamps 区块压根没这个键；真实条目里有的写 'scheduled'（open-weight-5），
 *     有的写自造键 'scheduled_submit'（ep04-esc-abort-chain）——用它当必填会把老条目全部错杀。
 *   - 'rejected'：state.ts 里 rejected 只能从 review 打回，模板 timestamps 区块也没这个键，
 *     故 rejected 只要求走到过 review。
 */
const REQUIRED_TIMESTAMP_STAGES: Record<MetaStatus, MetaStatus[]> = {
  ideated: ['ideated'],
  drafting: ['ideated', 'drafting'],
  review: ['ideated', 'drafting', 'review'],
  approved: ['ideated', 'drafting', 'review', 'approved'],
  scheduled: ['ideated', 'drafting', 'review', 'approved'],
  published: ['ideated', 'drafting', 'review', 'approved', 'published'],
  retro_done: ['ideated', 'drafting', 'review', 'approved', 'published', 'retro_done'],
  rejected: ['ideated', 'drafting', 'review'],
}

function alertKey(rule: string, subject: string): string {
  return `${rule}:${subject}`
}

/** 零 IO：doctor 规则的唯一实现。吃 DoctorInput，不碰文件系统——单测直接拼字面量，不建 fixture 目录。 */
export function computeDoctorAlerts(input: DoctorInput): Alert[] {
  const alerts: Alert[] = []
  const push = (rule: string, level: Alert['level'], message: string, evidencePath?: string) => {
    alerts.push({ key: alertKey(rule, input.slug), rule, level, subject: input.slug, message, evidencePath })
  }
  const metaEvidence = `${input.dir}/meta.yaml`

  // DOC-00：meta.yaml 解析失败，后续规则全部依赖 meta，只报这一条就返回。
  if (!input.meta) {
    push('DOC-00', 'error', `meta.yaml 解析失败，无法体检：${input.parseError ?? '未知错误'}`, metaEvidence)
    return alerts
  }
  const meta = input.meta

  // DOC-01（基础·任何状态）meta 必填字段齐。source 双向指针不在此列——CHK-06 已管（见去重决策），不重复。
  const missingFields: string[] = []
  if (!meta.title) missingFields.push('title')
  if (!meta.type) missingFields.push('type')
  if (!meta.pillar) missingFields.push('pillar')
  if (missingFields.length > 0) {
    push('DOC-01', 'error', `meta.yaml 缺必填字段：${missingFields.join('、')}`, metaEvidence)
  }

  // DOC-02（基础）status 合法，引用 state.ts 的 META_STATUS_ORDER，不自造集合。
  if (input.rawStatus !== undefined && !(META_STATUS_ORDER as readonly string[]).includes(input.rawStatus)) {
    push(
      'DOC-02',
      'error',
      `status 原始值「${input.rawStatus}」不在合法集合内（已被解析器静默降级为 ideated，见 core/parsers/meta.ts）`,
      metaEvidence,
    )
  }

  // DOC-03（基础）timestamps 与 status 匹配：已走过的阶段必须有时间戳。范围见 REQUIRED_TIMESTAMP_STAGES 注释。
  const requiredStages = REQUIRED_TIMESTAMP_STAGES[meta.status] ?? []
  const missingStamps = requiredStages.filter((s) => !meta.timestamps[s])
  if (missingStamps.length > 0) {
    push('DOC-03', 'error', `status=${meta.status} 但 timestamps 缺：${missingStamps.join('、')}`, metaEvidence)
  }

  // DOC-04（≥ideated，即任何已解析出 meta 的条目）1-brief.md 存在非空。
  // 系列剧集豁免：pipeline/2-create.md 输入节第 1 条明文——系列剧集用其 backlog 条目的 plan_file
  // （外部 plan repo 的 epXX 脚本+源码导读）当 1-brief 等价物，本仓不产 1-brief.md 是 SOP 允许的正常态，
  // 不算格式缺陷；降级为 info（而非直接静默 pass）是为了 --all 报告仍能让人看到"这条为什么没有 1-brief"，
  // 不是体检漏了它。
  if (!input.brief.exists || !input.brief.nonEmpty) {
    if (input.seriesPlanFile) {
      push(
        'DOC-04',
        'info',
        `1-brief.md 不存在，但系列条目以 plan_file（${input.seriesPlanFile}）为 brief 等价物，SOP 允许（pipeline/2-create.md 输入节）`,
        `${input.dir}/1-brief.md`,
      )
    } else {
      push('DOC-04', 'error', input.brief.exists ? '1-brief.md 为空' : '1-brief.md 不存在', `${input.dir}/1-brief.md`)
    }
  }

  // ≥drafting：2-script.md
  const pastDrafting = meta.status !== 'ideated'
  if (pastDrafting) {
    if (!input.script.exists || !input.script.nonEmpty) {
      push('DOC-05', 'error', input.script.exists ? '2-script.md 为空' : '2-script.md 不存在', `${input.dir}/2-script.md`)
    } else if (!input.script.hasH1) {
      push('DOC-06', 'error', '2-script.md 缺 H1 标题行（首个非空行应以 # 开头）', `${input.dir}/2-script.md`)
    }
  }

  // ≥review（出审闸；review/approved/scheduled/rejected 均已走过 review）。
  // 标题/话题标签/建议发布时段三条规则对全部这些状态一视同仁；封面/媒体文件路径存在性另有分级，见下方 mediaOptionalTier。
  const pastReview = meta.status !== 'ideated' && meta.status !== 'drafting'
  if (pastReview) {
    const publishEvidence = `${input.dir}/4-publish.md`
    if (!input.publish.exists || !input.publish.nonEmpty) {
      push(
        'DOC-07',
        'error',
        input.publish.exists ? '4-publish.md 为空' : '4-publish.md 不存在（L5：出审前必产，见 pipeline/lessons.md）',
        publishEvidence,
      )
    } else {
      // review/approved 严格 error；scheduled/published/retro_done 降级 warn——分界点是"sau 是否已经真的执行过上传"，
      // 不是"是否已经临时下线"：
      //   - scheduled：media 已被 sau 消费（upload-video/upload-note 已提交，只是定时公开），本地成片
      //     缺失不再阻塞任何后续动作；该状态真正该管的异常（到点未回填）是 CHK-03 的活，doctor 不叠加噪音。
      //   - published/retro_done：同理，且额外可能是历史归档时被人工清理。
      //   - approved：sau 还没跑过，缺 mp4 = 卡在出审后、发布前的在制品阻塞（如 hy3-moe-teardown），必须 error。
      // 标题/话题标签/建议发布时段三条不随这条分界降级——它们不是"媒体已被消费/清理"能解释的，永远是格式缺陷。
      const mediaOptionalTier = meta.status === 'scheduled' || meta.status === 'published' || meta.status === 'retro_done'
      const fields = input.publish.fields

      const title = (fields['标题'] ?? '').trim()
      if (!title) {
        push('DOC-08', 'error', '4-publish.md 缺「标题」bullet 或值为空（发布会硬拒绝，镜像 tools/feishu-bot/publish.py）', publishEvidence)
      }

      const tagsRaw = fields['话题标签']
      if (tagsRaw === undefined) {
        push('DOC-09', 'error', '4-publish.md 缺「话题标签」bullet', publishEvidence)
      } else {
        const tags = parseTags(tagsRaw)
        if (tags.length < 3 || tags.length > 5) {
          push('DOC-09', 'error', `话题标签 ${tags.length} 个，应为 3–5 个`, publishEvidence)
        }
      }

      const scheduleRaw = fields['建议发布时段']
      if (scheduleRaw !== undefined && scheduleRaw.trim() !== '') {
        push(
          'DOC-10',
          'error',
          `出现可解析的「建议发布时段」bullet（值：${scheduleRaw.trim()}）——非 datetime 文本会被原样传给 sau --schedule 致真发崩（L6）；应删除该行，定时改由人在飞书确认发布卡指定`,
          publishEvidence,
        )
      }

      const descRaw = fields['正文/简介'] ?? fields['正文'] ?? fields['简介']
      if (descRaw === undefined || descRaw.trim() === '') {
        push('DOC-13', 'warn', '4-publish.md 缺「正文/简介」bullet（非阻断——publish.py 不因此拒绝，但发布文案不完整）', publishEvidence)
      }

      const softSuffix = mediaOptionalTier
        ? meta.status === 'scheduled'
          ? '（sau 已提交上传，本地成片是否留存不阻塞发布；到点未回填是 CHK-03 的事）'
          : '（历史归档，成片可能已清理）'
        : ''

      const coverLevel: Alert['level'] = mediaOptionalTier ? 'warn' : 'error'
      if (input.publish.coverPath === null) {
        push('DOC-11', coverLevel, '4-publish.md 缺「封面」bullet 或未给出可解析路径', publishEvidence)
      } else if (!input.publish.coverPathExists) {
        push('DOC-11', coverLevel, `「封面」引用路径在内容目录下不存在：${input.publish.coverPath}${softSuffix}`, publishEvidence)
      }

      const mediaLevel: Alert['level'] = mediaOptionalTier ? 'warn' : 'error'
      if (input.publish.mediaPath === null) {
        push('DOC-12', mediaLevel, '4-publish.md 缺「媒体文件」bullet 或未给出可解析路径', publishEvidence)
      } else if (!input.publish.mediaPathExists) {
        push('DOC-12', mediaLevel, `「媒体文件」引用路径在内容目录下不存在：${input.publish.mediaPath}${softSuffix}`, publishEvidence)
      }
    }
  }

  // ≥published：publish_url 非空——CHK-05 已管（warn），不重复；media/cover 缺失已在上面按 archiveTier 降级处理。

  return alerts
}

/**
 * 唯一 IO 入口：给定内容条目，读它的三份产物文件 + meta.yaml 原文，拼成 DoctorInput。纯读，不写任何文件。
 * backlogTopics：完整 backlog 条目列表（一般取自同一份 Snapshot.backlog.topics），用于按 entry.meta.source
 * 反查 plan_file——DOC-04 系列豁免专用（见 DoctorInput.seriesPlanFile 注释）。不传时豁免不生效。
 */
export function gatherDoctorInput(root: string, entry: ContentEntry, backlogTopics: BacklogTopic[] = []): DoctorInput {
  const absDir = path.join(root, entry.dir)

  const readText = (name: string): string | null => {
    try {
      return fs.readFileSync(path.join(absDir, name), 'utf8')
    } catch {
      return null
    }
  }

  let rawStatus: string | undefined
  if (entry.meta) {
    try {
      const rawYaml = fs.readFileSync(path.join(absDir, 'meta.yaml'), 'utf8')
      const obj = parseYamlValue(rawYaml) as Record<string, unknown> | null
      const s = obj?.status
      if (typeof s === 'string') rawStatus = s
      else if (s !== undefined && s !== null) rawStatus = String(s)
    } catch {
      rawStatus = undefined
    }
  }

  let seriesPlanFile: string | null = null
  if (entry.meta?.source) {
    const topic = backlogTopics.find((t) => t.id === entry.meta!.source)
    seriesPlanFile = topic?.plan_file ?? null
  }

  const briefText = readText('1-brief.md')
  const scriptText = readText('2-script.md')
  const publishText = readText('4-publish.md')

  const fields = publishText !== null ? parsePublishFields(publishText) : {}
  const coverToken = fields['封面'] !== undefined ? extractReferencedPath(fields['封面']!) : null
  const mediaToken = fields['媒体文件'] !== undefined ? extractReferencedPath(fields['媒体文件']!) : null
  const resolveExists = (token: string | null): boolean => (token !== null ? fs.existsSync(path.join(absDir, token)) : false)

  return {
    slug: entry.slug,
    dir: entry.dir,
    meta: entry.meta,
    parseError: entry.parseError,
    rawStatus,
    seriesPlanFile,
    brief: { exists: briefText !== null, nonEmpty: (briefText ?? '').trim() !== '' },
    script: {
      exists: scriptText !== null,
      nonEmpty: (scriptText ?? '').trim() !== '',
      hasH1: scriptText !== null && hasH1(scriptText),
    },
    publish: {
      exists: publishText !== null,
      nonEmpty: (publishText ?? '').trim() !== '',
      fields,
      coverPath: coverToken,
      coverPathExists: resolveExists(coverToken),
      mediaPath: mediaToken,
      mediaPathExists: resolveExists(mediaToken),
    },
  }
}

/** 便捷封装：给一批 ContentEntry 跑体检并拍平成一份 Alert 列表（cli 层 <slug> 与 --all 共用）。 */
export function runDoctor(root: string, entries: ContentEntry[], backlogTopics: BacklogTopic[] = []): Alert[] {
  const alerts: Alert[] = []
  for (const entry of entries) {
    alerts.push(...computeDoctorAlerts(gatherDoctorInput(root, entry, backlogTopics)))
  }
  return alerts
}
