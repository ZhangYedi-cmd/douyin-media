#!/usr/bin/env bash
set -e
REPO_ROOT="/Users/yedi/douyin-media"
cd "$REPO_ROOT"

LESSONS=(
  "05-ffmpeg音频体检脚本"
  "06-质检Agent设计与裁判解耦"
  "07-自愈机制与3轮熔断"
)

for item in "${LESSONS[@]}"; do
  echo "========================================================"
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] 开始生成: ${item}"
  echo "========================================================"

  PROMPT="请使用 /ai-arch-tutorial-style 技能规范，阅读 docs/Iterative-spec/0901-AI自媒体课程体系/course-item-plan/${item}.md 中的大纲、目标与知识点，结合本仓库（pipeline/、harness/、brain/、tools/、docs/）中的真实代码和工程实践，撰写结构严谨、内容详实、深度展开的教程正文，直接写入 courses/${item}.md。

核心要求：
1. 语言风格：严格遵守工程教程体规范（平和白话、解释机理、为什么先于怎么做、每个关键点带具体命令/代码/路径、不设字数上限、干货充分展开）。
2. 去AI味与硬禁令：只用标准中文标点，严禁「」『』、破折号、星号、emoji；严禁“不是...而是...”转折句式；严禁“全面提升、赋能、抓手”等空洞词汇；严禁金句化与自吹自擂。
3. 产物直接写入 courses/${item}.md。"

  claude -p "$PROMPT"

  echo "========================================================"
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] 完成生成: ${item}"
  echo "========================================================"
done
