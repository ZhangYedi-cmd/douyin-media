import { EventEmitter } from "node:events";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PassThrough } from "node:stream";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const spawnMock = vi.fn();
vi.mock("node:child_process", () => ({
  spawn: (...args: unknown[]) => spawnMock(...args),
}));

const { runHeadlessCC } = await import("../src/spawn.js");

interface FakeChild extends EventEmitter {
  stdout: PassThrough;
  stderr: PassThrough;
  pid: number;
  kill: ReturnType<typeof vi.fn>;
}

/** kill() 立即触发 close（模拟进程乖乖响应 SIGTERM）。 */
function makeCooperativeChild(): FakeChild {
  const child = new EventEmitter() as FakeChild;
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  child.pid = 4242;
  child.kill = vi.fn((signal?: string) => {
    child.emit("close", null, signal ?? "SIGTERM");
    return true;
  });
  return child;
}

/** kill() 只记录调用、不触发任何事件（模拟进程对 SIGTERM 装死，逼引擎升级 SIGKILL）。 */
function makeStubbornChild(): FakeChild {
  const child = new EventEmitter() as FakeChild;
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  child.pid = 4343;
  child.kill = vi.fn();
  return child;
}

let envBackup: NodeJS.ProcessEnv;

beforeEach(() => {
  spawnMock.mockReset();
  envBackup = { ...process.env };
});

afterEach(() => {
  process.env = envBackup;
});

describe("runHeadlessCC：参数拼装与 stdio", () => {
  it("按契约拼装 -p/--output-format/--verbose/--allowedTools，stdio 为 ignore/pipe/pipe", () => {
    const child = makeCooperativeChild();
    spawnMock.mockReturnValue(child);

    runHeadlessCC({ prompt: "do the thing", allowedTools: ["Bash", "Read"], cwd: "/tmp/example" });

    expect(spawnMock).toHaveBeenCalledTimes(1);
    const [bin, args, spawnOpts] = spawnMock.mock.calls[0] as [string, string[], Record<string, unknown>];
    expect(bin).toBe("claude");
    expect(args).toEqual([
      "-p",
      "do the thing",
      "--output-format",
      "stream-json",
      "--verbose",
      "--allowedTools",
      "Bash,Read",
    ]);
    expect(spawnOpts.cwd).toBe("/tmp/example");
    expect(spawnOpts.stdio).toEqual(["ignore", "pipe", "pipe"]);
  });

  it("claudeBin 可覆盖默认二进制路径", () => {
    const child = makeCooperativeChild();
    spawnMock.mockReturnValue(child);
    runHeadlessCC({ prompt: "p", allowedTools: [], cwd: "/tmp", claudeBin: "/opt/bin/claude" });
    const [bin] = spawnMock.mock.calls[0] as [string];
    expect(bin).toBe("/opt/bin/claude");
  });

  it("allowedTools 为空数组时仍传出空字符串（不省略参数）", () => {
    const child = makeCooperativeChild();
    spawnMock.mockReturnValue(child);
    runHeadlessCC({ prompt: "p", allowedTools: [], cwd: "/tmp" });
    const [, args] = spawnMock.mock.calls[0] as [string, string[]];
    expect(args[args.length - 1]).toBe("");
  });
});

describe("runHeadlessCC：env 剔除（后端拍板 §6 坑 1）", () => {
  it("默认剔除 ANTHROPIC_API_KEY，保留其它环境变量", () => {
    const child = makeCooperativeChild();
    spawnMock.mockReturnValue(child);
    process.env.ANTHROPIC_API_KEY = "leaked-oauth-confusion";
    process.env.KEEP_ME = "yes";

    runHeadlessCC({ prompt: "p", allowedTools: [], cwd: "/tmp" });

    const [, , spawnOpts] = spawnMock.mock.calls[0] as [string, string[], { env: NodeJS.ProcessEnv }];
    expect(spawnOpts.env.ANTHROPIC_API_KEY).toBeUndefined();
    expect(spawnOpts.env.KEEP_ME).toBe("yes");
  });

  it("dropEnv 可覆盖默认剔除清单（不与默认清单合并）", () => {
    const child = makeCooperativeChild();
    spawnMock.mockReturnValue(child);
    process.env.ANTHROPIC_API_KEY = "still-here-if-not-dropped";
    process.env.CUSTOM_SECRET = "drop-this-one-instead";

    runHeadlessCC({ prompt: "p", allowedTools: [], cwd: "/tmp", dropEnv: ["CUSTOM_SECRET"] });

    const [, , spawnOpts] = spawnMock.mock.calls[0] as [string, string[], { env: NodeJS.ProcessEnv }];
    expect(spawnOpts.env.CUSTOM_SECRET).toBeUndefined();
    expect(spawnOpts.env.ANTHROPIC_API_KEY).toBe("still-here-if-not-dropped");
  });
});

describe("runHeadlessCC：events 走 transport+normalize", () => {
  it("stdout 喂入 JSONL 后，events 迭代出归一事件", async () => {
    const child = makeCooperativeChild();
    spawnMock.mockReturnValue(child);
    const run = runHeadlessCC({ prompt: "p", allowedTools: ["Bash"], cwd: "/tmp" });

    const collected: unknown[] = [];
    const consuming = (async () => {
      for await (const ev of run.events) collected.push(ev);
    })();

    child.stdout.write(JSON.stringify({ type: "system", subtype: "init", session_id: "s1" }) + "\n");
    child.stdout.write(JSON.stringify({ type: "system", subtype: "hook_started" }) + "\n"); // 噪音，应被吞掉
    child.stdout.end();

    await consuming;
    expect(collected).toEqual([{ kind: "started", sessionId: "s1" }]);
  });

  it("pid 透传自子进程；exit 汇报 code/signal 与 stderr 尾部", async () => {
    const child = makeCooperativeChild();
    spawnMock.mockReturnValue(child);
    const run = runHeadlessCC({ prompt: "p", allowedTools: [], cwd: "/tmp" });
    expect(run.pid).toBe(4242);

    child.stderr.write("line one\n");
    child.stderr.write("line two\n");
    child.stdout.end();
    child.emit("close", 0, null);

    const result = await run.exit;
    expect(result).toEqual({ code: 0, signal: null, stderrTail: "line one\nline two" });
  });

  it("stderr 只保留末 50 行（环形缓冲）", async () => {
    const child = makeCooperativeChild();
    spawnMock.mockReturnValue(child);
    const run = runHeadlessCC({ prompt: "p", allowedTools: [], cwd: "/tmp" });

    for (let i = 0; i < 60; i++) child.stderr.write(`line-${i}\n`);
    child.stdout.end();
    child.emit("close", 1, null);

    const result = await run.exit;
    const lines = result.stderrTail.split("\n");
    expect(lines.length).toBe(50);
    expect(lines[0]).toBe("line-10"); // 前 10 行被挤出环形缓冲
    expect(lines[lines.length - 1]).toBe("line-59");
  });

  it("spawn 触发 error 事件时 exit 以 code:null 收尾，不挂死", async () => {
    const child = makeCooperativeChild();
    spawnMock.mockReturnValue(child);
    const run = runHeadlessCC({ prompt: "p", allowedTools: [], cwd: "/tmp" });
    child.stdout.end();
    child.emit("error", new Error("ENOENT: claude not found"));
    const result = await run.exit;
    expect(result.code).toBeNull();
    expect(result.signal).toBeNull();
    expect(result.stderrTail).toContain("spawn error: ENOENT: claude not found");
  });
});

describe("runHeadlessCC：kill() 与超时升级", () => {
  it("kill() 发送 SIGTERM", () => {
    const child = makeStubbornChild();
    spawnMock.mockReturnValue(child);
    const run = runHeadlessCC({ prompt: "p", allowedTools: [], cwd: "/tmp" });
    run.kill();
    expect(child.kill).toHaveBeenCalledWith("SIGTERM");
  });

  it("超时先 SIGTERM，若进程装死，10s 后再升级 SIGKILL", () => {
    vi.useFakeTimers();
    try {
      const child = makeStubbornChild();
      spawnMock.mockReturnValue(child);
      runHeadlessCC({ prompt: "p", allowedTools: [], cwd: "/tmp", timeoutMs: 1000 });

      expect(child.kill).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1000);
      expect(child.kill).toHaveBeenNthCalledWith(1, "SIGTERM");
      expect(child.kill).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(10_000);
      expect(child.kill).toHaveBeenNthCalledWith(2, "SIGKILL");
      expect(child.kill).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("手动 kill()（看板取消任务用）同样走 SIGTERM→10s 宽限→SIGKILL 升级，不只发一次 SIGTERM", () => {
    vi.useFakeTimers();
    try {
      const child = makeStubbornChild();
      spawnMock.mockReturnValue(child);
      const run = runHeadlessCC({ prompt: "p", allowedTools: [], cwd: "/tmp" });

      run.kill();
      expect(child.kill).toHaveBeenNthCalledWith(1, "SIGTERM");
      expect(child.kill).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(10_000);
      expect(child.kill).toHaveBeenNthCalledWith(2, "SIGKILL");
      expect(child.kill).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("手动 kill() 重复调用幂等：不会重复排一次 10s 宽限计时器（只发多次 SIGTERM，SIGKILL 只补一刀）", () => {
    vi.useFakeTimers();
    try {
      const child = makeStubbornChild();
      spawnMock.mockReturnValue(child);
      const run = runHeadlessCC({ prompt: "p", allowedTools: [], cwd: "/tmp" });

      run.kill();
      run.kill();
      expect(child.kill).toHaveBeenCalledTimes(2); // 两次 SIGTERM，各自来自两次 kill() 调用
      expect(child.kill).toHaveBeenNthCalledWith(1, "SIGTERM");
      expect(child.kill).toHaveBeenNthCalledWith(2, "SIGTERM");

      vi.advanceTimersByTime(10_000);
      expect(child.kill).toHaveBeenCalledTimes(3); // 只多了一次 SIGKILL，不是两次
      expect(child.kill).toHaveBeenNthCalledWith(3, "SIGKILL");
    } finally {
      vi.useRealTimers();
    }
  });

  it("进程在超时窗口内自行结束：不再触发 SIGTERM/SIGKILL", () => {
    vi.useFakeTimers();
    try {
      const child = makeCooperativeChild();
      spawnMock.mockReturnValue(child);
      runHeadlessCC({ prompt: "p", allowedTools: [], cwd: "/tmp", timeoutMs: 1000 });

      child.stdout.end();
      child.emit("close", 0, null); // 提前正常退出，应清掉超时定时器

      vi.advanceTimersByTime(20_000);
      expect(child.kill).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("runHeadlessCC：logPath 原始流落盘", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "cc-stream-test-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("原始 JSONL 按读取顺序原样 append 到 logPath（含中间目录自动创建）", async () => {
    const child = makeCooperativeChild();
    spawnMock.mockReturnValue(child);
    const logPath = join(dir, "nested", "run.jsonl");
    const run = runHeadlessCC({ prompt: "p", allowedTools: [], cwd: "/tmp", logPath });

    const consuming = (async () => {
      const out = [];
      for await (const ev of run.events) out.push(ev);
      return out;
    })();

    const l1 = JSON.stringify({ type: "system", subtype: "init", session_id: "s1" });
    const l2 = JSON.stringify({ type: "system", subtype: "hook_started" }); // 噪音也应原样落盘（排障用）
    child.stdout.write(l1 + "\n" + l2 + "\n");
    child.stdout.end();

    // 先把 events 消费完（onRaw 都已同步写入 logStream 缓冲），再模拟进程真正退出触发 close——
    // 与生产环境时序一致：真实子进程的 close 只会在 stdio 流已被读完后才触发。
    await consuming;
    child.emit("close", 0, null);
    await run.exit;

    expect(existsSync(logPath)).toBe(true);
    const content = readFileSync(logPath, "utf8");
    expect(content).toBe(l1 + "\n" + l2 + "\n");
  });
});
