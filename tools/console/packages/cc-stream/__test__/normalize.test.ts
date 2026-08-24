import { describe, expect, it } from "vitest";
import { createNormalizer } from "../src/normalize.js";
import { parseStream } from "../src/transport.js";
import type { NormEvent, RawEvent } from "../src/types.js";
import {
  chunkText,
  chunkTextIrregular,
  latestFixture,
  listFixtures,
  readFixtureText,
  streamFromChunks,
} from "./helpers.js";

async function replay(chunks: Buffer[]): Promise<NormEvent[]> {
  const normalize = createNormalizer();
  const out: NormEvent[] = [];
  for await (const raw of parseStream(streamFromChunks(chunks))) {
    out.push(...normalize(raw));
  }
  return out;
}

async function replayRaw(chunks: Buffer[]): Promise<RawEvent[]> {
  const out: RawEvent[] = [];
  for await (const raw of parseStream(streamFromChunks(chunks))) out.push(raw);
  return out;
}

describe("最新 fixture：精确快照断言（归一事件全序列）", () => {
  const fixture = latestFixture();
  const text = readFixtureText(fixture.path);

  it(`${fixture.file} 逐行回放产出预期的归一事件全序列`, async () => {
    const events = await replay(chunkText(text, 1 << 20)); // 整体喂入（不切块）
    // 2026-08-19 扩容后：全事件 at（assistant/user 有、system/result 无）+ toolDone 的
    // preview/truncated/bytes/interrupted（该 fixture 唯一一次 toolDone 走 tool_use_result
    // 结构化 stdout，非字符串 content 兜底路径）。
    // 注意这里**没有** thinking 事件：该 fixture 确实含一个 thinking 内容块，但明文被 CLI 抹成
    // 空串（headless 模式的既定行为，见 normalize.ts 里的实测记录），空内容不产出事件。
    expect(events).toEqual<NormEvent[]>([
      { kind: "started", sessionId: "eca007d6-7f59-4555-b488-842e88ffbf33" },
      { kind: "stalling", reason: "api_retry" },
      { kind: "stalling", reason: "api_retry" },
      {
        kind: "tool",
        id: "toolu_01GmTzjxA5AxC3izrZsyQZmA",
        name: "Bash",
        input: { command: "echo hello-from-subprocess", description: "Print hello-from-subprocess" },
        at: "2026-08-18T03:22:53.983Z",
      },
      { kind: "stalling", reason: "rate_limit" },
      {
        kind: "toolDone",
        id: "toolu_01GmTzjxA5AxC3izrZsyQZmA",
        ok: true,
        at: "2026-08-18T03:22:55.602Z",
        preview: "hello-from-subprocess",
        truncated: false,
        bytes: 21,
        interrupted: false,
      },
      { kind: "say", messageId: "msg_011Ce9VmVTwBVFiRRUxK8p9K", text: "done", at: "2026-08-18T03:22:58.383Z" },
      { kind: "done", ok: true, costUsd: 0.12197200000000002, turns: 2, durationMs: 12454 },
    ]);
  });

  it("hook 噪音（system/hook_started、system/hook_response）零透出", async () => {
    const raws = await replayRaw(chunkText(text, 1 << 20));
    expect(raws.some((r) => r.type === "system" && String(r.subtype).startsWith("hook_"))).toBe(false);
    // 原始 17 行里有 6 行是 hook 噪音，transport 应当只透出剩下 11 行
    expect(raws.length).toBe(11);
  });

  it("半行输入：fixture 按 1 字节切块喂入，归一事件与整体喂入零丢事件、逐一相等", async () => {
    const whole = await replay(chunkText(text, 1 << 20));
    const byteByByte = await replay(chunkText(text, 1));
    expect(byteByByte).toEqual(whole);
  });

  it("半行输入：fixture 按不规则字节大小切块喂入，归一事件与整体喂入零丢事件、逐一相等", async () => {
    const whole = await replay(chunkText(text, 1 << 20));
    const irregular = await replay(chunkTextIrregular(text, [3, 7, 13, 1, 40, 2]));
    expect(irregular).toEqual(whole);
  });
});

describe("未知 type / 解析失败：不抛异常，静默跳过", () => {
  it("未知顶层 type 透传给归一层后返回空数组，不抛异常", async () => {
    const line = JSON.stringify({ type: "totally_unknown_future_type", foo: "bar" }) + "\n";
    await expect(replay(chunkText(line, 1))).resolves.toEqual([]);
  });

  it("JSON.parse 失败的行被跳过，不抛异常，也不出现在 RawEvent 流里", async () => {
    const text = "not json at all\n" + JSON.stringify({ type: "system", subtype: "init", session_id: "s1" }) + "\n";
    const raws = await replayRaw(chunkText(text, 5));
    expect(raws).toEqual([{ type: "system", subtype: "init", session_id: "s1" }]);
  });

  it("onRaw 在 JSON.parse 之前调用，解析失败的行也会被落盘钩子看到", async () => {
    const text = "not json at all\n{}\n";
    const seen: string[] = [];
    const out: unknown[] = [];
    for await (const raw of parseStream(streamFromChunks(chunkText(text, 4)), { onRaw: (l) => seen.push(l) })) {
      out.push(raw);
    }
    expect(seen).toEqual(["not json at all", "{}"]);
    expect(out).toEqual([{}]); // {} 合法 JSON 但无 type，归一层会静默跳过；transport 层原样透出
  });
});

describe("全部 fixture：宽断言（协议漂移探测器，02 §2.7 / fixtures/README 双档策略）", () => {
  const all = listFixtures();
  it("至少存在一份 fixture", () => {
    expect(all.length).toBeGreaterThan(0);
  });

  for (const fx of all) {
    it(`${fx.file}：归一层零抛异常、含 started+done、tool/toolDone 不悬空`, async () => {
      const text = readFixtureText(fx.path);
      let events: NormEvent[] = [];
      await expect(
        (async () => {
          events = await replay(chunkText(text, 1 << 20));
        })(),
      ).resolves.not.toThrow();

      expect(events.some((e) => e.kind === "started")).toBe(true);
      expect(events.some((e) => e.kind === "done")).toBe(true);

      const toolIds = new Set(events.filter((e): e is Extract<NormEvent, { kind: "tool" }> => e.kind === "tool").map((e) => e.id));
      const doneIds = events.filter((e): e is Extract<NormEvent, { kind: "toolDone" }> => e.kind === "toolDone").map((e) => e.id);
      for (const id of doneIds) {
        expect(toolIds.has(id)).toBe(true); // 不存在悬空的 toolDone（没有对应的 tool）
      }
    });
  }
});

describe("tool_use.id 去重（同一消息随内容块增长重复出现）", () => {
  it("同一 tool_use.id 在多条 assistant 原始事件中重复出现时，只在首见吐一次 tool", () => {
    const normalize = createNormalizer();
    const msg1: RawEvent = {
      type: "assistant",
      message: {
        id: "msg_1",
        content: [{ type: "tool_use", id: "toolu_dup", name: "Bash", input: { command: "echo a" } }],
      },
    };
    const msg2: RawEvent = {
      type: "assistant",
      message: {
        id: "msg_1",
        content: [
          { type: "tool_use", id: "toolu_dup", name: "Bash", input: { command: "echo a" } }, // 内容块增长导致重复出现
          { type: "text", text: "still working" },
        ],
      },
    };
    const first = normalize(msg1);
    const second = normalize(msg2);
    expect(first).toEqual([{ kind: "tool", id: "toolu_dup", name: "Bash", input: { command: "echo a" } }]);
    // 第二条只应吐出 say，不重复吐 tool
    expect(second).toEqual([{ kind: "say", messageId: "msg_1", text: "still working" }]);
  });

  it("多个 text 内容块聚合为一条 say", () => {
    const normalize = createNormalizer();
    const msg: RawEvent = {
      type: "assistant",
      message: {
        id: "msg_2",
        content: [
          { type: "text", text: "hello " },
          { type: "text", text: "world" },
        ],
      },
    };
    expect(normalize(msg)).toEqual([{ kind: "say", messageId: "msg_2", text: "hello world" }]);
  });

  it("thinking 内容块产生 thinking 事件（2026-08-19 起不再跳过，仅供展示不驱动状态）", () => {
    const normalize = createNormalizer();
    const msg: RawEvent = {
      type: "assistant",
      message: { id: "msg_3", content: [{ type: "thinking", thinking: "hmm" }] },
    };
    expect(normalize(msg)).toEqual([{ kind: "thinking", text: "hmm" }]);
  });

  // 这不是边缘情况，而是 headless 模式下的**常态**：真实任务日志 12 份共 111 个 thinking 块，
  // 明文 100% 为空（只有加密 signature）；实测 --include-partial-messages 的 thinking_delta
  // 同样是空串。空内容不产出事件，UI 才不会渲染出一串什么都没有的"思考"卡片。
  it("thinking 明文为空（headless 常态：CLI 抹掉明文只留 signature）时不产出事件", () => {
    const normalize = createNormalizer();
    const msg: RawEvent = {
      type: "assistant",
      message: { id: "msg_4", content: [{ type: "thinking", thinking: "", signature: "CAIS8AMK..." }] },
    };
    expect(normalize(msg)).toEqual([]);
  });

  it("thinking 明文非字符串（形状异常）时同样不产出事件", () => {
    const normalize = createNormalizer();
    const msg: RawEvent = {
      type: "assistant",
      message: { id: "msg_5", content: [{ type: "thinking", thinking: 42 }] },
    };
    expect(normalize(msg)).toEqual([]);
  });

  it("assistant 事件带 timestamp 时，tool/say/thinking 三种事件都带上 at", () => {
    const normalize = createNormalizer();
    const msg: RawEvent = {
      type: "assistant",
      timestamp: "2026-08-19T06:33:52.755Z",
      message: {
        id: "msg_5",
        content: [
          { type: "thinking", thinking: "hmm" },
          { type: "tool_use", id: "toolu_x", name: "Bash", input: { command: "echo x" } },
          { type: "text", text: "working" },
        ],
      },
    };
    expect(normalize(msg)).toEqual([
      { kind: "thinking", text: "hmm", at: "2026-08-19T06:33:52.755Z" },
      { kind: "tool", id: "toolu_x", name: "Bash", input: { command: "echo x" }, at: "2026-08-19T06:33:52.755Z" },
      { kind: "say", messageId: "msg_5", text: "working", at: "2026-08-19T06:33:52.755Z" },
    ]);
  });
});

describe("其余映射规则（脱离 fixture 的合成用例，覆盖 fixture 未触达的分支）", () => {
  it("user 消息里多个 tool_result 各自映射一条 toolDone（无 content/tool_use_result 时 preview 兜底为空串）", () => {
    const normalize = createNormalizer();
    const msg: RawEvent = {
      type: "user",
      message: {
        content: [
          { type: "tool_result", tool_use_id: "t1", is_error: false },
          { type: "tool_result", tool_use_id: "t2", is_error: true },
        ],
      },
    };
    expect(normalize(msg)).toEqual([
      { kind: "toolDone", id: "t1", ok: true, preview: "", truncated: false, bytes: 0 },
      { kind: "toolDone", id: "t2", ok: false, preview: "", truncated: false, bytes: 0 },
    ]);
  });

  it("result 事件 is_error=true 时 ok=false，且 costUsd/turns/durationMs 缺省字段不写入（result 无 timestamp，at 留空）", () => {
    const normalize = createNormalizer();
    const raw: RawEvent = { type: "result", is_error: true };
    expect(normalize(raw)).toEqual([{ kind: "done", ok: false }]);
  });
});

describe("toolDone 扩容字段（2026-08-19：preview/truncated/bytes/interrupted/at，总指挥拍板契约）", () => {
  function toolResultMsg(opts: {
    id?: string;
    content?: string;
    toolUseResult?: unknown;
    timestamp?: string;
  }): RawEvent {
    const raw: RawEvent = {
      type: "user",
      message: {
        content: [{ type: "tool_result", tool_use_id: opts.id ?? "t1", is_error: false, content: opts.content }],
      },
    };
    if (opts.toolUseResult !== undefined) raw.tool_use_result = opts.toolUseResult;
    if (opts.timestamp !== undefined) raw.timestamp = opts.timestamp;
    return raw;
  }

  it("恰好 20 行：不截断，preview 含全部 20 行", () => {
    const normalize = createNormalizer();
    const text = Array.from({ length: 20 }, (_, i) => `line${i + 1}`).join("\n");
    const [ev] = normalize(toolResultMsg({ content: text })) as [Extract<NormEvent, { kind: "toolDone" }>];
    expect(ev.truncated).toBe(false);
    expect(ev.preview).toBe(text);
    expect(ev.preview.split("\n")).toHaveLength(20);
    expect(ev.bytes).toBe(Buffer.byteLength(text, "utf8"));
  });

  it("超过 20 行：截断，preview 只含前 20 行，bytes 记截断前原文字节数", () => {
    const normalize = createNormalizer();
    const text = Array.from({ length: 25 }, (_, i) => `line${i + 1}`).join("\n");
    const [ev] = normalize(toolResultMsg({ content: text })) as [Extract<NormEvent, { kind: "toolDone" }>];
    expect(ev.truncated).toBe(true);
    expect(ev.preview.split("\n")).toHaveLength(20);
    expect(ev.preview).toBe(Array.from({ length: 20 }, (_, i) => `line${i + 1}`).join("\n"));
    expect(ev.bytes).toBe(Buffer.byteLength(text, "utf8")); // 截断前的原文字节数，不是 preview 的字节数
  });

  it("空输出：preview 为空串、truncated=false、bytes=0", () => {
    const normalize = createNormalizer();
    const [ev] = normalize(toolResultMsg({ content: "" })) as [Extract<NormEvent, { kind: "toolDone" }>];
    expect(ev.preview).toBe("");
    expect(ev.truncated).toBe(false);
    expect(ev.bytes).toBe(0);
  });

  it("tool_use_result 是 Bash 结构化形状：优先用 stdout+stderr 拼接，不用 content 字符串", () => {
    const normalize = createNormalizer();
    const [ev] = normalize(
      toolResultMsg({
        content: "这个字符串应被忽略",
        toolUseResult: { stdout: "out-line", stderr: "err-line", interrupted: false, isImage: false, noOutputExpected: false },
      }),
    ) as [Extract<NormEvent, { kind: "toolDone" }>];
    expect(ev.preview).toBe("out-line\nerr-line");
    expect(ev.interrupted).toBe(false);
  });

  it("tool_use_result.interrupted=true 时透传（排障关键信号）", () => {
    const normalize = createNormalizer();
    const [ev] = normalize(
      toolResultMsg({ toolUseResult: { stdout: "", stderr: "Killed", interrupted: true, isImage: false, noOutputExpected: false } }),
    ) as [Extract<NormEvent, { kind: "toolDone" }>];
    expect(ev.interrupted).toBe(true);
    expect(ev.preview).toBe("Killed");
  });

  it("tool_use_result 是非 Bash 形状（如 Skill 调用的 {commandName,success}）：退回 content 字符串，不带 interrupted", () => {
    const normalize = createNormalizer();
    const [ev] = normalize(
      toolResultMsg({ content: "Launching skill: foo", toolUseResult: { commandName: "foo", success: true } }),
    ) as [Extract<NormEvent, { kind: "toolDone" }>];
    expect(ev.preview).toBe("Launching skill: foo");
    expect(ev.interrupted).toBeUndefined();
  });

  it("user 事件带 timestamp 时 toolDone.at 取自它；不带时 at 缺失（不假装成 Date.now()）", () => {
    const normalize = createNormalizer();
    const withTs = normalize(toolResultMsg({ content: "x", timestamp: "2026-08-19T06:33:46.848Z" }))[0] as Extract<
      NormEvent,
      { kind: "toolDone" }
    >;
    expect(withTs.at).toBe("2026-08-19T06:33:46.848Z");
    const withoutTs = normalize(toolResultMsg({ content: "x" }))[0] as Extract<NormEvent, { kind: "toolDone" }>;
    expect(withoutTs.at).toBeUndefined();
  });
});
