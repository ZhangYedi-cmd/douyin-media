#!/usr/bin/env node
// tts-dub runner —— 把「分段文案 + 配置」合成为「每段 mp3」。provider-agnostic。
//
// 用法：
//   node synthesize.mjs [--config tts.config.json] [--segments segments.json]
//                       [--out DIR] [--force] [--only id1,id2]
//
// segments.json：[{ "id": "...", "text": "..." }]
//   兼容 web-video-presentation 的 audio-segments.json（{chapter,step,text} → id = "chapter/step"）。
// 输出：<outDir>/<id>.mp3（id 里的 "/" 当目录）。
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const flag = (n) => process.argv.includes(`--${n}`);
const opt = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : d; };

const cfg = JSON.parse(readFileSync(opt("config", "tts.config.json"), "utf8"));
const segs = JSON.parse(readFileSync(opt("segments", "audio-segments.json"), "utf8"));
const outDir = opt("out", cfg.outDir || "public/audio");
const force = flag("force");
const only = opt("only", "") ? new Set(opt("only", "").split(",")) : null;

const provider = await import(`./providers/${cfg.provider || "minimax"}.mjs`);

const applyNormalize = (text, rules) => {
  let t = text;
  for (const [from, to] of rules || []) t = t.split(from).join(to);
  return t;
};
const idOf = (seg, i) =>
  seg.id ?? (seg.chapter != null && seg.step != null ? `${seg.chapter}/${seg.step}` : String(i));

let ok = 0, skip = 0, fail = 0;
for (let i = 0; i < segs.length; i++) {
  const seg = segs[i];
  const id = idOf(seg, i);
  if (only && !only.has(id)) continue;
  const out = join(outDir, `${id}.mp3`);
  if (existsSync(out) && !force) { skip++; console.log(`[skip] ${id}`); continue; }

  const ov = (cfg.overrides && cfg.overrides[id]) || {}; // per-段覆盖
  const opts = {
    text: applyNormalize(seg.text, cfg.normalize),       // 念法规整（只改配音）
    voiceId: ov.voice_id ?? cfg.voice_id,
    speed: ov.speed ?? cfg.speed ?? 1.0,
    pitch: ov.pitch ?? cfg.pitch ?? 0,
    pronunciation: ov.pronunciation ?? cfg.pronunciation ?? [], // 同字多音→逐段覆盖
    model: cfg.model,
  };
  try {
    const buf = await provider.synthesize(opts); // provider 内含重试
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, buf);
    ok++; console.log(`[ok]   ${id}  (${(buf.length / 1024).toFixed(0)}KB)`);
  } catch (e) {
    fail++; console.error(`[FAIL] ${id}: ${e.message}`);
  }
}
console.log(`\n✓ done — ${ok} synthesized, ${skip} skipped, ${fail} failed (provider=${cfg.provider || "minimax"})`);
process.exit(fail ? 2 : 0);
