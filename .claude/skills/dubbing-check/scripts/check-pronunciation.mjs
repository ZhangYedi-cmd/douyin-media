#!/usr/bin/env node
// [检查点 1.2] 扫文案的多音字 / 文件名 / 大数字 / 单位，输出风险清单（合成前跑）。
// 多音字只是「候选」，要逐个看语境定读音 —— pronunciation_dict 是全局字替换，
// 同字多音并存时必须按段动态注音，别全局一刀切（「执行 xíng」会被 行→háng 误读）。
// 用法：node check-pronunciation.mjs [presentation目录]
import { readFileSync } from "node:fs";
import { join } from "node:path";

const PRES = process.argv[2] || process.cwd();
const segs = JSON.parse(readFileSync(join(PRES, "audio-segments.json"), "utf8"));

// 口播里最常翻车的多音字
const HETERO = "行重长分还差数调为得着卷属划难中乐当朝传度强地便系角率参量曾";

let any = false;
for (const s of segs) {
  const hits = [];
  for (const ch of new Set(s.text.split("").filter((c) => HETERO.includes(c)))) {
    const idx = s.text.indexOf(ch);
    const ctx = s.text.slice(Math.max(0, idx - 3), Math.min(s.text.length, idx + 3));
    hits.push(`多音字「${ch}」(…${ctx}…) — 确认读音`);
  }
  (s.text.match(/[A-Za-z0-9_\-]+\.(ts|tsx|js|mjs|jsx|py|json|sh|md|css|html|go|rs|java|c|cpp)/g) || [])
    .forEach((f) => hits.push(`文件名「${f}」→ 念「${f.split(".")[0]} 点 ${f.split(".").pop()}」`));
  (s.text.match(/\d{3,}/g) || [])
    .forEach((d) => hits.push(`大数字「${d}」→ 可能念成英文串，建议 normalize 成中文`));
  (s.text.match(/\d+\s*(MB|GB|KB|TB|MHz|GHz|ms)/gi) || [])
    .forEach((u) => hits.push(`单位「${u}」→ 全片口径统一`));

  if (hits.length) {
    any = true;
    console.log(`[${s.chapter}/${s.step}] ${s.text}`);
    hits.forEach((h) => console.log(`   • ${h}`));
    console.log();
  }
}
if (!any) console.log("✓ 未扫到明显多音字/念法风险");
console.log(
  "\n处理：多音字→按语境动态注音（先确认无一段同含两种读音）；文件名/大数字/单位→合成时 normalize，" +
  "\n      但字幕/源文案保留原文（query.ts、2043 显示更好看）。",
);
