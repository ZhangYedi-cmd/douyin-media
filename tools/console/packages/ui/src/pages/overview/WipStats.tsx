import { Link } from 'react-router-dom'
import type { MetaStatus } from '@console/core'
import type { WipCounts } from '@console/server/api-types'
import { statusLabel } from '../../components/StatusTag'

// 03 §2.3 ③：在制统计条——7 状态计数 + 在制合计，口径与 P2 分组一致（同一 snapshot 口径）。
export interface WipStatsProps {
  wip: WipCounts
}

// 07-界面用语对照表 §1：中文标签一律取自 StatusTag.tsx 的 statusLabel()，本页不再自维护
// 一份带英文前缀的 map（旧版把 ideated 叫成「已立项」，与 StatusTag 的「已选题」撞成两个词）。
//
// 在制合计口径（对照 overview.html 原文「在制合计（published 不计入）」）：已发布不计入；
// 复盘完成是已发布内容的终态、已否是终止态，同归不计在制（与侧栏 wipTotal 同一口径）。
const WIP_ORDER: MetaStatus[] = ['ideated', 'drafting', 'review', 'approved', 'scheduled']

export function WipStats({ wip }: WipStatsProps) {
  const total = WIP_ORDER.reduce((sum, s) => sum + (wip[s] ?? 0), 0)
  return (
    <section className="card" data-testid="wip-stats">
      <header>
        <h2>在制统计</h2>
      </header>
      <div className="stats">
        {WIP_ORDER.map((s) => (
          <div className="stat" key={s}>
            <div className="v">{wip[s] ?? 0}</div>
            <div className="l">{statusLabel(s)}</div>
          </div>
        ))}
        <div className="stat" style={{ borderLeft: '1px solid var(--border)', paddingLeft: 'var(--space-4)' }}>
          <div className="v">
            {total}
            <small> 条</small>
          </div>
          <div className="l">在制合计（已发布不计入）</div>
        </div>
      </div>
      <p className="muted" style={{ marginTop: 'var(--space-3)', fontSize: 'var(--text-xs)' }}>
        已发布累计 {wip.published ?? 0} · {statusLabel('retro_done')} {wip.retro_done ?? 0} · {statusLabel('rejected')} {wip.rejected ?? 0} ·{' '}
        <Link to="/kanban">打开生产看板 →</Link>
      </p>
    </section>
  )
}
