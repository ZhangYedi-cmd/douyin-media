import { Link } from 'react-router-dom'
import type { FunnelQuote } from '@console/server/api-types'

// ③ 漏斗归因摘要（03 §2.8）：最近 retro 报告原文块，展示不重算 → 引导去 P5 治理线读整份报告。
export interface FunnelQuotesProps {
  quotes: FunnelQuote[]
}

export function FunnelQuotes({ quotes }: FunnelQuotesProps) {
  return (
    <section className="card">
      <header>
        <h2>漏斗归因摘要</h2>
        <span className="right">最近的复盘报告摘录</span>
      </header>
      {quotes.length === 0 ? (
        <p className="muted">暂无归因摘要（复盘报告还没有可摘录的内容）</p>
      ) : (
        quotes.map((q, i) => (
          <div key={`${q.slug}-${q.window}-${i}`}>
            <p className="eyebrow" style={{ marginBottom: 'var(--space-1)' }}>
              复盘 {q.slug} · {q.window}
            </p>
            <div className="logblock" style={i < quotes.length - 1 ? { marginBottom: 'var(--space-3)' } : undefined}>
              {q.excerpt}
            </div>
          </div>
        ))
      )}
      <p style={{ marginTop: 'var(--space-3)', fontSize: 'var(--text-xs)' }}>
        <Link to="/harness">去治理线读整份报告 →</Link>
      </p>
    </section>
  )
}
