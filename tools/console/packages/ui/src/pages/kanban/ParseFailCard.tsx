import styles from './kanban.module.css'

// 03 §2.4：解析失败条目降级卡（虚线边框 + 原文折叠），不吞不崩。
export interface ParseFailCardProps {
  path: string
  raw: string
}

export function ParseFailCard({ path, raw }: ParseFailCardProps) {
  return (
    <div className={styles.parseFail}>
      <p style={{ fontWeight: 600, color: 'var(--muted)', margin: 0 }}>⚠ 这条内容的档案文件解析失败</p>
      <code className="mono" style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
        {path}
      </code>
      <details className="fold" style={{ marginTop: 'var(--space-2)' }}>
        <summary>原文</summary>
        <pre className="logblock">{raw}</pre>
      </details>
    </div>
  )
}
