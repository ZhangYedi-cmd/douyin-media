// P2 看板纯逻辑：「已选题」行「开始创作」按钮的可见性判定 + 确认弹窗文案构造（2026-08-19 真机
// 走查用户原话「也可以加一个按钮，手动触发整个任务」，截图圈的是 ideated 行）。抽出来单测，
// 不依赖 React 渲染（本包无 jsdom，见 lib/api.test.ts 顶部说明）。风格对照 pages/detail/
// decisionButtons.ts 的 buildPublishSummary：纯函数产判定/视图，组件只管拿去渲染 JSX。
import type { ContentSummary } from '@console/server/api-types'

/** 只有 ideated（已选题）行才有「开始创作」——用户截图圈的就是这一组，其它状态不加（任务卡原文）。 */
export function shouldShowCreateAction(status: ContentSummary['status']): boolean {
  return status === 'ideated'
}

export interface CreateRunSummaryInput {
  slug: string
  title?: string
}

export interface CreateRunSummaryView {
  slug: string
  title: string
  body: string
}

/** 口播四件套（写稿→配音→录屏→封面）耗时可能到一小时，且跑完停在「待审」——这两条是用户点
 * 「开始创作」之前必须知道的（任务卡原文：耗时提示 + 绝不自动发布是项目铁律）。 */
export function buildCreateRunSummary(input: CreateRunSummaryInput): CreateRunSummaryView {
  const title = input.title && input.title.trim() !== '' ? input.title : input.slug
  return {
    slug: input.slug,
    title,
    body:
      '将启动一个后台 Claude Code 进程，按 pipeline/2-create.md 完成口播四件套（写稿 → 配音 → 录屏 → 封面），' +
      '耗时可能到一小时。跑完后停在「待审」等你人审，绝不会自动发布——这是项目铁律。进度可在右下角任务面板查看。',
  }
}
