import { Collapse } from 'antd'
import type { DailyRun } from '@console/server/api-types'
import { stripPhaseSuffix } from './dailyRunSummary'

// 03 §2.3 ①：今日运行卡——daily-run 当日状态（乙类文件轨迹进度）+ 日志尾部折叠。
// R1（第三波修复，2026-08-19）：正文「日期 · slug」与 summary 之间原来只隔一个全角空格，
// 读起来是一句破句，且 summary 末尾重复的 phaseLabel 与卡片右上角徽标撞车——用
// dailyRunSummary.ts 的 stripPhaseSuffix() 裁掉重复尾巴，再用「：」把 mono 标识块和人话标题
// 分成清楚的两段（见下方渲染）。
export interface DailyRunCardProps {
  dailyRun: DailyRun
  onOpenFile(path: string): void
}

const PHASE_BADGE: Record<DailyRun['phase'], string> = {
  idle: '',
  picked: 'b-accent',
  scripted: 'b-accent',
  dubbing: 'b-accent',
  rendered: 'b-accent',
  review: 'b-warn',
}

export function DailyRunCard({ dailyRun, onOpenFile }: DailyRunCardProps) {
  const badgeClass = PHASE_BADGE[dailyRun.phase] ?? ''
  const title = stripPhaseSuffix(dailyRun.summary, dailyRun.phaseLabel)
  return (
    <section className="card" data-testid="daily-run-card">
      <header>
        <h2>今日运行</h2>
        <span className={`badge ${badgeClass}`.trim()}>
          <i />
          {dailyRun.phaseLabel}
        </span>
        {dailyRun.logPath ? <span className="right mono">{dailyRun.logPath}</span> : null}
      </header>
      <p>
        <b className="mono">
          {dailyRun.date}
          {dailyRun.slug ? ` · ${dailyRun.slug}` : ''}
        </b>
        {title ? `：${title}` : null}
      </p>
      {dailyRun.logTail.length > 0 ? (
        <Collapse
          ghost
          size="small"
          style={{ marginTop: 'var(--space-2)' }}
          items={[
            {
              key: 'log-tail',
              label: '点开看日志尾部',
              children: <pre className="logblock">{dailyRun.logTail.join('\n')}</pre>,
            },
          ]}
        />
      ) : null}
      {dailyRun.evidence.length > 0 ? (
        <p className="muted" style={{ marginTop: 'var(--space-2)', fontSize: 'var(--text-xs)' }}>
          {dailyRun.evidence.map((e) => `${e.phase}:${e.file}@${e.mtime}`).join(' · ')}
        </p>
      ) : null}
      {dailyRun.logPath ? (
        <p style={{ marginTop: 'var(--space-2)' }}>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault()
              onOpenFile(dailyRun.logPath!)
            }}
          >
            看日志全文 →
          </a>
        </p>
      ) : null}
    </section>
  )
}
