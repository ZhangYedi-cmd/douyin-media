import { useEffect, useState } from 'react'
import { usePageData, useSseState } from '../../lib/store'
// 契约路径 '@console/server/api-types' 在 ui 侧不可解析，改用真实产物路径（详见 lib/api.ts 顶部说明）。
import type { HealthData } from '@console/server/api-types'
import { lightValueText } from './lightValue'
import styles from './HealthLights.module.css'

// 03 §2.2 顶栏「健康灯」：自绘 token 圆点 + Tooltip，原样复用 docs/design/ v2 原型
// overview.html 的 `.lights`/`.light`/`.light.ok|warn|bad` 结构与 theme.css 既有规则（AI 约定 3：
// 色值只引 token；此处连类名都直接复用原型，未新增样式文件）。
//
// E3（看板 UX 修复第一波，2026-08-19）：原设计只有词 + 色点，正常态下四个绿点纯装饰，具体数值
// （最近构建耗时/队列长度/最近文件事件）全部埋在 hover 才看得到的 tip 里。这里在灯的文字后面
// 直接把关键数值显示出来，偏离 03 原设计与本组件顶部这条旧注释「未新增样式文件」——数值排版 +
// 窄视口收起需要专门的样式，新增 HealthLights.module.css 承载（理由见该文件顶部注释）。
//
// 灯的种类由 02 定（GET /api/health 的 lights[]），本组件负责：① 渲染 + 数值文案（lightValue.ts）；
// ② 一条通用降级规则：SSE 断开时整组降级为「离线」灰——因为一旦 SSE 断了，/api/health 也大概率
// 拿不到最新数据，继续显示上一次成功响应的数值/ok 颜色会误导成"一切正常"，这里显式用 sseState 覆盖，
// 离线态下数值一并隐藏（避免展示可能已过期的数字）。
export function HealthLights() {
  const { data } = usePageData<HealthData>('/api/health')
  const offline = useSseState() !== 'open'
  const [now, setNow] = useState(() => new Date())

  // 相对时间文案（「N 分钟前」）需要跟着挂钟走，否则挂载后文案就定住不再变——每分钟重算一次即可，
  // 跟 DeadlineBadge 的 60s tick 同一惯例。
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(timer)
  }, [])

  if (!data) {
    // 首拉前（Skeleton 态）：不渲染任何灯，避免闪一次错误颜色。
    return <div className="lights" aria-hidden="true" />
  }

  return (
    <div className="lights">
      {data.lights.map((light) =>
        offline ? (
          <span key={light.id} className="light" data-tip="SSE 已断开 · 灯态可能非最新">
            <i style={{ background: 'var(--muted)' }} />
            {light.label}
          </span>
        ) : (
          <span key={light.id} className={`light ${light.level}`} data-tip={light.tip}>
            <i />
            {light.label}
            <b className={styles.value}>{lightValueText(light.id, data, now)}</b>
          </span>
        ),
      )}
    </div>
  )
}
