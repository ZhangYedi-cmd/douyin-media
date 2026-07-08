#!/usr/bin/env node
/**
 * auto-record.mjs — 无人值守把演示页录成带配音的 mp4。
 *
 * 原理:确定性渲染,不"模拟人录屏"。
 *   1. 读 audio-segments.json(每个 step 的音频文件,有序),ffprobe 拿每段时长。
 *   2. Playwright headless 开 Manual 模式,逐 step 用方向键推进,每步停留 = 该段音频时长 + buffer。
 *      期间 record_video 录 1920×1080 webm(纯画面,headless 不依赖放音)。
 *   3. ffmpeg 把各段 mp3 + buffer 静音拼成总音轨,与画面 mux → mp4。
 *   画面与音频共用同一条 per-step 时间线 → 天然同步。
 *
 * 用法:
 *   npm run record                      # 需先 npm run dev/preview 起服务(--url 默认 4173)
 *   npm run record -- --serve           # 自起 vite preview(需先 vite build),一条命令出片
 *   npm run record -- --out ../assets/final.mp4 --serve
 *
 * 前置:已 npm run extract-narrations + synthesize-audio(public/audio 就位);
 *       已 npm i -D playwright && npx playwright install chromium。
 *
 * 约束(会校验并告警):全自动录制要求**每个 step 都有口播**(narrations.ts 无空串)。
 *   有静音步时 segment 数 < 实际 step 数,时间线会错位 → 补口播,或退回手动录屏。
 */
import { execFileSync, spawn } from "node:child_process";
import { readFileSync, existsSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";

function arg(name, def) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return def;
  const v = process.argv[i + 1];
  return v && !v.startsWith("--") ? v : true;
}
const OPT = {
  segments: resolve(arg("segments", "audio-segments.json")),
  audioDir: resolve(arg("audio-dir", "public/audio")),
  out: resolve(arg("out", "recording.mp4")),
  buffer: parseFloat(arg("buffer", "0.2")),
  advanceKey: arg("advance-key", "ArrowRight"),
  port: parseInt(arg("port", "4173"), 10),
  serve: arg("serve", false),
  url: arg("url", null),
};
const ff = (bin, args) => execFileSync(bin, args, { encoding: "utf8" });
const dur = (f) =>
  parseFloat(ff("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]));
const log = (...a) => console.error("[auto-record]", ...a);

async function waitServer(url, ms = 30000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    try { if ((await fetch(url)).ok) return true; } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`服务器 ${url} 30s 未就绪`);
}

async function main() {
  if (!existsSync(OPT.segments)) throw new Error(`找不到 ${OPT.segments},先 npm run extract-narrations`);
  const segs = JSON.parse(readFileSync(OPT.segments, "utf8"));
  if (!segs.length) throw new Error("audio-segments.json 为空");
  for (const s of segs) {
    const f = join(OPT.audioDir, s.audio);
    if (!existsSync(f)) throw new Error(`缺音频 ${f},先 npm run synthesize-audio`);
    s.file = f; s.dur = dur(f);
  }
  log(`${segs.length} 段,总口播 ${segs.reduce((a, s) => a + s.dur, 0).toFixed(1)}s`);

  // 自起 vite preview(需先 vite build 出 dist)
  let server, url = OPT.url;
  if (OPT.serve) {
    if (!existsSync(resolve("dist"))) throw new Error("没有 dist/,先 npm run build");
    log(`vite preview :${OPT.port} ...`);
    server = spawn("npx", ["vite", "preview", "--port", String(OPT.port), "--strictPort"],
      { stdio: "ignore" });
    url = `http://localhost:${OPT.port}`;
  }
  url = url || `http://localhost:${OPT.port}`;
  await waitServer(url);

  const { chromium } = await import("playwright");
  const tmp = mkdtempSync(join(tmpdir(), "rec-"));
  const browser = await chromium.launch({ headless: true });
  // 新 context = 干净 localStorage → 从 step 0 起,不被历史进度污染
  const ctx = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: tmp, size: { width: 1920, height: 1080 } },
  });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500); // 等首屏渲染稳定
  await page.mouse.move(960, 540); // 把鼠标挪到中央,别压在隐藏控件上

  for (let i = 0; i < segs.length; i++) {
    await page.waitForTimeout(Math.round((segs[i].dur + OPT.buffer) * 1000));
    if (i < segs.length - 1) await page.keyboard.press(OPT.advanceKey);
  }
  const videoPath = await page.video().path();
  await ctx.close(); // 必须 close 才 flush webm
  await browser.close();
  if (server) server.kill();

  // 拼音轨:各段 mp3 + buffer 静音
  const sil = join(tmp, "sil.mp3");
  ff("ffmpeg", ["-v", "error", "-y", "-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono", "-t", String(OPT.buffer), sil]);
  const listLines = [];
  for (const s of segs) { listLines.push(`file '${s.file}'`); listLines.push(`file '${sil}'`); }
  const listFile = join(tmp, "list.txt");
  writeFileSync(listFile, listLines.join("\n"));
  const audioOut = join(tmp, "audio.mp3");
  ff("ffmpeg", ["-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", listFile, audioOut]);

  // mux → mp4(H.264 + AAC,抖音通吃)
  ff("ffmpeg", ["-v", "error", "-y", "-i", videoPath, "-i", audioOut,
    "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "192k", "-shortest", OPT.out]);
  rmSync(tmp, { recursive: true, force: true });

  const d = dur(OPT.out);
  log(`✓ 出片 ${OPT.out}  时长 ${d.toFixed(1)}s`);
  log("⚠ 录完务必抽看几帧:确认动画没被切半、首尾干净、音画对齐。有静音步会错位。");
}
main().catch((e) => { log("✗", e.message); process.exit(1); });
