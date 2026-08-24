import type { NextPick } from '@console/server/api-types'
import { useAction } from '../../lib/actions'
import { suggestSlug } from './backlogHelpers'
import type { PromoteTarget } from './PromoteDialog'

// 03 §2.6 ②：模拟取题卡——会取谁、为什么（next_up 指针 or score 最高），渲染 media next --json 同一口径
// （S7 验收④）。「按此取题」原设计走 CommandChip(action: promote --auto)，因 promote 需额外收集
// slug（见 PromoteDialog 顶部注释），这里改为先经 onPromote 打开 PromoteDialog，再进入标准动作流。
export interface NextPickCardProps {
  nextPick: NextPick | null
  nextPickError?: string
  nextUpId: string | null
  onPromote(target: PromoteTarget): void
}

export function NextPickCard({ nextPick, nextPickError, nextUpId, onPromote }: NextPickCardProps) {
  const { run } = useAction()

  return (
    <section className="card" style={{ marginBottom: 'var(--space-4)' }} data-testid="next-pick-card">
      <header>
        <h2>模拟取题</h2>
      </header>

      {nextPickError ? (
        <p style={{ color: 'var(--danger)', fontSize: 'var(--text-sm)' }}>取题预演失败：{nextPickError}</p>
      ) : !nextPick ? (
        <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>
          选题池为空，暂无可取题目。
        </p>
      ) : (
        <>
          <p style={{ fontSize: 'var(--text-sm)' }}>
            会取 <b className="mono">{nextPick.id}</b>　<b>{nextPick.title}</b>
            <span className={`badge ${nextPick.viaPointer ? 'b-accent' : ''}`.trim()} style={{ marginLeft: 8 }}>
              <i />
              {nextPick.viaPointer ? '人工指定' : '评分最高'}
            </span>
          </p>
          <p className="muted" style={{ fontSize: 'var(--text-xs)', marginTop: 4, lineHeight: 1.7 }}>
            {nextPick.why}
          </p>
          <div style={{ marginTop: 'var(--space-3)', display: 'flex', gap: 'var(--space-3)', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() =>
                onPromote({ auto: true, label: nextPick.title, suggestedSlug: suggestSlug(nextPick.title, nextPick.id) })
              }
            >
              就取这条
            </button>
            <span className="muted" style={{ fontSize: 'var(--text-xs)' }}>
              想指定其它条目？在下方 idea 池表格展开任意行点「指定为下一条」。
            </span>
          </div>
        </>
      )}

      {nextUpId ? (
        <p className="muted" style={{ marginTop: 'var(--space-3)', fontSize: 'var(--text-xs)' }}>
          当前指针：<code className="mono">{nextUpId}</code>{' '}
          <a onClick={() => void run('next-up', { clear: true }, { title: '取消指定' })} style={{ cursor: 'pointer' }}>
            取消指定
          </a>
        </p>
      ) : null}
    </section>
  )
}
