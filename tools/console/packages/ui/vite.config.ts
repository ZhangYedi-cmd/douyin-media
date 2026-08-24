import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 03-前端执行方案.md §2.12：dev proxy 与 SSE 注意点，按拍板要求逐条落地为注释。
export default defineConfig({
  plugins: [react()],
  define: { __BUILD_TIME__: JSON.stringify(new Date().toISOString().slice(0, 16)) },
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5170',
        changeOrigin: true,
        // ── SSE 经 proxy 的三条注意（拍板 §2「关 buffering，留注释」）──
        // 1) 超时置 0：/api/events 是无限长连接，默认 timeout 会掐断后无限重连
        timeout: 0,
        proxyTimeout: 0,
        // 2) dev server 不得加 compression 类中间件（压缩会缓冲 SSE 分块）
        // 3) 响应端 no-buffering 头（Cache-Control: no-cache 等）由 server 侧负责
      },
    },
  },
  build: { outDir: 'dist', sourcemap: false },
})
