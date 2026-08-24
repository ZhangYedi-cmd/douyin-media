import { describe, expect, it } from "vitest";
import { createMilestoneEngine } from "../src/milestones.js";
import { createNormalizer } from "../src/normalize.js";
import { parseStream } from "../src/transport.js";
import type { MilestoneTable, NormEvent } from "../src/types.js";
import { chunkText, latestFixture, readFixtureText, streamFromChunks } from "./helpers.js";

// 假里程碑表：通用示例，刻意不带任何调用方业务领域词（cc-stream 引擎本身不认识具体任务的含义）。
const FAKE_TABLE: MilestoneTable = [
  { id: "ran-a-command", label: "ran a bash command", match: { tool: "Bash" } },
  { id: "greeted", label: "echoed a greeting", match: { tool: /^Bash$/, input: { command: /^echo /i } } },
];

async function normalizeFixture(): Promise<NormEvent[]> {
  const fixture = latestFixture();
  const text = readFixtureText(fixture.path);
  const normalize = createNormalizer();
  const out: NormEvent[] = [];
  for await (const raw of parseStream(streamFromChunks(chunkText(text, 1 << 20)))) {
    out.push(...normalize(raw));
  }
  return out;
}

describe("里程碑引擎：假表回放真实 fixture", () => {
  it("fixture 唯一一次 Bash/echo 调用命中两条里程碑，各一次", async () => {
    const events = await normalizeFixture();
    const engine = createMilestoneEngine(FAKE_TABLE);
    const hits = events.flatMap((ev) => engine.feed(ev));
    expect(hits.map((h) => h.id)).toEqual(["ran-a-command", "greeted"]);
    expect(hits.every((h) => typeof h.at === "string" && !Number.isNaN(Date.parse(h.at)))).toBe(true);
  });
});

describe("里程碑引擎：合成序列覆盖 once 语义", () => {
  function toolEvent(id: string, name: string, input: unknown): NormEvent {
    return { kind: "tool", id, name, input };
  }

  it("once 默认为 true：同一规则命中一次后失效，第二次同类 tool 事件不再吐", () => {
    const engine = createMilestoneEngine(FAKE_TABLE);
    const first = engine.feed(toolEvent("id-1", "Bash", { command: "echo one" }));
    const second = engine.feed(toolEvent("id-2", "Bash", { command: "echo two" }));
    expect(first.map((h) => h.id)).toEqual(["ran-a-command", "greeted"]);
    expect(second).toEqual([]); // 两条 once 规则都已在 first 命中过，全部失效
  });

  it("once:false 的规则每次匹配都重新吐出", () => {
    const table: MilestoneTable = [
      { id: "every-bash", label: "any bash call", match: { tool: "Bash" }, once: false },
    ];
    const engine = createMilestoneEngine(table);
    const first = engine.feed(toolEvent("id-1", "Bash", {}));
    const second = engine.feed(toolEvent("id-2", "Bash", {}));
    expect(first.map((h) => h.id)).toEqual(["every-bash"]);
    expect(second.map((h) => h.id)).toEqual(["every-bash"]);
  });

  it("match.tool 为字符串时要求完全相等，不做子串/前缀匹配", () => {
    const table: MilestoneTable = [{ id: "exact", label: "exact bash", match: { tool: "Bash" } }];
    const engine = createMilestoneEngine(table);
    expect(engine.feed(toolEvent("id-1", "BashOutput", {}))).toEqual([]);
    expect(engine.feed(toolEvent("id-2", "Bash", {}))).toEqual([{ id: "exact", label: "exact bash", at: expect.any(String) }]);
  });

  it("match.input 多字段要求全部命中（AND），任一不匹配则不命中", () => {
    const table: MilestoneTable = [
      {
        id: "both",
        label: "both fields match",
        match: { tool: "Write", input: { file_path: /\.md$/, mode: /^append$/ } },
      },
    ];
    const engine = createMilestoneEngine(table);
    // 只有 file_path 匹配，mode 不匹配 -> 不命中
    expect(engine.feed(toolEvent("id-1", "Write", { file_path: "notes.md", mode: "overwrite" }))).toEqual([]);
    // 两个字段都匹配 -> 命中
    expect(engine.feed(toolEvent("id-2", "Write", { file_path: "notes.md", mode: "append" }))).toEqual([
      { id: "both", label: "both fields match", at: expect.any(String) },
    ]);
  });

  it("match.input 引用的字段在 input 里缺失时不命中（不当成 'undefined' 字符串强凑）", () => {
    const table: MilestoneTable = [
      { id: "needs-field", label: "needs field", match: { tool: "Bash", input: { command: /.*/ } } },
    ];
    const engine = createMilestoneEngine(table);
    expect(engine.feed(toolEvent("id-1", "Bash", {}))).toEqual([]);
    expect(engine.feed(toolEvent("id-1", "Bash", { command: "anything" }))).toEqual([
      { id: "needs-field", label: "needs field", at: expect.any(String) },
    ]);
  });

  it("非 tool 事件（say/done/started/stalling/toolDone）永不产生里程碑命中", () => {
    const engine = createMilestoneEngine(FAKE_TABLE);
    const nonToolEvents: NormEvent[] = [
      { kind: "started", sessionId: "s1" },
      { kind: "say", messageId: "m1", text: "echo hello — looks like a match string but not a tool event" },
      { kind: "stalling", reason: "api_retry" },
      { kind: "toolDone", id: "id-1", ok: true },
      { kind: "done", ok: true },
    ];
    for (const ev of nonToolEvents) {
      expect(engine.feed(ev)).toEqual([]);
    }
  });
});
