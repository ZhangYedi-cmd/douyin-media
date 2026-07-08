#!/usr/bin/env bash
# 启动飞书长连接 server（幂等：已在跑就不重复起）
# 用法: bash start.sh [status|stop|restart]
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PY="$DIR/.venv/bin/python"
LOG="/tmp/douyin-feishu-server.log"
# 用绝对路径做进程匹配，避免和 xhs 的 feishu-bot/server.py 撞名
PATTERN="$DIR/server.py"

is_running() { pgrep -f "$PATTERN" >/dev/null 2>&1; }

case "${1:-start}" in
  status)
    if is_running; then echo "running (pid $(pgrep -f "$PATTERN" | tr '\n' ' '))"; else echo "stopped"; fi
    ;;
  stop)
    pkill -f "$PATTERN" 2>/dev/null || true
    echo "stopped"
    ;;
  restart)
    pkill -f "$PATTERN" 2>/dev/null || true; sleep 1
    nohup "$PY" -u "$DIR/server.py" > "$LOG" 2>&1 &
    sleep 4; tail -2 "$LOG"
    ;;
  start)
    if is_running; then echo "already running"; exit 0; fi
    nohup "$PY" -u "$DIR/server.py" > "$LOG" 2>&1 &
    sleep 4; tail -2 "$LOG"
    ;;
  *)
    echo "用法: bash start.sh [start|status|stop|restart]"; exit 1
    ;;
esac
