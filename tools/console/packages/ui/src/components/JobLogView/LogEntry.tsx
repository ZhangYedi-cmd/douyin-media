import { useState } from 'react'
import { Collapse } from 'antd'
import { clockTime } from '../../lib/format'
import { describeToolAction, formatDuration, previewSummary, previewTruncationNote, stallingText } from './jobLogParse'
import type { StepCard, TimelineEntry } from './jobLogParse'
import styles from './JobLogView.module.css'

// L2 步骤流单条渲染。按 entry.kind 分派——除 'step' 外都是很薄的展示，'step'（工具调用配对结果）
// 拆到 StepCardView 单独处理（信息最密，是"全链路"里真正承重的部分）。
export function TimelineEntryView({ entry }: { entry: TimelineEntry }) {
  switch (entry.kind) {
    case 'started':
      return (
        <p className="muted mono" style={{ fontSize: 11 }}>
          会话已启动{entry.at ? ` · ${clockTime(entry.at)}` : ''}
        </p>
      )

    case 'step':
      return <StepCardView step={entry.step} />

    case 'say':
      // 模型的正常叙述，正常显示（任务卡原文）——不折叠、不用等宽字体（中文长段落用等宽字体
      // 反而难读），与折叠起来的 thinking 形成对比。
      return (
        <div className={styles.say}>
          <p className={styles.sayText}>{entry.text}</p>
          {entry.at ? (
            <time className="mono muted" style={{ fontSize: 11 }}>
              {clockTime(entry.at)}
            </time>
          ) : null}
        </div>
      )

    case 'thinking':
      // 默认折叠（用户 2026-08-19 拍板），可展开——antd Collapse 默认 activeKey 为空即折叠。
      // 总指挥实测补充：headless 模式下思考明文恒为空，buildTimeline 已在源头把空文本过滤掉
      // （不产出这类条目），所以这里渲染到的 entry.text 保证非空——没有「点开永远是空」的分支。
      return (
        <Collapse
          ghost
          size="small"
          items={[
            {
              key: 'thinking',
              label: `模型思考（${entry.text.length} 字，默认折叠）`,
              children: <p className={styles.thinkingText}>{entry.text}</p>,
            },
          ]}
        />
      )

    case 'stalling':
      // 显眼但说人话：不用内部名"卡顿中"（listens 像坏了），说清楚具体在等 API 重试还是撞限流。
      return (
        <div className={styles.stalling}>
          <span className="badge b-warn">
            <i />
            {stallingText(entry.reason)}
          </span>
          {entry.at ? (
            <span className="muted mono" style={{ fontSize: 'var(--text-xs)' }}>
              {clockTime(entry.at)}
            </span>
          ) : null}
        </div>
      )

    case 'done':
      return (
        <div className={styles.doneCard}>
          <span className={`badge ${entry.ok ? 'b-success' : 'b-danger'}`}>
            <i />
            {entry.ok ? '任务完成' : '任务失败'}
          </span>
          {typeof entry.costUsd === 'number' ? (
            <span className="muted mono" style={{ fontSize: 'var(--text-xs)' }}>
              成本 ${entry.costUsd.toFixed(4)}
            </span>
          ) : null}
          {typeof entry.turns === 'number' ? (
            <span className="muted mono" style={{ fontSize: 'var(--text-xs)' }}>
              {entry.turns} 轮
            </span>
          ) : null}
          {typeof entry.durationMs === 'number' ? (
            <span className="muted mono" style={{ fontSize: 'var(--text-xs)' }}>
              耗时 {formatDuration(entry.durationMs)}
            </span>
          ) : null}
        </div>
      )
  }
}

function StepCardView({ step }: { step: StepCard }) {
  const [detailExpanded, setDetailExpanded] = useState(false)
  const action = describeToolAction(step.name, step.input)
  const note = previewTruncationNote(step.truncated, step.bytes)
  const statusBadge =
    step.status === 'ok' ? (
      <span className="badge b-success">
        <i />
        成功
      </span>
    ) : step.status === 'failed' ? (
      <span className="badge b-danger">
        <i />
        失败
      </span>
    ) : (
      <span className="badge">
        <i />
        进行中
      </span>
    )

  return (
    <div className={styles.step}>
      <div className={styles.stepHead}>
        {/* 标题是人话动词（+ 原文名字，如"读文件 /a/b.md"），不是 CC 内部工具名——原始工具名
            退到 title 悬停提示，对齐 07-对照表白名单「技术标识只允许出现在…悬停提示」。 */}
        <span className={styles.actionLabel} title={step.name}>
          {action.label}
        </span>
        {statusBadge}
        {step.interrupted ? (
          // interrupted 要显著标出（任务卡原文：命令被打断是排障关键信号）——单独一个警示徽标，
          // 不和「失败」共用一个颜色（失败是工具执行本身出错，interrupted 是被外力打断，原因不同）。
          <span className="badge b-warn">
            <i />
            命令已中断
          </span>
        ) : null}
        {typeof step.durationMs === 'number' ? (
          <span className="muted mono" style={{ fontSize: 11 }}>
            耗时 {formatDuration(step.durationMs)}
          </span>
        ) : null}
      </div>
      {action.detail ? (
        // 命令原文/参数默认单行截断，点击展开看完整内容（避免一条几百字符的 Bash 命令把卡片撑得
        // 很长；命令原文本身不翻译、不改写，07-对照表白名单）。
        <button
          type="button"
          className={styles.detailToggle}
          onClick={() => setDetailExpanded((v) => !v)}
          title={detailExpanded ? '点击收起' : '点击展开完整内容'}
        >
          <code className={detailExpanded ? styles.detailExpanded : styles.detailCollapsed}>{action.detail}</code>
        </button>
      ) : null}
      {step.preview ? (
        // 输出默认折叠（2026-08-19 用户走查反馈：展开态下每步一个 20 行代码块，一条 40 步的任务
        // 能把详情页撑到上万 px）。折叠态摘要仍带字节数，见 previewSummary 的头注释——折叠不等于藏。
        <details className={`fold ${styles.previewFold}`}>
          <summary>{previewSummary(step.bytes, step.truncated)}</summary>
          <pre className={`logblock ${styles.preview}`}>{step.preview}</pre>
          {note ? (
            <p className="muted" style={{ fontSize: 11, marginTop: 'var(--space-1)' }}>
              {note}
            </p>
          ) : null}
        </details>
      ) : null}
    </div>
  )
}
