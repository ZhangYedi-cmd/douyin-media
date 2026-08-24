import { describe, expect, it } from 'vitest'
import { ALERT_RULE_TITLES, resolveAlertHeadline } from '../../../components/AlertCard/ruleTitles'

describe('resolveAlertHeadline', () => {
  it('已登记的 rule 返回人话标题，hasMappedTitle=true', () => {
    const headline = resolveAlertHeadline('CHK-05', 'published 无作品链接')
    expect(headline).toEqual({ title: '已发布但没回填作品链接', hasMappedTitle: true })
  })

  it('未知 rule（边界）：回退显示原始 message，不因漏配丢信息，hasMappedTitle=false', () => {
    const headline = resolveAlertHeadline('CHK-99', '某条未登记的技术描述')
    expect(headline).toEqual({ title: '某条未登记的技术描述', hasMappedTitle: false })
  })

  it('core/src/alerts.ts 当前 8 条规则（CHK-01~CHK-08）全部登记了人话标题', () => {
    for (let i = 1; i <= 8; i++) {
      const rule = `CHK-0${i}`
      expect(ALERT_RULE_TITLES[rule], `${rule} 应有人话标题`).toBeTruthy()
    }
  })

  it('CHK-01（双层不同步，三种 message 变体共用同一 rule）都映射到同一条人话标题', () => {
    const variants = [
      'meta.status=published 但 backlog 查无对应条目（source=空）',
      'meta.status=published 但 backlog(2026-06-15-003).status=idea（双层不同步）',
      'backlog.status=published 但对应内容 meta 未达 published（找不到对应 content 条目）',
    ]
    const titles = new Set(variants.map((m) => resolveAlertHeadline('CHK-01', m).title))
    expect(titles.size).toBe(1)
    expect([...titles][0]).toBe('选题池与内容目录对不上')
  })
})
