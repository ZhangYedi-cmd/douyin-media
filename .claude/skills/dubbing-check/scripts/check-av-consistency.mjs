#!/usr/bin/env node
// [检查点 3.1] 揪「组件硬编码文案 vs narration 不一致」：改了 narration（配音+字幕）
// 但忘了改组件 .tsx 里写死的大字（如 ending CTA）→ 音频念新文案、画面还是旧字。
// 用法：node check-av-consistency.mjs [presentation目录]
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const PRES = process.argv[2] || process.cwd();
const CH = join(PRES, "src", "chapters");
if (!existsSync(CH)) { console.error("✗ 找不到 src/chapters，确认在 presentation 目录"); process.exit(1); }

const dirs = readdirSync(CH).filter((d) => existsSync(join(CH, d, "narrations.ts")));
console.log("逐章对照：组件 .tsx 里硬编码的中文长句  vs  narration\n");

for (const d of dirs) {
  const tsx = readdirSync(join(CH, d)).find((f) => f.endsWith(".tsx"));
  if (!tsx) continue;
  const code = readFileSync(join(CH, d, tsx), "utf8");

  // 提取组件 JSX 里逐字呈现的中文长句（≥6 字连续中文，排除注释/属性/逻辑行）
  const hard = [];
  code.split("\n").forEach((ln, i) => {
    const t = ln.trim();
    if (t.startsWith("//") || t.startsWith("*") || /className|import |const |=>|console\./.test(ln)) return;
    const phrases = ln.match(/[一-龥][一-龥，。？！、,.!?…：；]{5,}/g);
    if (phrases) phrases.forEach((p) => hard.push({ line: i + 1, txt: p }));
  });

  console.log(`── ${d} ──`);
  if (hard.length) {
    console.log("  组件硬编码长句（核对是否与对应 step 的 narration 一致）：");
    hard.forEach((h) => console.log(`   L${h.line}: ${h.txt}`));
  } else {
    console.log("  ✓ 无硬编码中文长句（视觉应为抽象图/关键词，改 narration 不影响）");
  }
  console.log();
}
console.log(
  "人工判定：组件里逐字呈现的 CTA / 标题 必须和 narration 一致；" +
  "\n概念关键词标签（如「续命点」「QueryEngine」架构图）与整句是「词 vs 句」关系，不算冲突。",
);
