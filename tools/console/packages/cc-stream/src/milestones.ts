// 里程碑引擎：通用，吃调用方注入的声明式匹配表（上游拍板 §7.3：引擎进包，知识留外——
// 具体每类任务的正则规则住调用方，本包不认识任何一条规则的业务含义）。
import type { MilestoneEngine, MilestoneHit, MilestoneRule, MilestoneTable, NormEvent } from "./types.js";

/** 创建一个有状态的里程碑引擎：once 规则命中一次后失效，跨多次 feed() 调用记忆。 */
export function createMilestoneEngine(table: MilestoneTable): MilestoneEngine {
  const fired = new Set<string>();

  return {
    feed(ev: NormEvent): MilestoneHit[] {
      if (ev.kind !== "tool") return []; // 只对工具事件求值（信任分级：进度看动作不看叙述）

      const hits: MilestoneHit[] = [];
      const at = new Date().toISOString();

      for (const rule of table) {
        const once = rule.once !== false; // 默认 true
        if (once && fired.has(rule.id)) continue;
        if (!matchRule(rule, ev.name, ev.input)) continue;

        hits.push({ id: rule.id, label: rule.label, at });
        if (once) fired.add(rule.id);
      }
      return hits;
    },
  };
}

function matchRule(rule: MilestoneRule, toolName: string, input: unknown): boolean {
  if (!matchTool(rule.match.tool, toolName)) return false;
  if (!rule.match.input) return true;

  const inputObj = isPlainObject(input) ? input : {};
  for (const [key, re] of Object.entries(rule.match.input)) {
    const value = inputObj[key];
    if (value === undefined) return false;
    if (!re.test(String(value))) return false;
  }
  return true;
}

function matchTool(matcher: string | RegExp, name: string): boolean {
  return typeof matcher === "string" ? matcher === name : matcher.test(name);
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
