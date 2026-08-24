/// <reference types="vite/client" />

// vite.config.ts 的 define.__BUILD_TIME__ 注入的全局常量（03 §2.12）；
// side-foot 用它做「dist 与 src 同步」的可判凭证（S11 验收②）。
declare const __BUILD_TIME__: string
