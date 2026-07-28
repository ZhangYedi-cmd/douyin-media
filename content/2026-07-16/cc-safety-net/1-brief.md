# 1-brief · cc-safety-net（AI 编程 agent 的「删库安全网」）

> 喂给 pipeline/2-create.md 的创作简报。深度题（源码/机制拆解，立身支柱）。
> backlog: 2026-07-15-001 ｜ slug: cc-safety-net ｜ track: depth ｜ format: kouban（16:9 横屏）

## 一句话选题
AI 编程 agent 一条 `rm -rf ~/` 就能把你 home 目录删干净——你写在 CLAUDE.md 里的「别删我文件」是软规则，AI 说违反就违反。cc-safety-net 是一个 PreToolUse hook，用「读懂命令语义」的硬约束，在命令进 shell 前把破坏性操作拦下来，而且防绕过。

## 为什么现在做（时效 + 立身）
- 真实事件：有人被 AI 一条命令删了整个 home 目录（repo README 自引 Reddit 帖），安全焦虑真实。
- 与已发 EP05「权限管线」呼应但角度不同：EP05 讲 Claude Code 内建权限，这条讲第三方 hook 用**硬约束替代软规则**、且跨 7 个 CLI 通用。
- 机制可拆（解析命令语义防绕过）= 账号立身的源码/机制拆解母题。

## 核心事实（全部亲验，源 = github.com/kenryu42/cc-safety-net，v1.0.6，MIT，2026-07-16 shallow clone 逐条锚 file:line）
1. **它是什么**：一个 PreToolUse hook，拦截并阻止破坏性 git / 文件系统命令，在 AI agent 真正执行前。README:28。跨 7 个 CLI：Claude Code / Codex / Gemini CLI / GitHub Copilot CLI / Kimi Code / OpenCode / Pi（README「Supported agents」）。
2. **母题（为什么存在）**：CLAUDE.md / AGENTS.md 里的**软规则**替代不了**硬技术约束**；软规则 AI 可以无视，hook 拦截是命令进 shell 前的物理闸口。README「Why this exists」。
3. **接入 Claude Code 的真实契约**：hook 返回 `{permissionDecision:'deny', permissionDecisionReason: message}`，走 PreToolUse / matcher=Bash。`hooks/hooks.json`；`src/bin/hook/claude-code.ts:7-12`；`src/bin/hook/constants.ts:1-2`。
4. **核心 = 解析语义，不是字符串匹配**（防绕过的肉）：
   - 入口 `analyzeCommand` → `analyzeCommandInternal` 递归下钻，先按 `&&`/`;`/`|` 切段。`src/core/analyze/analyze-command.ts:26-35`。
   - **shell 包装绕不过**：`bash -c "rm -rf ~"` 会被 `extractDashCArg` 拆出内层命令、递归再分析。`src/core/analyze/shell-wrappers.ts:1-17`。
   - **解释器单行绕不过**：`python -c` / `perl -e` 抽出代码字符串查危险模式。`src/core/analyze/interpreters.ts:3-21`。
   - **flag 重排绕不过**：`hasRecursiveForceFlags` 认 `-r`+`-f` 任意顺序、组合 `-rf`/`-fr`、长写 `--recursive --force`（按字符拆）。`src/core/analyze/rm-flags.ts:1-19`。
   - **rm 目标分类**：`/`、`~`、`$HOME`、`${HOME}` 恒拦；含 shell 变量的动态目标拦；cwd 外拦；cwd 内放行（paranoid 除外）；home 当 cwd 也拦。`src/core/analyze/rm.ts:69-202`。
   - **fail closed**：分析器一旦抛异常 = 直接拦（宁可错杀）。`src/index.ts:40-48`；strict 模式连引号没闭合的都拦。`analyze-command.ts:42-50`。
   - 递归封顶 `MAX_RECURSION_DEPTH = 10`。`src/types.ts:161`。
5. **危险模式清单**（`src/types.ts:181-191`）：rm -rf、`git reset --hard`、`git checkout --`、`git clean -f`、`git stash drop/clear`、`dd of=/dev/…`、`mkfs`、`shred`、`find … -delete`。git 破坏性操作有独立规则库、且每条给「先 git stash」这类替代建议。`src/core/git/rules.ts`。
6. **拦了还教你**：拦截消息是「BLOCKED by CC Safety Net / Reason / Command / Segment / 真要用就叫用户手动跑」，不是干瘪报错——给原因 + 给安全替代。`src/core/format.ts:12-40`。

## 口播骨架（钩子 → 分点 → takeaway）
- 冷开钩子（自成立）：AI 一条命令删了我整个 home 目录；你 CLAUDE.md 里写「别删」它照删——软规则拦不住 AI。
- 点1 母题：软规则 vs 硬约束。hook = 命令进 shell 前的物理闸口。
- 点2 机制：为什么「字符串黑名单」没用（`bash -c`/`python -c`/`-rf` 换 `-fr` 都能绕），它靠**解析语义 + 递归拆壳**；rm 目标按语义分类，根/家目录恒拦。
- 点3 兜底哲学：fail closed（分析不了就拦）+ 拦了给替代建议 + 跨 7 个 CLI 通用。
- takeaway：软规则写再多也是提醒，真要防误删得上硬 hook；去 GitHub 搜 cc-safety-net，从 analyze 目录读起。互动：你被 AI 误删过东西吗？

## 红线自检
- 全片可溯源、锚 file:line，无臆造 benchmark/跑分（本题本就无跑分）。
- Reddit 删 home 事件 = repo 自引的真实事件，不夸大、标「有人遇到过」。
- 无口播导流外链（「去 GitHub 搜」为合规话术）；第一人称口语化、无论文腔。
- 「安全网/拦下」非绝对化承诺，措辞用「拦破坏性命令/防绕过」，不说「100% 防住一切」。
