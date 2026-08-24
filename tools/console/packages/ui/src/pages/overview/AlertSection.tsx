import type { Alert } from '@console/core'
import { AlertCard } from '../../components/AlertCard'
import { groupAlerts, isCollapsible, defaultExpanded } from './alertGroups'
import styles from './overview.module.css'

// 03 §2.3 ②：警报区——渲染 core computeAlerts 输出（S4 验收①：条数与 `media check` 一致，
// 逐条比对 id 即比对 alert.key），分级 danger 置顶。
//
// E1（看板 UX 修复第一波，2026-08-19）：原实现把 alerts 原样逐条平铺——遇到同一规则命中几十条
// （典型如 CHK-05「published 无作品链接」）时警报区被拉成三屏，而右侧「待我处理」经 groupTodos
// 早就把同类合并成一行 ×N，同一份数据两种口径。这里补齐同款分组（alertGroups.ts groupAlerts，
// 判定键与 groupTodos/server alertsToTodos 同源的 rule），偏离 03 原设计「逐条渲染 AlertCard」——
// 只有 count=1 的组仍保持原样单条渲染，count>1 才收进 <details>，展开仍是逐条 AlertCard，
// evidencePath 点击开抽屉的能力原样保留在明细里。
//
// R5（第三波修复，2026-08-19）：分组解决了「同类警报占屏」，但每条警报的正文本身仍是
// core/src/alerts.ts 那份给命令行读者写的技术描述——AlertCard 组件内部已经换了主行文案
// （见 components/AlertCard/ruleTitles.ts），本文件唯一要配合的改动是 summaryAlert 的构造：
// 不再借用 subject 字段搬运原始 message 当聚合标题，AlertCard 会自己按 rule 换算人话标题。
export interface AlertSectionProps {
  alerts: Alert[]
  onOpenFile(path: string): void
}

export function AlertSection({ alerts, onOpenFile }: AlertSectionProps) {
  const groups = groupAlerts(alerts)
  const errorCount = alerts.filter((a) => a.level === 'error').length
  const warnCount = alerts.filter((a) => a.level === 'warn').length

  return (
    <section className="card" data-testid="alert-section">
      <header>
        <h2>警报</h2>
        {errorCount > 0 ? (
          <span className="badge b-danger">
            <i />
            {errorCount} 阻塞
          </span>
        ) : null}
        {warnCount > 0 ? (
          <span className="badge b-warn">
            <i />
            {warnCount} 关注
          </span>
        ) : null}
        <span className="right">与命令行体检结果一致</span>
      </header>
      {groups.length === 0 ? (
        <p className="muted" style={{ fontSize: 'var(--text-xs)' }}>
          暂无警报，一切正常。
        </p>
      ) : (
        <div className={styles.alertList}>
          {groups.map((g) => {
            if (!isCollapsible(g)) {
              // 只有一条同类：不折叠，原样单条渲染（保留证据路径点击）。
              return <AlertCard key={g.key} alert={g.items[0]!} onOpenFile={onOpenFile} />
            }
            // 聚合行复用 AlertCard 本体渲染（色档/×N 后缀/排版与单条完全一致，不必另起一套样式）：
            // 主行由 AlertCard 内部按 rule 换算成人话标题（ruleTitles.ts），这里的 subject 留空
            // （聚合行不对应具体某一条，没有单独的身份标识），message 换成「N 条同类，点开看明细」
            // 的说明行，作为次要行展示——不带 evidencePath/action，证据留给展开后的逐条明细。
            const summaryAlert: Alert = {
              key: `${g.key}:summary`,
              rule: g.key,
              level: g.level,
              subject: '',
              message: `${g.count} 条同类命中，点开查看逐条明细与证据路径`,
              count: g.count,
            }
            return (
              <details key={g.key} open={defaultExpanded(g)}>
                <summary className={styles.alertGroupSummary}>
                  <AlertCard alert={summaryAlert} />
                </summary>
                <div className={styles.alertGroupBody}>
                  {g.items.map((item) => (
                    <AlertCard key={item.key} alert={item} onOpenFile={onOpenFile} />
                  ))}
                </div>
              </details>
            )
          })}
        </div>
      )}
    </section>
  )
}
