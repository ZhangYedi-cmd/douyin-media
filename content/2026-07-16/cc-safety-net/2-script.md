# 口播稿 · cc-safety-net（给编程 agent 装个「安全网」拦住 rm -rf）

> 唯一真相源。深度题（源码/机制拆解，立身支柱）。第一人称、口语化、冷开自成立。
> slug: cc-safety-net ｜ backlog: 2026-07-15-001 ｜ 目标时长 ~2:40–3:00
> 全片可溯源，claim 锚 cc-safety-net 源码 file:line（clone 自 github.com/kenryu42/cc-safety-net，v1.0.6，MIT，2026-07-16 读）。溯源见文末（D 闸）。

---

## 章节 1 · coldopen（冷开钩子）

**step 0**
一个 AI 编程 agent，一条命令就把我整个 home 目录删干净了，几个小时的活儿，一秒钟没。你可能觉得，我在 CLAUDE.md 里写一句「别删我文件」不就行了？我告诉你，没用，那种规矩 AI 说违反就违反。今天讲个东西，它能在这条命令真跑起来之前，把它当场摁住。

**step 1**
它叫 cc-safety-net，开源、MIT 协议。本质是一个 hook：AI 每要在你终端里跑一条命令，都得先过它一手，是破坏性的，当场拦死，命令根本进不了你的 shell。

---

## 章节 2 · 母题（软规则 vs 硬约束）

**step 0**
先说为什么非得要它。你在 CLAUDE.md、AGENTS.md 里写的那些规矩，全是软规则——是提醒，不是墙。模型今天听话，明天可能就当没看见，一条删库命令照样发给你。

**step 1**
作者就是这么踩的坑：AI 一条命令，删了他整个 home 目录。他复盘出来就一句话——软规则，替代不了硬技术约束。这个 hook 就是那道硬约束：它卡在 AI 和你 shell 中间，任何命令要执行，必须先过这道闸。

---

## 章节 3 · 机制（为什么黑名单没用，它读懂命令）

**step 0**
你可能想，拦 rm -rf 不就是搜个关键词吗？不行，字符串黑名单一碰就碎。AI 把命令包一层 bash -c，或者写成一段 python 塞进去，你那关键词当场就搜不到了。

**step 1**
它的做法是真去把命令读懂。看见 bash -c 后面跟一串，它把里面的命令抠出来，递归再查一遍；看见 python、perl 带一段代码，同样抠出来查。壳套几层，它给你扒几层，封顶扒十层。

**step 2**
光看命令名也不够。就说 rm 那两个危险开关，你把 -rf 换成 -fr、拆成完整的 --recursive 和 --force、或者混进一堆字母里，它照样认。因为它是一个字符一个字符去数「有没有递归、有没有强制」，不是死记那两个字母长什么样。

**step 3**
认出这是要强删之后，它再看你到底删哪。删到根目录、删到家目录、删到 HOME 变量，一律拦死；删的路径里带着它算不准的变量，拦；删到你当前项目文件夹外面去，也拦。只有老老实实删项目里的东西，才放行。

---

## 章节 4 · 兜底哲学（拦不准就拦，拦了还教你）

**step 0**
最较真的是这一条：万一命令太刁钻，它分析到一半自己崩了，怎么办？它选择拦。宁可错杀，也绝不放一条它没看懂的命令进去。这叫 fail closed，一个安全工具，就该是这个默认。

**step 1**
而且它拦你，不是甩一句冷冰冰的报错。它会告诉你：拦的是哪条、卡在哪一段、为什么危险，最后给你留条活路——真要跑，你自己手动确认了再跑。git 那些毁历史的操作它也一起管，reset --hard、checkout 一横杠、clean -f，每一条都配一句「你先 git stash 存一下」。

**step 2**
更省心的是，一套东西，七个主流编程 agent 通用：Claude Code、Codex、Gemini CLI、Copilot、Kimi、OpenCode、Pi，都能挂上去。你换个 agent 干活，这张安全网还在。

---

## 章节 5 · ending（takeaway + 互动）

**step 0**
所以别再指望在 CLAUDE.md 里写几句「你小心点」就能拦住 AI 了——那是提醒，不是护栏。你要是真怕它手一滑给你删库，就给它套一层这样的硬 hook，让危险命令在进 shell 之前，就被摁在门外。

**step 1**
想看它到底怎么把一条命令读懂的，去 GitHub 搜 cc-safety-net，从那个叫 analyze 的目录看起，半小时就能摸清它防绕过的整套思路。你被 AI 误删过东西吗？评论区聊聊，我看看谁最惨。

---

## 溯源（事实合规 · D 闸）

全部事实来自 `kenryu42/cc-safety-net` 公开仓（MIT，`package.json:2-3/37` name=cc-safety-net、version=1.0.6、license=MIT；2026-07-16 shallow clone，逐条锚 file:line 亲验）：

- 定位「命令进 shell 前拦破坏性命令」：`README.md:28`「A PreToolUse hook that intercepts and blocks destructive git and filesystem commands before AI coding agents run them. CC Safety Net parses command **semantics** — so flag reordering, shell wrappers, and interpreter one-liners can't bypass it.」★口播「安全网/摁住」= 该定位；未说「100% 防一切」，措辞限定为「拦破坏性命令、防绕过」。
- 挂在 AI 与 shell 之间的闸口 = hook：`hooks/hooks.json` 注册 `PreToolUse` + `matcher: Bash`，命令 = 执行 `dist/bin/cc-safety-net.js hook --claude-code`；`src/bin/hook/constants.ts:1-2` `CLAUDE_CODE_HOOK_EVENT='PreToolUse'`、`CLAUDE_CODE_TOOL_NAME='Bash'`。接入 Claude Code 时 hook 返回 `permissionDecision:'deny'`（`src/bin/hook/claude-code.ts:7-12`）→ Claude Code 据此拒绝该 Bash 调用。★口播「命令根本进不了 shell」= PreToolUse 在工具执行前触发、deny 即不执行。
- 母题「软规则替代不了硬约束 + 作者删 home 目录」：`README.md`「Why this exists」节原文「instructions aren't enough to keep AI agents in check … an agent silently wiped hours of progress with a single `rm -rf ~/` … **soft** rules in a `CLAUDE.md` or `AGENTS.md` file cannot replace **hard** technical constraints」，并自引 Reddit 帖（r/ClaudeAI「Claude CLI deleted my entire home directory」）。★口播「作者删了整个 home 目录」= repo 自述的真实动机事件，标「作者踩的坑」，不夸大、不臆造细节。
- 黑名单会被绕过 → 靠解析语义 + 递归拆壳：入口 `src/core/analyze/index.ts:5-11` `analyzeCommand` → `src/core/analyze/analyze-command.ts:26-35` `analyzeCommandInternal`，先 `splitShellCommandsWithInfo` 按 `&&`/`;`/`|` 切段再逐段分析。
  - shell 包装拆开：`src/core/analyze/shell-wrappers.ts:1-17` `extractDashCArg` 从 `bash -c "…"`（含组合短选项）抠出内层命令，`analyze-command.ts:83-97` 经 `analyzeNested` 递归到 `depth+1` 再分析。
  - 解释器单行拆开：`src/core/analyze/interpreters.ts:3-30` `extractInterpreterCodeArg` 从 `python -c` / `perl -e` 抠出代码串，`containsDangerousCode` 对 `DANGEROUS_PATTERNS` 逐条匹配。
  - 递归封顶：`src/types.ts:161` `MAX_RECURSION_DEPTH = 10`；`analyze-command.ts:31-33` 触顶即返回拦截（不放行）。★口播「封顶扒十层」= 该常量。
- flag 换顺序/组合/长写都认：`src/core/analyze/rm-flags.ts:1-19` `hasRecursiveForceFlags`——认 `-r`/`-R`/`--recursive` 与 `-f`/`--force`，且对 `-rf`/`-fr` 这类组合短选项按字符包含判断（`token.includes('r')`/`includes('f')`），`-r`+`-f` 同在才算强删。★口播「一个字符一个字符去数」= 逐字符包含判断，非记忆固定顺序。
- rm 目标按语义分类：`src/core/analyze/rm.ts:69-202`——`isDangerousRootOrHomeTarget`（`180-202`）对 `/`、`~`、`$HOME`、`${HOME}`（及其 `/`、`/*` 变体）恒判危险；`isDynamicTarget` 含 shell 变量的目标 → 拦（`REASON_RM_RF_DYNAMIC_TARGET`）；`outside_anchored_cwd` → 拦（`REASON_RM_RF`）；home 当 cwd → 拦（`REASON_RM_HOME_CWD`）；`within_anchored_cwd` 非 paranoid → 放行。★口播「删根/家/HOME 一律拦、带变量拦、项目外拦、项目内放行」逐条对应。
- fail closed（分析崩了就拦）：`src/index.ts:40-48` catch 到分析异常即 `throw` 阻断，reason=「CC Safety Net failed closed because command analysis failed unexpectedly」；`src/bin/hook/common.ts:102-113` 同构。strict 模式对无法解析（如引号未闭合）亦拦：`analyze-command.ts:42-50`。★口播「分析到一半崩了它选择拦」= fail-closed 分支。
- 拦了给原因 + 给替代，不是干瘪报错：`src/core/format.ts:12-40` `formatBlockedMessage` 输出「BLOCKED by CC Safety Net / Reason / Command / Segment / If this operation is truly needed, ask the user for explicit permission and have them run the command manually」。git 破坏性操作独立规则库并附替代建议：`src/core/git/rules.ts:4-41`，如 `git reset --hard`→「Use 'git stash' first」、`git checkout --`→「Use 'git stash' first」、`git clean -f`→「Use 'git clean -n' to preview first」。危险模式清单 `src/types.ts:181-191` 含 rm -rf / git reset --hard / git checkout -- / git clean -f / git stash drop|clear / dd of=/dev/ / mkfs / shred / find -delete。★口播只举 reset --hard / checkout 一横杠 / clean -f 三例，均逐字对应。
- 跨 7 个 CLI：`README.md`「Supported agents」原文「Claude Code, Codex, Gemini CLI, GitHub Copilot CLI, Kimi Code, OpenCode, and Pi」；`src/bin/hook/` 下有 `claude-code.ts`/`gemini-cli.ts`/`copilot-cli.ts`/`kimi-code.ts` 等各家适配 + `install/` 安装器。★口播七家逐一对应 README 清单。

> 合规：无绝对化用词（不说「最/第一/100% 防住」，「安全网」为产品名 + 限定「拦破坏性命令、防绕过」）；无口播导流外链（「去 GitHub 搜 cc-safety-net」为合规话术）；无臆造 benchmark/跑分数字（本题全片不涉性能分）；删 home 事件为 repo 自述真实动机、标「作者踩的坑」不添油加醋；对 Claude Code/各 CLI 的描述均公开可核实（PreToolUse hook 机制、七家适配文件均在源码）。

## 多音字 / 念法（喂 tts-dub overrides，字幕不改）
- 「数」= shǔ（章节3/step2「一个字符一个字符去数」，非 shù）
- 「壳」= ké（章节3/step1「壳套几层」，非 qiào）
- 「行」相关已规避：全文用「一串/一段 python」，未用「一行」
- 「得」= děi（章节2/step1「都得先过这道闸」，非 dé/de）
- 「一横杠」= 口语念法，字幕对应 `checkout --`（念法/字幕解耦，念中文避免念英文进画面）
- 英文专名念法：MIT 念「M-I-T」；bash -c / python / perl / git / hook 保留英文（技术受众通用词）；HOME 念「HOME 变量」避免念符号
