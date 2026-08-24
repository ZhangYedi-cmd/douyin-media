import { useState } from 'react'
import type { ComponentPropsWithoutRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import styles from './MarkdownView.module.css'

// 跨页复用组件（03-前端执行方案.md §7 约定 1「跨页复用满 2 处才升 components/」，本组件
// 服务口播稿 ArtifactTabs / 治理报告 ReportReader / 仓内文件 FileDrawer 三处，满足门槛）。
//
// 背景：FileDrawer.tsx 原顶部注释「不做 markdown 富渲染（03 §4-Q4，已拍板不引 markdown 库）」
// 已被用户在 2026-08-19 推翻——真机走查发现口播稿/治理报告是这个台子最高频的阅读路径，
// 全部以裸 `#`/`>`/`**`/`---` 源码呈现，可读性差。改用 react-markdown + remark-gfm 渲染，
// 依赖登记见 docs/Iterative-spec/0818-看板工作台/2026-08-18-看板前端技术方案.md §1。
//
// 安全：不引入 rehype-raw（默认不解析/注入原始 HTML，markdown 源里的裸 HTML 标签原样转义
// 成文本展示）——这些文件虽来自本地仓库，仍不给 XSS 留口子。

export type MarkdownViewMode = 'preview' | 'source'

export interface MarkdownViewProps {
  /** 原始 markdown 文本（未加载完成前由调用方自行显示 loading/error，不传空字符串占位） */
  text: string
  /**
   * 正文密排尺度：'sm' 对齐既有 `.reader .doc`（治理报告/仓内文件，text-sm/1.7）；
   * 'base' 对齐原型 `.script-doc`（口播稿，text-base/1.9，字号更大更松，适合长段落朗读稿）。
   * 默认 'sm'。
   */
  size?: 'sm' | 'base'
  /** 外层容器附加类名，供调用方接上页面自身的间距/卡片上下文 */
  className?: string
  /** 初始显示模式，默认 'preview'；核对原文时可切到 'source' 看等宽源码 */
  defaultMode?: MarkdownViewMode
}

type TableProps = ComponentPropsWithoutRef<'table'>

// GFM 表格默认会撑破容器宽度——包一层横向滚动容器，容器本身不裁切页面（04-P0 要求）。
function TableWithScroll({ children, ...props }: TableProps) {
  return (
    <div className={styles.tableWrap}>
      <table {...props}>{children}</table>
    </div>
  )
}

export function MarkdownView({ text, size = 'sm', className, defaultMode = 'preview' }: MarkdownViewProps) {
  const [mode, setMode] = useState<MarkdownViewMode>(defaultMode)
  const rootClass = className ? `${styles.root} ${className}` : styles.root
  const bodyClass = size === 'base' ? `${styles.body} ${styles.bodyBase}` : `${styles.body} ${styles.bodySm}`

  return (
    <div className={rootClass} data-testid="markdown-view">
      <div className={styles.toggle} role="tablist" aria-label="markdown 显示模式">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'preview'}
          className={mode === 'preview' ? styles.toggleBtnOn : styles.toggleBtn}
          onClick={() => setMode('preview')}
        >
          预览
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'source'}
          className={mode === 'source' ? styles.toggleBtnOn : styles.toggleBtn}
          onClick={() => setMode('source')}
        >
          源码
        </button>
      </div>
      {mode === 'preview' ? (
        <div className={bodyClass}>
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ table: TableWithScroll }}>
            {text}
          </ReactMarkdown>
        </div>
      ) : (
        <pre className="logblock">{text}</pre>
      )}
    </div>
  )
}
