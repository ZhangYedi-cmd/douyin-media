import { describe, expect, it } from 'vitest'
import { buildCreateRunSummary, shouldShowCreateAction } from '../../../pages/kanban/createRunSummary'
import type { ContentSummary } from '@console/server/api-types'

describe('shouldShowCreateAction', () => {
  it('只有 ideated（已选题）行返回 true', () => {
    expect(shouldShowCreateAction('ideated')).toBe(true)
  })

  it('其它任何状态都返回 false（不加按钮）', () => {
    const others: ContentSummary['status'][] = [
      'drafting',
      'review',
      'approved',
      'scheduled',
      'published',
      'retro_done',
      'rejected',
    ]
    for (const s of others) {
      expect(shouldShowCreateAction(s)).toBe(false)
    }
  })
})

describe('buildCreateRunSummary', () => {
  it('有标题：view.title 用标题，slug 单独带出', () => {
    const view = buildCreateRunSummary({ slug: 'ep19-open-weight', title: 'EP19：开源权重模型速览' })
    expect(view.title).toBe('EP19：开源权重模型速览')
    expect(view.slug).toBe('ep19-open-weight')
  })

  it('无标题（空串/undefined）：回退用 slug 当标题，不显示空字符串', () => {
    expect(buildCreateRunSummary({ slug: 'ep19', title: '' }).title).toBe('ep19')
    expect(buildCreateRunSummary({ slug: 'ep19' }).title).toBe('ep19')
  })

  it('body 说清三件事：走 pipeline/2-create.md 四件套、耗时可能到一小时、停在待审绝不自动发布', () => {
    const { body } = buildCreateRunSummary({ slug: 'ep19' })
    expect(body).toContain('pipeline/2-create.md')
    expect(body).toContain('一小时')
    expect(body).toContain('待审')
    expect(body).toContain('绝不会自动发布')
  })
})
