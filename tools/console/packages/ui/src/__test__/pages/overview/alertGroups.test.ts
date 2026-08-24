import { describe, expect, it } from 'vitest'
import { groupAlerts, isCollapsible, defaultExpanded } from '../../../pages/overview/alertGroups'
import type { Alert } from '@console/core'

function alert(overrides: Partial<Alert> & Pick<Alert, 'rule' | 'level' | 'subject' | 'message'>): Alert {
  return { key: `${overrides.rule}:${overrides.subject}`, ...overrides }
}

describe('groupAlerts', () => {
  it('同类合并：17 条同 rule 的警报合并为一组，count=17，items 保留全部原始条目（含各自 evidencePath）', () => {
    const alerts: Alert[] = Array.from({ length: 17 }, (_, i) =>
      alert({
        rule: 'CHK-05',
        level: 'warn',
        subject: `ep-${i}`,
        message: 'published 无作品链接',
        evidencePath: `content/ep-${i}/meta.yaml`,
      }),
    )
    const groups = groupAlerts(alerts)
    expect(groups).toHaveLength(1)
    expect(groups[0]).toMatchObject({ key: 'CHK-05', level: 'warn', message: 'published 无作品链接', count: 17 })
    expect(groups[0]!.items).toHaveLength(17)
    expect(groups[0]!.items[0]!.evidencePath).toBe('content/ep-0/meta.yaml')
    expect(groups[0]!.items[16]!.evidencePath).toBe('content/ep-16/meta.yaml')
  })

  it('损失分级排序：error 置顶，不同 level 各占一组', () => {
    const alerts: Alert[] = [
      alert({ rule: 'CHK-05', level: 'warn', subject: 'a', message: 'warn 项' }),
      alert({ rule: 'CHK-01', level: 'error', subject: 'b', message: 'error 项' }),
      alert({ rule: 'CHK-07', level: 'info', subject: 'c', message: 'info 项' }),
    ]
    const groups = groupAlerts(alerts)
    expect(groups.map((g) => g.level)).toEqual(['error', 'warn', 'info'])
  })

  it('同 level 内保持原相对顺序（稳定排序，不引入次级排序键）', () => {
    const alerts: Alert[] = [
      alert({ rule: 'CHK-03', level: 'error', subject: 'x', message: '先出现' }),
      alert({ rule: 'CHK-01', level: 'error', subject: 'y', message: '后出现' }),
    ]
    expect(groupAlerts(alerts).map((g) => g.message)).toEqual(['先出现', '后出现'])
  })

  it('不同 rule 各自成组，不误合并', () => {
    const alerts: Alert[] = [
      alert({ rule: 'CHK-04', level: 'warn', subject: 'a', message: 'A' }),
      alert({ rule: 'CHK-05', level: 'warn', subject: 'b', message: 'B' }),
    ]
    expect(groupAlerts(alerts)).toHaveLength(2)
  })

  it('全是阻塞级时：每条不同 rule 的 error 各自成组，互不合并', () => {
    const alerts: Alert[] = [
      alert({ rule: 'CHK-01', level: 'error', subject: 'a', message: '双层不同步' }),
      alert({ rule: 'CHK-02', level: 'error', subject: 'b', message: 'picked 断链' }),
      alert({ rule: 'CHK-03', level: 'error', subject: 'c', message: 'scheduled 超时' }),
    ]
    const groups = groupAlerts(alerts)
    expect(groups).toHaveLength(3)
    expect(groups.every((g) => g.level === 'error')).toBe(true)
  })

  it('空数组返回空数组', () => {
    expect(groupAlerts([])).toEqual([])
  })
})

describe('isCollapsible', () => {
  it('count=1 时不该折叠', () => {
    expect(isCollapsible({ count: 1 })).toBe(false)
  })

  it('count>1 时该折叠', () => {
    expect(isCollapsible({ count: 2 })).toBe(true)
    expect(isCollapsible({ count: 17 })).toBe(true)
  })
})

describe('defaultExpanded', () => {
  it('error 级默认展开', () => {
    expect(defaultExpanded({ level: 'error' })).toBe(true)
  })

  it('warn/info 级默认收起', () => {
    expect(defaultExpanded({ level: 'warn' })).toBe(false)
    expect(defaultExpanded({ level: 'info' })).toBe(false)
  })
})
