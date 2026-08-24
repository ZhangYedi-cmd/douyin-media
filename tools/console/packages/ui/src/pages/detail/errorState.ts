// C1（P0）修复：加载详情失败时的文案分类——纯函数，不依赖 React/antd/DOM，供单测覆盖。
// 按本包既有约定（packages/ui/CLAUDE.md「一页一目录」）：页面私有的纯逻辑住同目录 .ts 兄弟文件
// （decisionButtons.ts/todoGroups.ts/kanbanGroups.ts 同款），不与渲染组件混在一个 .tsx 里——
// 本函数原先内联在 index.tsx，2026-08-19 抽出为独立文件（组件渲染不写测试是本包硬约束，混在
// .tsx 里容易让人误以为这里可以测组件）。
//
// 404 是最常见的「backlog 有这个 id，content/ 下没有对应条目」场景，单独给出可操作的下一步；
// 其余状态给通用但仍具体的提示，不把 ApiError.message 原样甩给用户当唯一信息源。
import type { ApiError } from '../../lib/api'

export interface DetailErrorView {
  heading: string
  reasons: string[]
  nextSteps: string[]
}

export function describeDetailError(error: ApiError, slug: string): DetailErrorView {
  if (error.status === 404) {
    return {
      heading: `内容条目不存在：${slug}`,
      reasons: [
        'backlog.yaml 里可能登记了这个 id，但 content/ 目录下没有对应的内容条目（尚未落地成内容，或已被移走）',
        '也可能是链接里的 id 拼错，或用了一个过期/失效的链接',
      ],
      nextSteps: ['返回生产看板，从列表里重新点入正确的内容', '如确认这条内容理应存在，去核对 backlog.yaml 与 content/ 目录下的 id 是否一致'],
    }
  }
  if (error.status === 0) {
    return {
      heading: '无法连接看板服务',
      reasons: ['本机 server（默认 5170 端口）可能没有启动，或请求被网络/代理拦截'],
      nextSteps: ['确认 server 进程是否在跑，刷新本页重试'],
    }
  }
  if (error.status === 401 || error.status === 403) {
    return {
      heading: '鉴权失败，无法读取该内容',
      reasons: [error.message],
      nextSteps: ['用带 token 的链接重新打开（终端跑 tools/console/start.sh status 可拿到）'],
    }
  }
  return {
    heading: `加载详情失败（HTTP ${error.status || '未知状态'}）`,
    reasons: [error.message],
    nextSteps: ['刷新本页重试；持续失败请检查 server 日志'],
  }
}
