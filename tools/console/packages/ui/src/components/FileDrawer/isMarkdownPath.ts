// FileDrawer 路由判据：仓内文件只有 markdown（.md/.markdown）才走 MarkdownView 富渲染预览，
// 其余（.yaml/.json/.log/.jsonl/无扩展名……）一律仍走等宽源码呈现——这些是结构化数据或日志，
// 不是"正文"，富渲染反而误导（04-P0 要求）。抽成纯函数便于单测（本包无 jsdom，组件渲染
// 测试不写，见 lib/api.test.ts 顶部说明）。

const MARKDOWN_EXTENSIONS = new Set(['.md', '.markdown'])

export function isMarkdownPath(path: string): boolean {
  const dot = path.lastIndexOf('.')
  const slash = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'))
  if (dot <= slash) return false // 无扩展名，或点号在最后一段路径分隔符之前（如目录名带点）
  return MARKDOWN_EXTENSIONS.has(path.slice(dot).toLowerCase())
}
