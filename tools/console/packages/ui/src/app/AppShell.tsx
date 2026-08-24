import { useEffect, useState } from 'react'
import { Badge, Layout, Menu } from 'antd'
import type { MenuProps } from 'antd'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { HealthLights } from '../components/HealthLights'
import { JobPanel } from '../components/JobPanel'
import { usePageData, useReloadAll, useRevision, useSseState } from '../lib/store'
import type { SseState } from '../lib/sse'
import type { OverviewData } from '@console/server/api-types'
import styles from './AppShell.module.css'

// 全局壳（S2 起接数据层）：侧栏 5 项导航 + 顶栏健康灯/SSE 状态/刷新钮（03 §2.2）。
// 计数徽标（警报点/在制数/idea 数/待审提议数）需要 /api/overview 的字段——S4 落地 P1 页时一起接
// （AppShell 独立调一次 usePageData('/api/overview')；03 §2.2 图示的「壳级一次，Context 下发」在
// S1-S3 未搭配套的跨组件缓存/分发基建，本波不为此新增机制，与 P1 页自己的同一路径调用属可接受的
// 轻量重复请求——usePageData 无内建去重，两处各自 fetch，量级对本地单人工具可忽略）。

const SSE_LABEL: Record<SseState, string> = {
  connecting: 'SSE 连接中…',
  open: 'SSE 已连接',
  closed: 'SSE 已断开',
}

const NAV_ITEMS: { path: string; label: string }[] = [
  { path: '/', label: '总览' },
  { path: '/kanban', label: '生产看板' },
  { path: '/backlog', label: '选题池' },
  { path: '/harness', label: '治理线' },
  { path: '/metrics', label: '数据复盘' },
]

/** 在制合计口径（对照 overview.html「在制合计（published 不计入）」）：published/rejected 不计入。 */
function wipTotal(wip: OverviewData['wip'] | undefined): number | undefined {
  if (!wip) return undefined
  return (['ideated', 'drafting', 'review', 'approved', 'scheduled'] as const).reduce((sum, s) => sum + (wip[s] ?? 0), 0)
}

export function navCount(path: string, overview: OverviewData | undefined): number | undefined {
  if (!overview) return undefined
  switch (path) {
    case '/kanban':
      return wipTotal(overview.wip)
    case '/backlog':
      return overview.backlogWater.ideaCount
    case '/harness':
      return overview.harnessToday.pendingProposals
    default:
      return undefined
  }
}

// E2（看板 UX 修复第一波）：侧栏三个数字原先长得一模一样（同一种灰色圆角徽标），但语义完全不同——
// 生产看板/选题池两个是「现状统计」（在制条数、库存量），治理线一个是「要我处理」（待审提议数）。
// 用 path 判定两类语义：'actionable' 只对应治理线，其余带计数的导航项一律 'info'。
export type NavBadgeKind = 'actionable' | 'info'

function navBadgeKind(path: string): NavBadgeKind | undefined {
  switch (path) {
    case '/harness':
      return 'actionable'
    case '/kanban':
    case '/backlog':
      return 'info'
    default:
      return undefined
  }
}

export interface NavBadge {
  count: number
  kind: NavBadgeKind
}

/** 悬停说明：info 类数字弱化呈现后，用 title 补一句「它是什么」（P1 修法原文「更淡的颜色 + 悬停说明」）。 */
export const NAV_INFO_HINT: Record<string, string> = {
  '/kanban': '生产看板在制条数（现状统计，不是待办）',
  '/backlog': '选题池库存量（现状统计，不是待办）',
}

/**
 * 组装徽标语义 + 数值：actionable 类目在计数为 0 时降级成 info 呈现——「0 待审提议」是好消息，
 * 不该继续用警示色报警，避免三个数字里唯一该着急的那个在真没事时还占着醒目样式。
 */
export function navBadge(path: string, overview: OverviewData | undefined): NavBadge | undefined {
  const kind = navBadgeKind(path)
  if (!kind) return undefined
  const count = navCount(path, overview)
  if (count === undefined) return undefined
  return { count, kind: kind === 'actionable' && count === 0 ? 'info' : kind }
}

// E4（看板 UX 修复第一波）：SSE 已实时推送时，「刷新」按钮该降级；断开时才升级成醒目的重连提示。
export type RefreshMode = 'quiet' | 'reconnect'

export function refreshMode(sseState: SseState): RefreshMode {
  return sseState === 'closed' ? 'reconnect' : 'quiet'
}

export function AppShell() {
  const location = useLocation()
  const navigate = useNavigate()
  const selectedKey = NAV_ITEMS.some((item) => item.path === location.pathname) ? location.pathname : '/'

  const onMenuClick: MenuProps['onClick'] = ({ key }) => navigate(key)

  const { data: overview } = usePageData<OverviewData>('/api/overview')
  const hasErrorAlert = overview?.alerts.some((a) => a.level === 'error') ?? false
  const hasWarnAlert = overview?.alerts.some((a) => a.level === 'warn') ?? false

  const menuItems: MenuProps['items'] = NAV_ITEMS.map((item) => {
    const badge = navBadge(item.path, overview)
    const label =
      item.path === '/' && (hasErrorAlert || hasWarnAlert) ? (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          {item.label}
          <Badge status={hasErrorAlert ? 'error' : 'warning'} />
        </span>
      ) : badge ? (
        <span style={{ display: 'flex', alignItems: 'center' }}>
          {item.label}
          {badge.kind === 'actionable' ? (
            // 要我处理：唯一保留警示色的语义，对齐 AlertSection 已有的 badge b-warn 视觉语言
            // （E2：三个数字原先长得一样，无法分辨该着急哪个——只有这一类才配这个颜色）。
            <span className={`badge b-warn ${styles.navBadgeActionable}`} title="待我处理">
              <i />
              {badge.count}
            </span>
          ) : (
            // 纯统计：明显更弱的呈现（去掉边框/底色，只留淡色数字）+ 悬停说明它是什么。
            <span className={styles.navCount} title={NAV_INFO_HINT[item.path]}>
              {badge.count}
            </span>
          )}
        </span>
      ) : (
        item.label
      )
    return { key: item.path, label }
  })

  const revision = useRevision()
  const sseState = useSseState()
  const reloadAll = useReloadAll()
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // 「最近更新时间」= revision 变更时间戳（03 §2.2）：每次全局 revision 前进（含服务端重启后的
  // 回退/归零，同样计一次"变了"）都重记一次本地时刻，不依赖 server 下发的时间字段。
  useEffect(() => {
    setLastUpdated(new Date())
  }, [revision])

  return (
    <Layout className={styles.app}>
      <Layout.Sider width={216} className={styles.sider}>
        <div className={styles.brand}>
          <span className={styles.logo}>PL</span>
          <div className={styles.brandText}>
            <b>Pipeline Console</b>
            <small>抖音自媒体流水线</small>
          </div>
        </div>
        <Menu mode="inline" selectedKeys={[selectedKey]} items={menuItems} onClick={onMenuClick} className={styles.menu} />
        <div className={styles.foot}>localhost:5170 · {__BUILD_TIME__}</div>
      </Layout.Sider>
      <Layout>
        <Layout.Header className={styles.topbar}>
          <HealthLights />
          <div className={styles.topbarRight}>
            <span className="refresh-time mono">
              {SSE_LABEL[sseState]}
              {lastUpdated ? ` · 更新于 ${lastUpdated.toLocaleTimeString('zh-CN', { hour12: false })}` : ''}
            </span>
            <div className="refresh-wrap">
              {refreshMode(sseState) === 'reconnect' ? (
                // SSE 断开：EventSource 断线重连是浏览器内建的（lib/sse.ts connectSse 注释），
                // 但 'closed' 态意味着浏览器已经放弃自动重试——本包白名单内唯一能真正重建 SSE
                // 连接的手段是整页刷新（reloadAll 只重拉分页数据，不接触 SSE 连接本体），
                // 所以这里没有沿用 reloadAll，直接 location.reload()，按钮升级成醒目色。
                <button
                  type="button"
                  className="btn btn-sm btn-danger"
                  onClick={() => window.location.reload()}
                  title="SSE 已断开：点击整页刷新以重建实时连接"
                >
                  <span className="spin">⟳</span> 重新连接
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  onClick={reloadAll}
                  title="手动刷新（兜底；SSE 已连接，常态无需点）"
                  aria-label="手动刷新"
                >
                  <span className="spin">⟳</span>
                </button>
              )}
            </div>
          </div>
        </Layout.Header>
        <Layout.Content className={styles.content}>
          <Outlet />
        </Layout.Content>
      </Layout>
      <JobPanel />
    </Layout>
  )
}
