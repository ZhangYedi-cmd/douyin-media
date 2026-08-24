# cc-stream fixtures

`claude -p --output-format stream-json --verbose` 的真实 stdout 样本，供 `test/normalize.test.ts`
（及 `test/milestones.test.ts` 的假表回放）使用。stream-json 是半文档化协议，Claude Code 客户端
升版可能改变事件形态（新增字段、字段改名、subtype 变化）——这是 cc-stream 包唯一的真实风险，
重采集是探测协议漂移的手段（上游拍板 §7.5）。

## 命名约定

```
<采集日期 YYYY-MM-DD>-claude-<claude --version 输出的版本号>.jsonl
```

## 现有 fixture

| 文件 | 采集日期 | claude 版本 | 说明 |
|---|---|---|---|
| `2026-08-18-claude-2.1.234.jsonl` | 2026-08-18 | 2.1.234 | 首个真实 fixture（非本包 `capture-fixture.sh` 采集，取自本机一次真实探测的会话记录拷入）。17 行，覆盖面完整：hook 噪音（`hook_started`/`hook_response` ×6）、`system/init`、`api_retry` ×2、`system/thinking_tokens`（未知子类型噪音）、assistant 消息含 thinking-only 内容块（不产生事件）、`tool_use`（Bash 跑 `echo`）、`rate_limit_event`、`tool_result`、text 收尾、`result` 终局。作为「最新 fixture」承担精确快照断言的基准。**入库前已做一次脱敏**：原始 `system/init` 事件的 `plugins[].path` 字段携带本机内部组织标识（属安全闸禁用关键词），已替换为不含该标识的等价占位路径，不影响任何字段的结构/类型，仅路径字符串内容被替换。 |

## 测试策略：双档（上游拍板 §7.5）

- **全部 fixture** 跑宽断言（`test/normalize.test.ts` 的「全部 fixture：宽断言」describe 块）：归一层零抛异常、事件序列里必须出现 `started` 与 `done`、`toolDone` 不悬空（每个 `toolDone.id` 都能在同一次回放里找到对应的 `tool.id`）。协议漂移会先让这一档变红——这是本包的漂移探测器。
- **最新 fixture**（按文件名日期字段取最大者）跑精确快照断言：归一事件全序列逐个比对（`toEqual` 整个数组）。升版采集新 fixture 后，它自动接管这一档；旧 fixture 保留，继续跑宽断言留作历史回归。

## 重采集约定

**每次本机 Claude Code 客户端升版，跑一次 `../scripts/capture-fixture.sh` 产出新 fixture。**

流程：

1. 运行 `bash scripts/capture-fixture.sh`（需要本机已安装并登录 `claude` CLI；不在 CI/无环境场景运行）。脚本固定一个短小探测 prompt（读一个文件 + 跑一条 `echo` + 正常收尾），把 stdout 原样存进 `fixtures/`，文件名按上面的命名约定自动生成。
2. **入库前必须脱敏一次**：核对新 fixture 里是否携带本机专属的敏感路径/标识（例如 `system/init` 的 `cwd`、`plugins[].path`、`memory_paths`、`messaging_socket_path` 等字段常带本机绝对路径）。本仓的入库关键词安全闸（`npm test` 前置的 `scripts/guard-keywords.mjs`，见仓库根 `05-实施计划-Codex分工.md` §3 红线 9）会挡住公司内部标识关键词，但闸只做关键词匹配，**不做语义脱敏**——采集人仍需人工过一遍新 fixture，把类似 2026-08-18 那次「`plugins[].path` 里带内部组织路径段」的问题在提交前处理掉（替换成不含敏感标识的等价占位值，保持字段结构/类型不变，不影响测试）。
3. 跑一次 `npm test`：确认宽断言仍然全绿（若变红，说明协议真的漂移了，需要先修 `src/normalize.ts` / `src/transport.ts` 再继续）。
4. 若新 fixture 的事件序列与旧「最新」不同，精确快照断言会自动切换到新 fixture 并可能失败——照实更新 `test/normalize.test.ts` 里那条 `toEqual` 的期望序列。
5. 在上面的表格追加一行（文件名 / 采集日期 / claude 版本 / 备注）。
6. 可选：把「cc-stream fixture 是否为最新 Claude Code 版本」接入调用方仓库已有的巡检/CI 流程——这里只登记约定，本包不改调用方仓库的任何文件（不在白名单内）。

## 采集脚本

`../scripts/capture-fixture.sh`：见脚本内注释。依赖本机已登录的 `claude` CLI。
