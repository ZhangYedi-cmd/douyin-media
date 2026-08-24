import { createHashRouter } from 'react-router-dom'
import { AppShell } from './AppShell'
import OverviewPage from '../pages/overview'
import KanbanPage from '../pages/kanban'
import BacklogPage from '../pages/backlog'
import HarnessPage from '../pages/harness'
import MetricsPage from '../pages/metrics'
import DetailPage from '../pages/detail'
import DevPage from '../pages/dev'

// 路由方式 = createHashRouter（03 §2.12）：单端口 serveStatic 下零 SPA fallback 配置，clone 即跑。
// P3 无侧栏导航项，只能从 P1/P2/P4/P5 的行点击进入（03 §2.2）。
// #/dev 是 S3 的临时路由，用来渲染五个跨页组件的 fixture 展示（03 S3 验收①），
// S4 起各页真正建起来后由后续 wave 决定去留。
export const router = createHashRouter([
  {
    element: <AppShell />,
    children: [
      { index: true, element: <OverviewPage /> },
      { path: 'kanban', element: <KanbanPage /> },
      { path: 'backlog', element: <BacklogPage /> },
      { path: 'harness', element: <HarnessPage /> },
      { path: 'metrics', element: <MetricsPage /> },
      { path: 'content/:slug', element: <DetailPage /> },
      { path: 'dev', element: <DevPage /> },
    ],
  },
])
