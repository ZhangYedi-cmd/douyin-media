import { CommandChip } from '../../components/CommandChip'

// 03 §2.6 ⑥右：清扫入口——不进动作白名单（03 §4-Q3 已拍板），只 CommandChip copy 形态。
export function SweepCard() {
  return (
    <section className="card" data-testid="sweep-card">
      <header>
        <h2>清扫入口</h2>
        <span className="right">清扫由养护任务执行，本页只做标记</span>
      </header>
      <p className="muted" style={{ fontSize: 'var(--text-xs)', marginBottom: 'var(--space-2)' }}>
        过期/低分条目的清扫需要人工复核，未进动作白名单——复制命令去终端跑，仅复制不执行。
      </p>
      <CommandChip command="media backlog sweep --dry-run" />
    </section>
  )
}
