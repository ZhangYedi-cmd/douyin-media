#!/usr/bin/env bash
# 课程单篇验收脚本：用法 bash docs/Iterative-spec/0904-AI自媒体课程体系-v3/tools/check-lesson.sh <课程 md 路径> [实操|方法论]
# 输出量化指标 + 事实核对结果。任一 [FAIL] 即不通过。
set -u
f="${1:?用法: check-lesson.sh <md> [实操|方法论]}"
kind="${2:-实操}"
repo="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
fail=0

echo "== 硬禁令（ai-arch-tutorial-style/check_style.py）=="
python3 "$HOME/.claude/skills/ai-arch-tutorial-style/scripts/check_style.py" "$f" | tail -3
python3 "$HOME/.claude/skills/ai-arch-tutorial-style/scripts/check_style.py" "$f" >/dev/null 2>&1 || { echo "[FAIL] 硬禁令未清零"; fail=1; }

echo; echo "== 篇幅 =="
cjk=$(grep -o '[一-龥]' "$f" | wc -l | tr -d ' ')
code=$(awk '/^```/{c=!c; next} c{n++} END{print n+0}' "$f")
blocks=$(grep -c '^```' "$f"); blocks=$((blocks/2))
fix=$(grep -c '多半是' "$f")
if [ "$kind" = "实操" ]; then maxc=5850; maxcode=200; else maxc=5200; maxcode=30; fi  # 2026-09-04 参考值上调 30%，只报数不判
echo "汉字 ${cjk} / 参考值 ${maxc}（只报数不判）；代码行 ${code} / 上限 ${maxcode}；围栏块 ${blocks}；排障句(多半是) ${fix}"
[ "$cjk" -le "$maxc" ] || echo "[INFO] 汉字 ${cjk} 超出参考值 ${maxc}，字数不设限，不算失败"
[ "$code" -le "$maxcode" ] || { echo "[FAIL] 代码行超限"; fail=1; }
if [ "$kind" = "实操" ]; then
  [ "$blocks" -ge 3 ] || { echo "[FAIL] 实操篇 Prompt/命令块少于 3"; fail=1; }
  [ "$fix" -ge 2 ] || { echo "[FAIL] 排障句少于 2"; fail=1; }
fi

echo; echo "== 装腔词表（绝对优先级，命中即 FAIL；代码块内不查）=="
hits=$(awk '/^```/{c=!c; next} !c' "$f" | grep -nE '显然|毫无疑问|不言而喻|其实很简单|这并不难|稍微想想|切记|务必|你必须明白|真正懂|很多人都(做错|不知道|以为)|市面上的教程|我当年|我也是.{0,12}才(明白|懂|发现)|这一句是(关键|全文|骨架)|赋能|抓手|颗粒度|心智|不是[^。！？]{1,30}而是|并非[^。！？]{1,30}而是|与其说|看似[^。！？]{1,20}实则' | cut -c1-120)
if [ -n "$hits" ]; then echo "$hits"; echo "[FAIL] 装腔词命中"; fail=1; else echo "通过"; fi

echo; echo "== 过度自信词表（绝对优先级，命中即 FAIL；代码块内不查）=="
hits=$(awk '/^```/{c=!c; next} !c' "$f" | grep -nE '一定能|一定会|必然|永远(不会|都)|绝对(不|能|可以)|100 ?%|万无一失|彻底解决|完美(解决|适配|运行)|只要[^。！？]{1,20}就(能|可以|不会)|保证(不|能|万)|包治|一劳永逸|从此(不再|告别)|再也不(会|用)' | cut -c1-120)
if [ -n "$hits" ]; then echo "$hits"; echo "[FAIL] 过度自信词命中"; fail=1; else echo "通过"; fi

echo; echo "== 标题模板前缀 =="
grep -nE '^#{1,3} .*(第[一二三四五六七八九十]+步|WHAT|WHY|HOW|原理深挖|跟做)' "$f" && { echo "[FAIL] 标题含模板前缀"; fail=1; } || echo "通过"

echo; echo "== 状态值核对（state.ts）=="
legal=$(grep -oE "^\s{2}[a-z_]+: \{|^\s{4}[a-z_]+: \{" "$repo/tools/console/packages/core/src/state.ts" | grep -oE "[a-z_]+" | sort -u)
used=$(grep -oE '\b(ideated|drafting|review|approved|scheduled|published|rejected|retro_done|idea|picked|expired|archived|drafting_blocked|blocked|pending|failed)\b' "$f" | sort -u)
for s in $used; do
  echo "$legal" | grep -qx "$s" && echo "  ok   $s" || { echo "  [FAIL] 状态值 $s 不在 state.ts"; fail=1; }
done

echo; echo "== 命令与脚本名核对（在 .claude/skills、pipeline、tools、content/*/build/package.json 里 grep）=="
grep -oE 'npm run [a-z:-]+|[a-zA-Z0-9_-]+\.(mjs|sh|ts|py)\b|media [a-z-]+' "$f" | sort -u | while IFS= read -r c; do
  key="${c#npm run }"; key="${key#media }"
  if grep -rqF -- "$key" "$repo/.claude/skills" "$repo/pipeline" "$repo/tools/console/packages" "$repo"/content/*/*/build/package.json 2>/dev/null; then
    echo "  ok   $c"
  else
    echo "  [WARN] 未在仓库找到: $c（人工确认）"
  fi
done

echo; echo "== 百分比与统计数字（每条需在正文就近给出处）=="
grep -nE '[0-9]+(\.[0-9]+)? ?%|成功率|通过率|占比' "$f" | cut -c1-120 || echo "无"

echo; [ $fail -eq 0 ] && echo "RESULT: PASS" || echo "RESULT: FAIL"
exit $fail
