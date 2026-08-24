import { describe, expect, it } from 'vitest'
import { buildPublishSummary, computeDecisionButtons } from '../../../pages/detail/decisionButtons'
import type { AllowedTransition, ContentCheck } from '@console/server/api-types'

const REVIEW_TRANSITIONS: AllowedTransition[] = [
  { to: 'drafting', action: 'review' },
  { to: 'approved', action: 'review' },
  { to: 'rejected', action: 'review' },
]

describe('computeDecisionButtons', () => {
  it('review 状态：allowedTransitions 全给时渲染 3 个 flip 按钮 + 派发重做任务（03 §2.5 动作矩阵）', () => {
    const buttons = computeDecisionButtons({ status: 'review', allowedTransitions: REVIEW_TRANSITIONS, slug: 'x' })
    expect(buttons).toEqual([
      { kind: 'flip', decision: 'approved', label: '审核通过', requiresReason: false },
      { kind: 'flip', decision: 'rework', label: '打回修改', requiresReason: true },
      { kind: 'flip', decision: 'rejected', label: '否决', requiresReason: true },
      { kind: 'rework-job', label: '派发重做任务' },
    ])
  })

  it('按钮可用性以 allowedTransitions 为准：server 只给 approved 时其余两个 flip 按钮不渲染', () => {
    const buttons = computeDecisionButtons({
      status: 'review',
      allowedTransitions: [{ to: 'approved', action: 'review' }],
      slug: 'x',
    })
    expect(buttons.filter((b) => b.kind === 'flip')).toEqual([
      { kind: 'flip', decision: 'approved', label: '审核通过', requiresReason: false },
    ])
  })

  it('approved 状态：只有确认发布（不依赖 allowedTransitions——那是 publish-done 命令，不走 review flip）', () => {
    const buttons = computeDecisionButtons({ status: 'approved', allowedTransitions: [], slug: 'x' })
    expect(buttons).toEqual([{ kind: 'publish', label: '确认发布' }])
  })

  it('rejected 状态：只有派发重做任务', () => {
    const buttons = computeDecisionButtons({ status: 'rejected', allowedTransitions: [{ to: 'drafting', action: 'review' }], slug: 'x' })
    expect(buttons).toEqual([{ kind: 'rework-job', label: '派发重做任务' }])
  })

  it('drafting 状态：只有派发重做任务', () => {
    const buttons = computeDecisionButtons({ status: 'drafting', allowedTransitions: [{ to: 'review', action: 'review' }], slug: 'x' })
    expect(buttons).toEqual([{ kind: 'rework-job', label: '派发重做任务' }])
  })

  it('published 且缺 publish_url：补作品链接（CommandChip copy 命令带正确 slug）', () => {
    const buttons = computeDecisionButtons({ status: 'published', allowedTransitions: [], publishUrl: null, slug: 'ep-a' })
    expect(buttons).toEqual([{ kind: 'copy-url', label: '补作品链接', command: 'media publish-done ep-a --url <粘贴>' }])
  })

  it('published 且已有 publish_url：无按钮', () => {
    const buttons = computeDecisionButtons({ status: 'published', allowedTransitions: [], publishUrl: 'https://v.douyin.com/x', slug: 'ep-a' })
    expect(buttons).toEqual([])
  })

  it('scheduled 状态：无任何按钮（§2.5 表原文「无动作」）', () => {
    expect(computeDecisionButtons({ status: 'scheduled', allowedTransitions: [], slug: 'x' })).toEqual([])
  })

  it('ideated / retro_done：无按钮（表里未列，零动作是安全默认）', () => {
    expect(computeDecisionButtons({ status: 'ideated', allowedTransitions: [], slug: 'x' })).toEqual([])
    expect(computeDecisionButtons({ status: 'retro_done', allowedTransitions: [], slug: 'x' })).toEqual([])
  })
})

describe('buildPublishSummary（C2 修复：确认发布弹窗摘要）', () => {
  const CHECKS_ALL_READY: ContentCheck[] = [
    { label: '成片', level: 'ok', note: '已出' },
    { label: '封面', level: 'ok', note: '已出' },
    { label: '口播稿', level: 'ok', note: '已出' },
  ]

  it('物料齐全 + 已排期：cover/video 均 ready，scheduleText 带时间', () => {
    const view = buildPublishSummary({ slug: 'ep-a', title: '测试标题', schedule: '2026-08-20 10:00', checks: CHECKS_ALL_READY })
    expect(view).toEqual({
      slug: 'ep-a',
      title: '测试标题',
      scheduleText: '定时发布 · 2026-08-20 10:00',
      cover: { ready: true, note: '已出' },
      video: { ready: true, note: '已出' },
    })
  })

  it('封面/成片未出：note 原样带出、ready 为 false，风险要能看出来', () => {
    const checks: ContentCheck[] = [
      { label: '成片', level: 'warn', note: '未出' },
      { label: '封面', level: 'warn', note: '未出' },
    ]
    const view = buildPublishSummary({ slug: 'ep-b', title: 'B', schedule: null, checks })
    expect(view.cover).toEqual({ ready: false, note: '未出' })
    expect(view.video).toEqual({ ready: false, note: '未出' })
    expect(view.scheduleText).toBe('立即发布（未设置定时）')
  })

  it('checks 里缺「封面」「成片」条目：兜底 ready:false + note:未知，不假装数据存在', () => {
    const view = buildPublishSummary({ slug: 'ep-c', title: 'C', checks: [] })
    expect(view.cover).toEqual({ ready: false, note: '未知' })
    expect(view.video).toEqual({ ready: false, note: '未知' })
  })

  it('标题缺失/空白：兜底「（无标题）」，不让确认弹窗留空', () => {
    expect(buildPublishSummary({ slug: 'ep-d', checks: [] }).title).toBe('（无标题）')
    expect(buildPublishSummary({ slug: 'ep-d', title: '   ', checks: [] }).title).toBe('（无标题）')
  })
})
