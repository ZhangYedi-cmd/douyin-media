#!/usr/bin/env node
// [检查点 2.3] 死气/停顿：段内 >阈值 的非句读静音。TTS（尤其 MiniMax）在 `「」`引号 /
// `——` / 拟声词处会塞 0.6–1s 死气，听感拖沓（EP02 开头「唰」段 18 字撑 6.78s、含 1s 死气）。
// 这是客观问题，不受 check-pace「英文密集=语速假象」豁免。
// 用法：node check-silence.mjs [presentation目录] [minDeadAir=0.45]
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

const PRES = process.argv[2] || process.cwd();
const MIN = parseFloat(process.argv[3] || "0.45");
const segs = JSON.parse(readFileSync(join(PRES, "audio-segments.json"), "utf8"));

let bad = 0, totalSaved = 0;
for (const s of segs) {
  const mp3 = join(PRES, "public", "audio", s.chapter, `${s.step}.mp3`);
  let dur = 0, log = "";
  try {
    dur = parseFloat(execSync(
      `ffprobe -v error -show_entries format=duration -of default=nk=1:nw=1 "${mp3}"`,
    ).toString());
    log = execSync(`ffmpeg -i "${mp3}" -af silencedetect=noise=-38dB:d=0.3 -f null - 2>&1`,
      { encoding: "utf8" });
  } catch (e) { log = e.stdout ? e.stdout.toString() : ""; }

  // 只看「内部」静音（排除首尾），且超过阈值
  const sil = [...log.matchAll(/silence_start: ([\d.]+)[\s\S]*?silence_end: ([\d.]+)/g)]
    .map((m) => ({ s: +m[1], e: +m[2], d: +m[2] - +m[1] }))
    .filter((x) => x.s > 0.15 && x.e < dur - 0.15 && x.d > MIN);

  if (sil.length) {
    bad++;
    console.log(`✗ ${s.chapter}/${s.step}  ${dur.toFixed(2)}s  「${s.text.slice(0, 24)}」`);
    sil.forEach((x) => { console.log(`     死气 @${x.s.toFixed(2)}s 长 ${x.d.toFixed(2)}s`); totalSaved += x.d - 0.25; });
  }
}

console.log(bad
  ? `\n✗ ${bad} 段有 >${MIN}s 内部死气（去停顿可省 ~${totalSaved.toFixed(1)}s）` +
    `\n  改法：rec/depause.mjs <in.mp3> <out.mp3> 0.25 -38 0.30 ${MIN}（切静音边界不切词、每处留 0.25s），去完重渲染`
  : `\n✓ 无 >${MIN}s 内部死气`);
process.exit(bad ? 1 : 0);
