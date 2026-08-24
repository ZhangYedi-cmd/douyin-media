#!/usr/bin/env bash
# 采集 cc-stream 的新版本 fixture。
#
# 用途：每次本机 Claude Code 客户端升级版本后跑一次，产出一份新的真实
# `claude -p --output-format stream-json --verbose` 输出样本，供 test/normalize.test.ts
# 的宽断言（全部 fixture）与精确快照断言（最新 fixture）使用。约定详见 ../fixtures/README.md。
#
# 本脚本不在本次交付里被真实执行（成本与环境原因），产出物先只是"写好、可用"，
# 首次真实运行属人工验收项。
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PKG_DIR="$(cd "$HERE/.." && pwd)"
FIXTURES_DIR="$PKG_DIR/fixtures"
mkdir -p "$FIXTURES_DIR"

CLAUDE_BIN="${CLAUDE_BIN:-claude}"

if ! command -v "$CLAUDE_BIN" >/dev/null 2>&1; then
  echo "找不到 claude CLI（\$CLAUDE_BIN=$CLAUDE_BIN）。请确认已安装并登录，或设置 CLAUDE_BIN 指向可执行文件。" >&2
  exit 1
fi

RAW_VERSION="$("$CLAUDE_BIN" --version 2>/dev/null || true)"
VERSION="$(printf '%s' "$RAW_VERSION" | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -n1)"
if [ -z "$VERSION" ]; then
  echo "解析不出 claude 版本号（原始输出：${RAW_VERSION}），fixture 命名会退化为 unknown。" >&2
  VERSION="unknown"
fi

DATE="$(date +%F)"
OUT="$FIXTURES_DIR/${DATE}-claude-${VERSION}.jsonl"

if [ -e "$OUT" ]; then
  echo "今天已经采过同版本的 fixture：${OUT}（如需覆盖请先手动删除）。" >&2
  exit 1
fi

# 固定探测 prompt：读一个文件 + 跑一条 echo + 正常收尾（后端拍板 §7.5 / 02 §2.7）。
# 只用来触发一次完整的 started→tool→toolDone→say→done 事件序列，不涉及任何业务动作。
PROMPT='读一下当前目录下的 package.json（如果不存在就直接说不存在，别报错），然后执行一条命令 `echo hello-from-subprocess`，做完这两步后直接说"done"收尾。不要问我确认、不要做任何其它事情。'

echo "采集探测：claude 版本 = ${VERSION}"
echo "输出 -> ${OUT}"

"$CLAUDE_BIN" -p "$PROMPT" \
  --output-format stream-json \
  --verbose \
  --allowedTools "Bash,Read" \
  > "$OUT"

echo "完成。"
echo "下一步（fixtures/README.md 的重采集约定）："
echo "  1) 核对 ${OUT}：是否引入了归一层宽断言容不下的新事件类型（先跑一次 npm test 看宽断言是否变红）。"
echo "  2) 若发现敏感信息（尤其是本机绝对路径里携带的内部标识关键词），先脱敏再入库——见 fixtures/README.md 与仓库根 05 §3 红线 9。"
echo "  3) 在 fixtures/README.md 的表格里追加一行（文件名 / 采集日期 / claude 版本 / 备注）。"
