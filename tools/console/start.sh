#!/usr/bin/env bash
# 看板 server 启停脚本（02-后端执行方案.md §2.8；骨架照抄 tools/feishu-bot/start.sh 语义）。
# 用法: bash start.sh [start|status|stop|restart]
# 幂等：已在跑就不重复起；status 打印带 token 的访问 URL（喂 G1 健康灯）。
# launchd 常驻启用后（见 com.yedi.douyin-console.plist），本脚本只留 status/stop 应急用——
# RunAtLoad+KeepAlive 接管 start/restart，两边同时 start 会产生两个进程互相打架。
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NODE_BIN="${CONSOLE_NODE_BIN:-node}"
ENTRY="$DIR/packages/server/dist/index.js"
LOG="$DIR/logs/server.log"
TOKEN_FILE="$DIR/.runtime/token"
PORT="${CONSOLE_PORT:-5170}"
# 用绝对路径做进程匹配，避免和其它 node 进程/同名脚本撞在一起（沿 feishu-bot start.sh 同一手法）。
PATTERN="$ENTRY"

mkdir -p "$DIR/logs"

is_running() { pgrep -f "$PATTERN" >/dev/null 2>&1; }

access_url() {
  if [ -f "$TOKEN_FILE" ]; then
    echo "http://127.0.0.1:${PORT}/#token=$(cat "$TOKEN_FILE")"
  else
    echo "http://127.0.0.1:${PORT}/（token 尚未生成，进程启动后自动写入 .runtime/token）"
  fi
}

health_check() {
  if [ -f "$TOKEN_FILE" ]; then
    curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $(cat "$TOKEN_FILE")" \
      "http://127.0.0.1:${PORT}/api/health" 2>/dev/null || echo "000"
  else
    echo "000"
  fi
}

ensure_built() {
  if [ ! -f "$ENTRY" ]; then
    echo "未找到构建产物 ${ENTRY}，先跑一次构建..." >&2
    (cd "$DIR" && npm run build)
  fi
}

case "${1:-start}" in
  status)
    if is_running; then
      code="$(health_check)"
      echo "running (pid $(pgrep -f "$PATTERN" | tr '\n' ' '))；/api/health -> ${code}"
      echo "访问：$(access_url)"
    else
      echo "stopped"
    fi
    ;;
  stop)
    pkill -f "$PATTERN" 2>/dev/null || true
    echo "stopped"
    ;;
  restart)
    pkill -f "$PATTERN" 2>/dev/null || true
    sleep 1
    ensure_built
    cd "$DIR"
    PIPELINE_REPO_ROOT="${PIPELINE_REPO_ROOT:-$(cd "$DIR/../.." && pwd)}" \
      CONSOLE_PORT="$PORT" \
      nohup "$NODE_BIN" "$ENTRY" >> "$LOG" 2>&1 &
    sleep 2
    tail -5 "$LOG"
    echo "访问：$(access_url)"
    ;;
  start)
    if is_running; then
      echo "already running"
      echo "访问：$(access_url)"
      exit 0
    fi
    ensure_built
    cd "$DIR"
    PIPELINE_REPO_ROOT="${PIPELINE_REPO_ROOT:-$(cd "$DIR/../.." && pwd)}" \
      CONSOLE_PORT="$PORT" \
      nohup "$NODE_BIN" "$ENTRY" >> "$LOG" 2>&1 &
    sleep 2
    tail -5 "$LOG"
    echo "访问：$(access_url)"
    ;;
  *)
    echo "用法: bash start.sh [start|status|stop|restart]"
    exit 1
    ;;
esac
