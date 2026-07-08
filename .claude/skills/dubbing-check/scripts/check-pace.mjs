#!/usr/bin/env node
// [检查点 2.2] 语速离群：算每段「剔除停顿后的纯发音语速」（音节/秒），标过快/过慢。
// 字面语速会被停顿数量误导，必须剔停顿；含英文词的段字面偏慢多是统计假象，要区分。
// 用法：node check-pace.mjs [presentation目录]
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

const PRES = process.argv[2] || process.cwd();
const segs = JSON.parse(readFileSync(join(PRES, "audio-segments.json"), "utf8"));

const syl = (t) => {
  const zh = (t.match(/[一-龥]/g) || []).length;
  const dig = (t.match(/[0-9]/g) || []).length;
  const en = (t.match(/[A-Za-z]+/g) || []).length;
  return zh + dig + en * 1.3; // 英文词≈1.3 音节粗估
};
const puncts = (t) => (t.match(/[，。！？、：；,.!?:;…]/g) || []).length;

const rows = segs.map((s) => {
  const mp3 = join(PRES, "public", "audio", s.chapter, `${s.step}.mp3`);
  let d = 0;
  try {
    d = parseFloat(execSync(
      `ffprobe -v error -show_entries format=duration -of default=nk=1:nw=1 "${mp3}"`,
    ).toString());
  } catch (e) { /* */ }
  const n = syl(s.text);
  const speak = Math.max(0.3, d - puncts(s.text) * 0.3); // 剔停顿（每标点≈0.3s）
  const enWords = (s.text.match(/[A-Za-z]{3,}/g) || []).length;
  return { cs: `${s.chapter}/${s.step}`, rate: +(n / speak).toFixed(2), d: +d.toFixed(2), enWords, text: s.text };
});

const rates = rows.map((r) => r.rate);
const mean = rates.reduce((a, b) => a + b, 0) / rates.length;
const sd = Math.sqrt(rates.reduce((a, b) => a + (b - mean) ** 2, 0) / rates.length);
console.log(`纯发音语速 均值 ${mean.toFixed(2)} 音节/秒  标准差 ${sd.toFixed(2)}（正常区间约 4.5-6.5）\n`);
console.log("段              语速   标记            文本");
for (const r of rows) {
  let flag = "";
  if (r.rate > mean + 1.3 * sd) flag = "⚡偏快→拆句加字";
  else if (r.rate < mean - 1.3 * sd) flag = r.enWords >= 1 ? "(英文密集·假象,别提速)" : "🐢偏慢→单独提 speed";
  console.log(`${r.cs.padEnd(15)} ${String(r.rate).padEnd(6)} ${flag.padEnd(18)} ${r.text.slice(0, 22)}`);
}
console.log(`\n偏快→文案拆句（顺带改措辞）；偏慢→rec/segment-overrides.json 给该段单独提 speed。`);
