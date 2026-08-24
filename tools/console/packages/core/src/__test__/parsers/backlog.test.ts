import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import { parseBacklogFile, findTopicNode } from '../../parsers/backlog.js'
import { fixturePath } from '../../../__test__/fixtures.js'

describe('parseBacklogFile', () => {
  const raw = fs.readFileSync(fixturePath('content/_backlog/backlog.yaml'), 'utf8')

  it('全量解析真实 1038 行 backlog.yaml 不抛错，topics 非空', () => {
    const { topics } = parseBacklogFile(raw)
    expect(topics.length).toBeGreaterThan(0)
  })

  it('next_up 为 null 时解析为 null（非字符串 "null"）', () => {
    const { nextUp } = parseBacklogFile(raw)
    expect(nextUp).toBeNull()
  })

  it('已知条目字段齐全（2026-06-14-003，picked 状态）', () => {
    const { topics } = parseBacklogFile(raw)
    const t = topics.find((x) => x.id === '2026-06-14-003')
    expect(t).toBeDefined()
    expect(t!.status).toBe('picked')
    expect(t!.content_path).toBe('content/2026-06-15/open-weight-5')
    expect(t!.track).toBe('traffic')
    expect(t!.format).toBe('tuwen')
    expect(t!.tags).toEqual([])
  })

  it('scores 六维字段能读出（flow map）', () => {
    const { topics } = parseBacklogFile(raw)
    const t = topics.find((x) => x.id === '2026-06-14-001')
    expect(t!.scores).toEqual({ practical: 5, social: 4, emotion: 3, hook: 4, timeliness: 4, trigger: 5 })
  })

  it('findTopicNode 按 id 定位，非按物理下标', () => {
    const { doc } = parseBacklogFile(raw)
    const node = findTopicNode(doc, '2026-06-14-003')
    expect(node).not.toBeNull()
    expect(node!.get('title')).toContain('25 个开源模型')
  })

  it('findTopicNode 查无此 id 返回 null', () => {
    const { doc } = parseBacklogFile(raw)
    expect(findTopicNode(doc, 'not-exist-id')).toBeNull()
  })

  it('损坏的 backlog YAML 抛错', () => {
    expect(() => parseBacklogFile('topics: [unterminated')).toThrow()
  })
})
