import type { RetroMatrixRow } from '@console/server/api-types'

// 03 §2.7 ⑤：复盘窗口矩阵——published × 24h/72h/7d，✓/✗漏跑/待。对照 docs/design/harness.html .mx 表。
export interface RetroMatrixProps {
  rows: RetroMatrixRow[]
}

const WINDOW_LABEL: Record<'ok' | 'miss' | 'pending', string> = { ok: '✓', miss: '✗ 漏跑', pending: '待' }
const WINDOW_CLASS: Record<'ok' | 'miss' | 'pending', string> = { ok: 'ok', miss: 'miss', pending: 'pend' }

export function RetroMatrix({ rows }: RetroMatrixProps) {
  return (
    <section className="card" data-testid="retro-matrix">
      <header>
        <h2>复盘窗口追踪</h2>
        <span className="right">已发布 × 24h / 72h / 7d</span>
      </header>
      {rows.length === 0 ? (
        <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>
          暂无已发布内容，矩阵为空。
        </p>
      ) : (
        <table className="mx" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>内容</th>
              <th>发布</th>
              <th>24h</th>
              <th>72h</th>
              <th>7d</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.slug}>
                <td>{r.title}</td>
                <td>{r.publishedAt ? r.publishedAt.slice(0, 10) : '—'}</td>
                {(['24h', '72h', '7d'] as const).map((w) => (
                  <td className={WINDOW_CLASS[r.windows[w]]} key={w}>
                    {WINDOW_LABEL[r.windows[w]]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="muted" style={{ marginTop: 'var(--space-2)', fontSize: 11 }}>
        ✗ = 该窗口还没有复盘记录
      </p>
    </section>
  )
}
