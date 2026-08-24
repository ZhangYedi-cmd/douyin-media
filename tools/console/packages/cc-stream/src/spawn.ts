// spawn 助手：拉起无头 `claude -p`，把 stdout 接上 transport+normalize，组合成 HeadlessRun。
// 落地后端拍板 §6 四个防坑点里 cc-stream 分内的两条：env 剔除、参数拼装（allowedTools 白名单本身
// 由调用方传入；授权语义写死在 prompt 里、成败判定读文件状态——那两条是调用方的事，本包不认识）。
import { spawn } from "node:child_process";
import { createWriteStream, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createNormalizer } from "./normalize.js";
import { parseStream } from "./transport.js";
import type { HeadlessRun, HeadlessRunExit, NormEvent, SpawnOptions } from "./types.js";

const DEFAULT_DROP_ENV = ["ANTHROPIC_API_KEY"];
const SIGKILL_GRACE_MS = 10_000;
const STDERR_TAIL_LINES = 50;

export function runHeadlessCC(opts: SpawnOptions): HeadlessRun {
  const dropEnv = new Set(opts.dropEnv ?? DEFAULT_DROP_ENV);
  const env: NodeJS.ProcessEnv = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (dropEnv.has(key)) continue;
    env[key] = value;
  }

  const bin = opts.claudeBin ?? "claude";
  const args = [
    "-p",
    opts.prompt,
    "--output-format",
    "stream-json",
    "--verbose",
    "--allowedTools",
    opts.allowedTools.join(","),
  ];

  const child = spawn(bin, args, {
    cwd: opts.cwd,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  const stderrTail: string[] = [];
  child.stderr?.on("data", (chunk: Buffer) => {
    for (const line of chunk.toString("utf8").split("\n")) {
      if (line.length === 0) continue;
      stderrTail.push(line);
      if (stderrTail.length > STDERR_TAIL_LINES) stderrTail.shift();
    }
  });

  let timeoutHandle: NodeJS.Timeout | undefined;
  let killHandle: NodeJS.Timeout | undefined;
  const clearTimers = () => {
    if (timeoutHandle) clearTimeout(timeoutHandle);
    if (killHandle) clearTimeout(killHandle);
  };

  // 2026-08-19 增补（看板「取消任务」能力，H 号执行）：优雅终止——先发 SIGTERM，10s 宽限期内
  // 子进程没触发 close 就补一记 SIGKILL。原先只有超时路径有这层保障，返回值里暴露给调用方的
  // kill() 此前只发一次 SIGTERM 就撒手不管——子进程若装死（claude -p 卡在某个工具调用时并不
  // 罕见），手动取消会留下没人清理的孤儿进程，这正是看板要补的坑。两条路径（超时自动触发 /
  // 调用方手动 kill()）现在共用同一套宽限逻辑；重复调用幂等（killHandle 已排过不会再排一次）；
  // .unref() 避免这个宽限定时器在子进程已经死了之后还占着不放、拖慢宿主进程退出（含单测环境）。
  function killGracefully(): void {
    child.kill("SIGTERM");
    if (killHandle) return;
    killHandle = setTimeout(() => child.kill("SIGKILL"), SIGKILL_GRACE_MS);
    killHandle.unref?.();
  }

  if (opts.timeoutMs !== undefined) {
    timeoutHandle = setTimeout(killGracefully, opts.timeoutMs);
  }

  // 原始 JSONL 落盘钩子：单条常驻 WriteStream（而非逐行 open+append），
  // 保证落盘顺序与 parseStream 读取顺序一致（并发的逐行 appendFile 不保证顺序）。
  let logStream: ReturnType<typeof createWriteStream> | undefined;
  if (opts.logPath) {
    mkdirSync(dirname(opts.logPath), { recursive: true });
    logStream = createWriteStream(opts.logPath, { flags: "a" });
  }
  const onRaw = logStream ? (line: string) => logStream!.write(line + "\n") : undefined;

  const exit = new Promise<HeadlessRunExit>((resolve) => {
    // exit 只在 logStream 真正 flush 落盘完成后才 resolve——否则调用方以为落盘已完成时
    // 读 logPath 可能读到不完整内容（WriteStream.end() 本身是异步的，需等 finish）。
    const settle = (result: HeadlessRunExit) => {
      if (logStream) logStream.end(() => resolve(result));
      else resolve(result);
    };
    child.on("close", (code, signal) => {
      clearTimers();
      settle({ code, signal, stderrTail: stderrTail.join("\n") });
    });
    child.on("error", (err) => {
      clearTimers();
      stderrTail.push(`spawn error: ${err.message}`);
      settle({ code: null, signal: null, stderrTail: stderrTail.join("\n") });
    });
  });

  async function* eventsGen(): AsyncGenerator<NormEvent> {
    const normalize = createNormalizer();
    // stdio 为 ["ignore","pipe","pipe"] 时 child.stdout 必为非空 Readable。
    for await (const raw of parseStream(child.stdout!, { onRaw })) {
      for (const ev of normalize(raw)) yield ev;
    }
  }

  return {
    events: eventsGen(),
    pid: child.pid ?? -1,
    kill: killGracefully,
    exit,
  };
}
