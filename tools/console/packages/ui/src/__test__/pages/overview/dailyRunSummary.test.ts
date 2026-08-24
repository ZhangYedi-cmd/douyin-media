import { describe, expect, it } from 'vitest'
import { stripPhaseSuffix } from '../../../pages/overview/dailyRunSummary'

describe('stripPhaseSuffix', () => {
  it('裁掉 "标题 —— phaseLabel" 形状末尾重复的 phaseLabel，只留标题', () => {
    const summary = '同一个模型，4 个 CLI coding agent 跑出来差 2 倍——脚手架才是分水岭 —— 口播稿完成'
    expect(stripPhaseSuffix(summary, '口播稿完成')).toBe('同一个模型，4 个 CLI coding agent 跑出来差 2 倍——脚手架才是分水岭')
  })

  it('标题内部自带的「——」不受影响，只裁末尾那一节', () => {
    expect(stripPhaseSuffix('钩子——反转 —— 配音中', '配音中')).toBe('钩子——反转')
  })

  it('summary 不以 phaseLabel 收尾（如 idle 态整句独立说明）时原样返回', () => {
    const idleSummary = '今日尚无已取题的内容目录（daily-run 可能未跑或仍在选题阶段）'
    expect(stripPhaseSuffix(idleSummary, '空闲')).toBe(idleSummary)
  })

  it('phaseLabel 出现在中间但不在结尾时原样返回，不误裁', () => {
    expect(stripPhaseSuffix('口播稿完成之后还有别的话', '口播稿完成')).toBe('口播稿完成之后还有别的话')
  })

  it('phaseLabel 为空字符串时原样返回', () => {
    expect(stripPhaseSuffix('随便一句话', '')).toBe('随便一句话')
  })

  it('裁完标题为空（summary 就是 phaseLabel 本身）时原样返回，不返回空标题', () => {
    expect(stripPhaseSuffix('口播稿完成', '口播稿完成')).toBe('口播稿完成')
  })
})
