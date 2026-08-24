import { describe, it, expect } from 'vitest'
import { computeDoctorAlerts, parsePublishFields, parseTags, extractReferencedPath } from '../doctor.js'
import type { DoctorInput, DoctorPublishInput } from '../doctor.js'
import type { ContentMeta } from '../types.js'

function meta(overrides: Partial<ContentMeta> = {}): ContentMeta {
  return {
    slug: 'x',
    title: '标题',
    type: 'kouban',
    pillar: 'depth',
    status: 'ideated',
    source: '2026-08-01-001',
    schedule: null,
    publish_url: null,
    timestamps: { ideated: '2026-08-01' },
    blocker: {},
    ...overrides,
  }
}

function publish(overrides: Partial<DoctorPublishInput> = {}): DoctorPublishInput {
  return {
    exists: false,
    nonEmpty: false,
    fields: {},
    coverPath: null,
    coverPathExists: false,
    mediaPath: null,
    mediaPathExists: false,
    ...overrides,
  }
}

function input(overrides: Partial<DoctorInput> = {}): DoctorInput {
  return {
    slug: 'x',
    dir: 'content/2026-08-01/x',
    meta: meta(),
    rawStatus: 'ideated',
    seriesPlanFile: null,
    brief: { exists: true, nonEmpty: true },
    script: { exists: true, nonEmpty: true, hasH1: true },
    publish: publish(),
    ...overrides,
  }
}

function findRule(alerts: ReturnType<typeof computeDoctorAlerts>, rule: string) {
  return alerts.filter((a) => a.rule === rule)
}

// 一份完全合规的 ≥review 产物字段集，供「全绿基线」与逐条破坏对照用。
function legalPublishFields(): Record<string, string> {
  return {
    标题: '一个合规的标题',
    '正文/简介': '正文内容',
    话题标签: '#a #b #c',
    封面: 'assets/cover.png',
    媒体文件: 'assets/x.mp4',
  }
}

describe('parsePublishFields（镜像 tools/feishu-bot/meta.py _FIELD_RE）', () => {
  it('解析标准 bullet 行', () => {
    const text = '- **标题**：Hello\n- **话题标签**：#a #b #c\n正文不是 bullet，忽略\n'
    expect(parsePublishFields(text)).toEqual({ 标题: 'Hello', 话题标签: '#a #b #c' })
  })

  it('真实存量坑：键名内嵌括注导致解析器吃不到这个键（open-weight-5 实例复现）', () => {
    // 源自真实条目 content/2026-06-15/open-weight-5/4-publish.md：
    // "- **媒体文件**（图文 9 张，按顺序）：..." —— ** 闭合早于冒号，_FIELD_RE 整行不匹配。
    const text = '- **媒体文件**（图文 9 张，按顺序）：\n  1. assets/a.png\n'
    expect(parsePublishFields(text)).toEqual({})
  })

  it('* 前缀也认', () => {
    expect(parsePublishFields('* **标题**：X')).toEqual({ 标题: 'X' })
  })
})

describe('parseTags（镜像 meta.py parse_tags）', () => {
  it('# 分隔', () => {
    expect(parseTags('#a #b #c')).toEqual(['a', 'b', 'c'])
  })
  it('逗号分隔也兼容', () => {
    expect(parseTags('a,b,c')).toEqual(['a', 'b', 'c'])
  })
  it('空占位（真实存量：2026-08-19 批次 "#  #  #"）→ 空数组', () => {
    expect(parseTags('#  #  #')).toEqual([])
  })
})

describe('extractReferencedPath', () => {
  it('截断括注/竖线后的备注文字', () => {
    expect(extractReferencedPath('assets/cover.png（竖屏 9:16，备注）')).toBe('assets/cover.png')
    expect(extractReferencedPath('assets/x.mp4｜软字幕 assets/x.srt')).toBe('assets/x.mp4')
  })
  it('模板占位 "口播视频 / 图片清单"（不含斜杠的 token）→ null', () => {
    expect(extractReferencedPath('口播视频 / 图片清单')).toBeNull()
  })
  it('模板占位 "assets/"（无文件名，以 / 收尾）→ null，不误判目录存在=文件存在', () => {
    expect(extractReferencedPath('assets/')).toBeNull()
  })
  it('空值 → null', () => {
    expect(extractReferencedPath('   ')).toBeNull()
  })
})

describe('computeDoctorAlerts：全绿基线', () => {
  it('published 全合规条目 → 零 alert', () => {
    const alerts = computeDoctorAlerts(
      input({
        meta: meta({
          status: 'published',
          publish_url: 'https://v.douyin.com/x',
          timestamps: { ideated: '2026-08-01', drafting: '2026-08-01', review: '2026-08-01', approved: '2026-08-01', published: '2026-08-01' },
        }),
        rawStatus: 'published',
        publish: publish({ exists: true, nonEmpty: true, fields: legalPublishFields(), coverPath: 'assets/cover.png', coverPathExists: true, mediaPath: 'assets/x.mp4', mediaPathExists: true }),
      }),
    )
    expect(alerts).toEqual([])
  })

  it('ideated 条目只需 meta 字段 + 1-brief，不触发 script/publish 规则', () => {
    const alerts = computeDoctorAlerts(input())
    expect(alerts).toEqual([])
  })
})

describe('DOC-00 meta 解析失败', () => {
  it('meta=null → 只报 DOC-00，不跑其余规则', () => {
    const alerts = computeDoctorAlerts(input({ meta: null, parseError: 'YAML 解析失败' }))
    expect(alerts.length).toBe(1)
    expect(alerts[0]!.rule).toBe('DOC-00')
    expect(alerts[0]!.level).toBe('error')
  })
})

describe('DOC-01 meta 必填字段齐', () => {
  it('title/type/pillar 缺失 → error，一条 alert 列全部缺项', () => {
    const alerts = findRule(computeDoctorAlerts(input({ meta: meta({ title: '', type: null, pillar: null }) })), 'DOC-01')
    expect(alerts.length).toBe(1)
    expect(alerts[0]!.level).toBe('error')
    expect(alerts[0]!.message).toContain('title')
    expect(alerts[0]!.message).toContain('type')
    expect(alerts[0]!.message).toContain('pillar')
  })
})

describe('DOC-02 status 合法', () => {
  it('raw status 非法值（被解析器静默降级为 ideated）→ error', () => {
    const alerts = findRule(computeDoctorAlerts(input({ rawStatus: 'in_review_typo' })), 'DOC-02')
    expect(alerts.length).toBe(1)
  })
  it('raw status 合法 → 不报', () => {
    const alerts = findRule(computeDoctorAlerts(input({ rawStatus: 'drafting', meta: meta({ status: 'drafting', timestamps: { ideated: '2026-08-01', drafting: '2026-08-01' } }), script: { exists: true, nonEmpty: true, hasH1: true } })), 'DOC-02')
    expect(alerts).toEqual([])
  })
})

describe('DOC-03 timestamps 与 status 匹配', () => {
  it('status=review 但 timestamps.review 缺 → error', () => {
    const alerts = findRule(
      computeDoctorAlerts(
        input({
          meta: meta({ status: 'review', timestamps: { ideated: '2026-08-01', drafting: '2026-08-01' } }),
          rawStatus: 'review',
          publish: publish({ exists: true, nonEmpty: true, fields: legalPublishFields(), coverPath: 'assets/cover.png', coverPathExists: true, mediaPath: 'assets/x.mp4', mediaPathExists: true }),
        }),
      ),
      'DOC-03',
    )
    expect(alerts.length).toBe(1)
    expect(alerts[0]!.message).toContain('review')
  })

  it('status=scheduled 时不要求 timestamps.scheduled（真实数据校准：模板/存量都不可靠地填这个键）', () => {
    const alerts = findRule(
      computeDoctorAlerts(
        input({
          meta: meta({
            status: 'scheduled',
            schedule: '2026-08-10 20:00',
            timestamps: { ideated: '2026-08-01', drafting: '2026-08-01', review: '2026-08-01', approved: '2026-08-01' },
          }),
          rawStatus: 'scheduled',
          publish: publish({ exists: true, nonEmpty: true, fields: legalPublishFields(), coverPath: 'assets/cover.png', coverPathExists: true, mediaPath: 'assets/x.mp4', mediaPathExists: true }),
        }),
      ),
      'DOC-03',
    )
    expect(alerts).toEqual([])
  })
})

describe('DOC-04 1-brief.md 存在非空', () => {
  it('文件不存在 → error', () => {
    const alerts = findRule(computeDoctorAlerts(input({ brief: { exists: false, nonEmpty: false } })), 'DOC-04')
    expect(alerts.length).toBe(1)
    expect(alerts[0]!.message).toContain('不存在')
  })
  it('文件存在但空 → error', () => {
    const alerts = findRule(computeDoctorAlerts(input({ brief: { exists: true, nonEmpty: false } })), 'DOC-04')
    expect(alerts.length).toBe(1)
    expect(alerts[0]!.message).toContain('为空')
  })

  describe('系列剧集豁免（backlog 条目带 plan_file，pipeline/2-create.md 输入节）', () => {
    it('1-brief.md 不存在但 seriesPlanFile 非空 → 降级为 info，不计入 error', () => {
      const alerts = findRule(
        computeDoctorAlerts(
          input({ brief: { exists: false, nonEmpty: false }, seriesPlanFile: '/plan/claude-code-source-series/episodes/ep05.md' }),
        ),
        'DOC-04',
      )
      expect(alerts.length).toBe(1)
      expect(alerts[0]!.level).toBe('info')
      expect(alerts[0]!.message).toContain('plan_file')
      expect(alerts[0]!.message).toContain('ep05.md')
    })

    it('1-brief.md 为空（非"不存在"）+ seriesPlanFile 非空 → 同样降级为 info', () => {
      const alerts = findRule(
        computeDoctorAlerts(input({ brief: { exists: true, nonEmpty: false }, seriesPlanFile: '/plan/x/ep06.md' })),
        'DOC-04',
      )
      expect(alerts.length).toBe(1)
      expect(alerts[0]!.level).toBe('info')
    })

    it('1-brief.md 本身就存在非空时，即便是系列条目也不报（豁免只管"缺" brief 的场景）', () => {
      const alerts = findRule(
        computeDoctorAlerts(input({ brief: { exists: true, nonEmpty: true }, seriesPlanFile: '/plan/x/ep01.md' })),
        'DOC-04',
      )
      expect(alerts).toEqual([])
    })

    it('非系列条目（seriesPlanFile=null）缺 1-brief.md 仍是 error，豁免不误伤普通条目', () => {
      const alerts = findRule(
        computeDoctorAlerts(input({ brief: { exists: false, nonEmpty: false }, seriesPlanFile: null })),
        'DOC-04',
      )
      expect(alerts.length).toBe(1)
      expect(alerts[0]!.level).toBe('error')
    })
  })
})

describe('DOC-05 / DOC-06 2-script.md（≥drafting）', () => {
  const draftingMeta = meta({ status: 'drafting', timestamps: { ideated: '2026-08-01', drafting: '2026-08-01' } })

  it('ideated 状态不检查 2-script.md（未到该阶段）', () => {
    const alerts = computeDoctorAlerts(input({ script: { exists: false, nonEmpty: false, hasH1: false } }))
    expect(findRule(alerts, 'DOC-05')).toEqual([])
  })

  it('drafting 状态但 2-script.md 不存在 → DOC-05 error', () => {
    const alerts = findRule(
      computeDoctorAlerts(input({ meta: draftingMeta, rawStatus: 'drafting', script: { exists: false, nonEmpty: false, hasH1: false } })),
      'DOC-05',
    )
    expect(alerts.length).toBe(1)
  })

  it('drafting 状态且非空但缺 H1 → DOC-06 error', () => {
    const alerts = findRule(
      computeDoctorAlerts(input({ meta: draftingMeta, rawStatus: 'drafting', script: { exists: true, nonEmpty: true, hasH1: false } })),
      'DOC-06',
    )
    expect(alerts.length).toBe(1)
  })
})

describe('DOC-07 4-publish.md 存在非空（≥review，L5 回归）', () => {
  const reviewMeta = meta({ status: 'review', timestamps: { ideated: '2026-08-01', drafting: '2026-08-01', review: '2026-08-01' } })

  it('review 状态但 4-publish.md 不存在 → error（EP03 出审没产 4-publish.md 的历史事故）', () => {
    const alerts = findRule(computeDoctorAlerts(input({ meta: reviewMeta, rawStatus: 'review' })), 'DOC-07')
    expect(alerts.length).toBe(1)
    expect(alerts[0]!.message).toContain('L5')
  })
})

describe('DOC-08 缺标题', () => {
  it('4-publish.md 存在但无标题 bullet → error（镜像 publish.py 硬拒绝）', () => {
    const fields = legalPublishFields()
    delete (fields as Record<string, string>)['标题']
    const alerts = findRule(
      computeDoctorAlerts(
        input({
          meta: meta({ status: 'review', timestamps: { ideated: '2026-08-01', drafting: '2026-08-01', review: '2026-08-01' } }),
          rawStatus: 'review',
          publish: publish({ exists: true, nonEmpty: true, fields, coverPath: 'assets/cover.png', coverPathExists: true, mediaPath: 'assets/x.mp4', mediaPathExists: true }),
        }),
      ),
      'DOC-08',
    )
    expect(alerts.length).toBe(1)
  })
})

describe('DOC-09 话题标签数量', () => {
  const approvedMeta = meta({ status: 'approved', timestamps: { ideated: '2026-08-01', drafting: '2026-08-01', review: '2026-08-01', approved: '2026-08-01' } })
  function withTags(raw: string) {
    return input({
      meta: approvedMeta,
      rawStatus: 'approved',
      publish: publish({
        exists: true,
        nonEmpty: true,
        fields: { ...legalPublishFields(), 话题标签: raw },
        coverPath: 'assets/cover.png',
        coverPathExists: true,
        mediaPath: 'assets/x.mp4',
        mediaPathExists: true,
      }),
    })
  }

  it('6 个标签（超过 5 个上限）→ error', () => {
    const alerts = findRule(computeDoctorAlerts(withTags('#a #b #c #d #e #f')), 'DOC-09')
    expect(alerts.length).toBe(1)
    expect(alerts[0]!.message).toContain('6')
  })

  it('2 个标签（不足 3 个下限）→ error', () => {
    const alerts = findRule(computeDoctorAlerts(withTags('#a #b')), 'DOC-09')
    expect(alerts.length).toBe(1)
  })

  it('3–5 个 → 不报', () => {
    expect(findRule(computeDoctorAlerts(withTags('#a #b #c')), 'DOC-09')).toEqual([])
    expect(findRule(computeDoctorAlerts(withTags('#a #b #c #d #e')), 'DOC-09')).toEqual([])
  })

  it('话题标签 bullet 整个缺失 → error（含真实存量坑：键名内嵌括注导致解析不到）', () => {
    const fields = legalPublishFields()
    delete (fields as Record<string, string>)['话题标签']
    const alerts = findRule(
      computeDoctorAlerts(
        input({
          meta: approvedMeta,
          rawStatus: 'approved',
          publish: publish({ exists: true, nonEmpty: true, fields, coverPath: 'assets/cover.png', coverPathExists: true, mediaPath: 'assets/x.mp4', mediaPathExists: true }),
        }),
      ),
      'DOC-09',
    )
    expect(alerts.length).toBe(1)
  })
})

describe('DOC-10 建议发布时段（L6 红线，绝不降级）', () => {
  const scheduledMeta = meta({ status: 'scheduled', timestamps: { ideated: '2026-08-01', drafting: '2026-08-01', review: '2026-08-01', approved: '2026-08-01' } })

  it('出现非空「建议发布时段」bullet → error（真实存量事故复现：open-weight-5「工作日晚间…」文本会被原样传给 sau --schedule）', () => {
    const alerts = findRule(
      computeDoctorAlerts(
        input({
          meta: scheduledMeta,
          rawStatus: 'scheduled',
          publish: publish({
            exists: true,
            nonEmpty: true,
            fields: { ...legalPublishFields(), 建议发布时段: '工作日晚间 19:00–22:00（技术受众活跃）' },
            coverPath: 'assets/cover.png',
            coverPathExists: true,
            mediaPath: 'assets/x.mp4',
            mediaPathExists: true,
          }),
        }),
      ),
      'DOC-10',
    )
    expect(alerts.length).toBe(1)
    expect(alerts[0]!.level).toBe('error')
  })

  it('即便是看起来合法的 datetime 文本也一样报错——SOP 的红线是"别写"，不是"写得对不对"', () => {
    const alerts = findRule(
      computeDoctorAlerts(
        input({
          meta: scheduledMeta,
          rawStatus: 'scheduled',
          publish: publish({
            exists: true,
            nonEmpty: true,
            fields: { ...legalPublishFields(), 建议发布时段: '2026-08-10 20:00' },
            coverPath: 'assets/cover.png',
            coverPathExists: true,
            mediaPath: 'assets/x.mp4',
            mediaPathExists: true,
          }),
        }),
      ),
      'DOC-10',
    )
    expect(alerts.length).toBe(1)
  })

  it('bullet 存在但值为空（模板占位）→ 不报，模板天然合法', () => {
    const alerts = findRule(
      computeDoctorAlerts(
        input({
          meta: scheduledMeta,
          rawStatus: 'scheduled',
          publish: publish({
            exists: true,
            nonEmpty: true,
            fields: { ...legalPublishFields(), 建议发布时段: '' },
            coverPath: 'assets/cover.png',
            coverPathExists: true,
            mediaPath: 'assets/x.mp4',
            mediaPathExists: true,
          }),
        }),
      ),
      'DOC-10',
    )
    expect(alerts).toEqual([])
  })

  it('bullet 完全不写 → 不报（SOP 推荐做法）', () => {
    const fields = legalPublishFields()
    const alerts = findRule(
      computeDoctorAlerts(
        input({
          meta: scheduledMeta,
          rawStatus: 'scheduled',
          publish: publish({ exists: true, nonEmpty: true, fields, coverPath: 'assets/cover.png', coverPathExists: true, mediaPath: 'assets/x.mp4', mediaPathExists: true }),
        }),
      ),
      'DOC-10',
    )
    expect(alerts).toEqual([])
  })
})

describe('DOC-11 / DOC-12 封面·媒体文件路径存在性 + scheduled/published/retro_done 降级', () => {
  const approvedMeta = meta({ status: 'approved', timestamps: { ideated: '2026-08-01', drafting: '2026-08-01', review: '2026-08-01', approved: '2026-08-01' } })
  const scheduledMeta = meta({
    status: 'scheduled',
    schedule: '2026-08-10 20:00',
    timestamps: { ideated: '2026-08-01', drafting: '2026-08-01', review: '2026-08-01', approved: '2026-08-01' },
  })
  const publishedMeta = meta({
    status: 'published',
    publish_url: 'https://v.douyin.com/x',
    timestamps: { ideated: '2026-08-01', drafting: '2026-08-01', review: '2026-08-01', approved: '2026-08-01', published: '2026-08-01' },
  })

  it('approved 状态下媒体文件路径不存在 → error（sau 还没跑过，出审后卡死的在制品——真实存量事故复现：hy3-moe-teardown）', () => {
    const alerts = findRule(
      computeDoctorAlerts(
        input({
          meta: approvedMeta,
          rawStatus: 'approved',
          publish: publish({ exists: true, nonEmpty: true, fields: legalPublishFields(), coverPath: 'assets/cover.png', coverPathExists: true, mediaPath: 'assets/x.mp4', mediaPathExists: false }),
        }),
      ),
      'DOC-12',
    )
    expect(alerts.length).toBe(1)
    expect(alerts[0]!.level).toBe('error')
  })

  it('scheduled 状态下媒体文件路径不存在 → warn，非 error（sau 已提交上传，本地成片是否留存不阻塞发布；到点未回填交给 CHK-03）', () => {
    const alerts = findRule(
      computeDoctorAlerts(
        input({
          meta: scheduledMeta,
          rawStatus: 'scheduled',
          publish: publish({ exists: true, nonEmpty: true, fields: legalPublishFields(), coverPath: 'assets/cover.png', coverPathExists: true, mediaPath: 'assets/x.mp4', mediaPathExists: false }),
        }),
      ),
      'DOC-12',
    )
    expect(alerts.length).toBe(1)
    expect(alerts[0]!.level).toBe('warn')
  })

  it('scheduled 状态下封面 bullet 整个缺失也一样降级为 warn（不只是"路径不存在"分支，"缺 key"分支同理）', () => {
    const fields = legalPublishFields()
    delete (fields as Record<string, string>)['封面']
    const alerts = findRule(
      computeDoctorAlerts(
        input({
          meta: scheduledMeta,
          rawStatus: 'scheduled',
          publish: publish({ exists: true, nonEmpty: true, fields, coverPath: null, coverPathExists: false, mediaPath: 'assets/x.mp4', mediaPathExists: true }),
        }),
      ),
      'DOC-11',
    )
    expect(alerts.length).toBe(1)
    expect(alerts[0]!.level).toBe('warn')
  })

  it('published 状态下媒体文件路径不存在 → warn，非 error（历史归档可能已清理成片——真实存量事故复现：spec-driven-development 引用的 mp4 已不在 assets/）', () => {
    const alerts = findRule(
      computeDoctorAlerts(
        input({
          meta: publishedMeta,
          rawStatus: 'published',
          publish: publish({ exists: true, nonEmpty: true, fields: legalPublishFields(), coverPath: 'assets/cover.png', coverPathExists: true, mediaPath: 'assets/x.mp4', mediaPathExists: false }),
        }),
      ),
      'DOC-12',
    )
    expect(alerts.length).toBe(1)
    expect(alerts[0]!.level).toBe('warn')
  })

  it('published 状态下封面路径不存在 → warn', () => {
    const alerts = findRule(
      computeDoctorAlerts(
        input({
          meta: publishedMeta,
          rawStatus: 'published',
          publish: publish({ exists: true, nonEmpty: true, fields: legalPublishFields(), coverPath: 'assets/cover.png', coverPathExists: false, mediaPath: 'assets/x.mp4', mediaPathExists: true }),
        }),
      ),
      'DOC-11',
    )
    expect(alerts.length).toBe(1)
    expect(alerts[0]!.level).toBe('warn')
  })

  it('封面 bullet 完全缺失（key 不存在）→ approved 状态下 error', () => {
    const fields = legalPublishFields()
    delete (fields as Record<string, string>)['封面']
    const alerts = findRule(
      computeDoctorAlerts(
        input({
          meta: approvedMeta,
          rawStatus: 'approved',
          publish: publish({ exists: true, nonEmpty: true, fields, coverPath: null, coverPathExists: false, mediaPath: 'assets/x.mp4', mediaPathExists: true }),
        }),
      ),
      'DOC-11',
    )
    expect(alerts.length).toBe(1)
    expect(alerts[0]!.level).toBe('error')
  })
})

describe('DOC-13 正文/简介缺失 → warn（非阻断）', () => {
  it('缺该 bullet → warn，不是 error', () => {
    const fields = legalPublishFields()
    delete (fields as Record<string, string>)['正文/简介']
    const alerts = findRule(
      computeDoctorAlerts(
        input({
          meta: meta({ status: 'review', timestamps: { ideated: '2026-08-01', drafting: '2026-08-01', review: '2026-08-01' } }),
          rawStatus: 'review',
          publish: publish({ exists: true, nonEmpty: true, fields, coverPath: 'assets/cover.png', coverPathExists: true, mediaPath: 'assets/x.mp4', mediaPathExists: true }),
        }),
      ),
      'DOC-13',
    )
    expect(alerts.length).toBe(1)
    expect(alerts[0]!.level).toBe('warn')
  })
})
