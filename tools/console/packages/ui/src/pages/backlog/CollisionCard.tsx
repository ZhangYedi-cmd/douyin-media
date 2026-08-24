import type { BacklogCollision } from '@console/server/api-types'

// 03 §2.6 ⑥左：撞题标记——gardener 结论引用，看板只读展示，不合并条目。
export interface CollisionCardProps {
  collisions: BacklogCollision[]
  onOpenFile(path: string): void
}

export function CollisionCard({ collisions, onOpenFile }: CollisionCardProps) {
  return (
    <section className="card" data-testid="collision-card">
      <header>
        <h2>撞题标记</h2>
        <span className="right mono">backlog-gardener 报告结论</span>
      </header>
      {collisions.length === 0 ? (
        <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>
          近期无撞题标记。
        </p>
      ) : (
        collisions.map((c) => (
          <div key={`${c.a}-${c.b}`} style={{ marginBottom: 'var(--space-3)' }}>
            <p style={{ fontSize: 'var(--text-sm)' }}>
              <b className="mono">{c.a}</b> ↔ <b className="mono">{c.b}</b>
              {c.similarity !== null ? `　相似度 ${c.similarity.toFixed(2)}` : ''}
            </p>
            <p className="muted" style={{ fontSize: 'var(--text-xs)', marginTop: 'var(--space-2)', lineHeight: 1.7 }}>
              {c.conclusion || '（报告未给出结论文案）'}{' '}
              <a onClick={() => onOpenFile(c.reportPath)} style={{ cursor: 'pointer' }}>
                查看报告 →
              </a>
            </p>
          </div>
        ))
      )}
      <p className="muted" style={{ fontSize: 11 }}>看板只读展示报告结论，不合并条目。</p>
    </section>
  )
}
