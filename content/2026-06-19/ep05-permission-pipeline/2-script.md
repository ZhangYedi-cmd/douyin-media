# 成稿 · 口播稿（EP05 · Claude Code 凭什么敢让 AI 在你电脑上跑命令？）

> 系列：Claude Code 源码解读 S1E5 ｜ 结构：安全焦虑（一条命令的闯关）｜ 目标时长 约 3min
> 这是口播稿**唯一真相源**；web-video-presentation 里的 script.md 是它的派生件，以本文件为准。
> 所有技术结论溯源见文末「事实核对」，逐条指到 source_repo 行号。
> ★ 据实校准：
>   1）AI 分类器那一层只在「全自动 auto 模式」下触发，且在外部开源构建里是 ANT-only 特性，脚本表述为「全自动模式下多一道 AI 判断」，不夸大成默认常开。
>   2）「连看一眼 git 状态都要先信任」的锚点在 `src/main.tsx`（plan frontmatter 误写成 context.ts），已据实改。
>   3）结尾承接钩对齐**实际下一集 EP06（并发工具调度）**，非 plan 随手写的某集。

---

## 钩子（前 3 秒 · 冷开，不依赖上下文）
AI 在你电脑上敲下 `rm -rf`，到真正执行，中间隔着几道关卡？
我数了下 Claude Code 的源码——五道。少一道，你的硬盘都危险。

## 场景代入 · 恐惧具象化
先把这事说透：一个能跑任意命令的 AI，理论上能删你的库、偷你的数据、给你装个后门。
你敢让它在你电脑上跑，不是因为它乖，是因为它跑每条命令之前，都要先过一条安检流水线。
源码里这条流水线，我拆出来是五层。一层一层放给你看。

## 关卡一：规则匹配（毫秒级，最先拦）
第一关，规则匹配。
你在配置里写过的允许和禁止——比如「只放行 git 开头的命令」「这个工具一律禁掉」——在这里第一时间比对。
命中禁止规则，当场毙掉；命中允许规则，直接放行。这一关是纯查表，毫秒级，最快。
源码里整套权限就三种结果：放行、拒绝、问我。每一步给的不只是结论，还带一条「为什么」的原因链，全程可审计。

## 关卡二：工具自检（每个工具有自己的脑子）
规则没拦住，进第二关：工具自检。
关键点在这——每个工具有它**自己**的安全逻辑。
最典型是 Bash 工具，它真的懂 shell 语法：它会把你这条命令拆开来看，管道后面、分号后面藏着的危险命令，照样能给你揪出来。
不是简单匹配个前缀就完事，是解析整条命令再判断。

## 关卡三：全自动模式下，再叫一个 AI 来判断
第三关，有意思了。
如果你开了「全自动」模式——不想每条都点确认——它不会直接放行，而是再叫**另一个 AI** 来判断：这个操作，像不像你平时会同意的？
相当于给全自动模式配了个 AI 监工。它要是觉得不对劲，照样能把请求拦下来。

## 关卡四：Hook 拦截（你自己写的关卡）
第四关，是留给你自己的。
Claude Code 允许你挂自定义钩子，在工具执行前插一脚。
你的钩子可以返回三个态度：放行、拒绝、或者改成「问我」。
说白了，这一关是你亲手写的安检逻辑——想拦什么、想怎么拦，你自己定，源码给你留好了口子。

## 关卡五：弹窗问你（前四关拿不准，决定权还给人）
前面四关，但凡有一关拿不准、给了个「问我」，那就走到最后一关——弹窗，问你。
这是兜底：机器不替你做有风险的决定，把最终那一下，交还到你手上。
你看，从规则、到工具自检、到 AI 判断、到你的钩子，最后才是问你本人。能放行的早放行了，能拦的早拦了，真正弹到你面前的，都是机器自己都拿不准的。

## 最妙的细节：连看一眼 git 状态，都要你先点「信任」
但真正让我服气的，是一个你根本不会注意到的细节。
Claude Code 一打开你的项目，想读一下 git 状态——就这么个看起来人畜无害的操作——它都要先确认：你点过「信任这个目录」了吗？没点，它连看都不看。
为什么这么谨慎？因为 `git status` 这种命令，能通过 git 的钩子和配置，偷偷执行任意代码。
你以为只是瞟一眼仓库状态，可一个动了手脚的仓库，光这一眼就能让你中招。
所以它的逻辑是：在你点头之前，连最无害的操作都先摁住。这就是「扫码送礼品」其实是木马——看一眼都可能出事。

## 升华 + 结尾钩 + 互动
所以回到开头那个问题：它凭什么敢让 AI 在你电脑上跑命令？
不是因为胆子大，是因为关卡够硬。
一个 Agent 能放出去多大的权，取决于它的权限系统设计得有多严。敢放权，前提是先把篱笆扎死。
过了权限关，下一个问题就来了——十个工具同时开跑，它们怎么不互相把你的文件写坏？下一集，咱们拆并发调度。
互动留个问题：**你敢给 AI 开「全自动免确认」模式吗？敢的扣 1，不敢的，评论区说说你最怕它干啥。**

---

## 分镜 / 高亮速记（给 web-video-presentation 对齐）
| 段落 | 关键画面 | 高亮数字/词 |
|---|---|---|
| 钩子 | `rm -rf` 命令撞上一排闸门 | **五道关卡 / 少一道硬盘都危险** |
| 场景 | AI 能删库/偷数据/装后门 → 安检流水线 | **跑每条命令前先过安检** |
| 关卡一 | 配置规则查表，allow/deny/ask 三态分流 | **规则匹配 / 三态 / 原因链可审计** |
| 关卡二 | Bash 拆解命令，揪出管道里的危险命令 | **工具自检 / 懂 shell 语法** |
| 关卡三 | auto 模式叫另一个 AI 当监工 | **全自动模式 / AI 判断层** |
| 关卡四 | 用户自定义 Hook 插一脚，可改写否决 | **Hook 拦截 / allow·deny·ask** |
| 关卡五 | 前四关拿不准 → 弹窗问人 | **兜底问你 / 决定权还给人** |
| 最妙细节 | 看 git 状态前先要「信任此目录」 | **git status 能跑任意代码 / 先信任再看** |
| 结尾 | 五道闸门叠合 + EP06 并发预告 | **EP06 预告：10 个工具同时跑不写坏文件** |

## 事实核对（交审用，逐条可溯源）
> source_repo: `/Users/yedi/yedi-study/yedi-ai-study/claude-code-source/claude-code-main`
- **权限主管道 + 顺序** ← `src/utils/permissions/permissions.ts:1179` `hasPermissionsToUseToolInner`：
  1a deny 规则(:1192) → 1b ask 规则(:1205) → 1c 工具自检 `tool.checkPermissions`(:1237) →
  1e `requiresUserInteraction`(:1252) / 1f 内容级 ask 规则(:1265) / 1g `safetyCheck`（`.git/`/`.claude/` 等 bypass-immune，:1276）→
  2a bypass 模式(:1289) / 2b `toolAlwaysAllowedRule`(:1305) → 3 `passthrough → ask`(:1321)。
- **三态结果 + 可审计原因链** ← `src/types/permissions.ts:45`（`PermissionBehavior = 'allow' | 'deny' | 'ask'`）；
  另有内部 `'passthrough'`(`PermissionResult`:257)；各决策带 `decisionReason`(:181,206,235)。
- **关卡一（规则匹配）** ← `getDenyRuleForTool`/`getAskRuleForTool`/`toolAlwaysAllowedRule`（permissions.ts:287,297,275；调用见 1a/1b/2b）。
- **关卡二（工具自检懂 shell）** ← Bash 走 `tool.checkPermissions`(:1237)；shell 解析 `src/utils/bash/bashParser.ts`；危险命令识别 `src/utils/permissions/bashClassifier.ts`。
- **关卡三（auto 模式 AI 分类器）** ← `src/utils/permissions/permissions.ts:519-602`（外层 `hasPermissionsToUseTool`：结果为 `ask` 且 `mode==='auto'`、`feature('TRANSCRIPT_CLASSIFIER')` 时走分类器）。
  ★ 据实标注：该 feature 在外部开源构建是 ANT-only stub（`bashClassifier.ts` 头注 "classifier permissions feature is ANT-ONLY"）；脚本表述为「全自动模式下多一道 AI 判断」，**未声称默认常开**，符合不夸大。
- **关卡四（Hook 拦截）** ← `src/utils/hooks.ts:633-660`（`hookSpecificOutput.hookEventName==='PreToolUse'` 时 `permissionDecision` 可取 `'allow'|'deny'|'ask'`；`deny` 产 `blockingError`）。类型见 hooks.ts:346,500-502。
- **关卡五（弹窗问人）** ← `permissions.ts:1321` passthrough→`ask`；外层非 auto/dontAsk 模式下回落到向用户提示确认。
- **★ 最妙细节（git 状态先信任）** ← `src/main.tsx:501-527` `prefetchSystemContextIfSafe`：交互模式仅 `checkHasTrustDialogAccepted()` 为真才 `getSystemContext()`/读 git status；注释 :503 明写 "Git commands can execute arbitrary code via hooks and config (e.g., core.fsmonitor, diff.external)"。trust 边界说明 `src/interactiveHelpers.tsx:170`。
  ★ 纠偏：plan frontmatter 把锚点写成 `src/context.ts`，实际在 `src/main.tsx`；`context.ts` 只有 `getGitStatus`（无 trust 门控）。
- **结尾钩对齐 EP06**：日更按 episode 升序，下一集 = EP06「10 个工具同时跑，为什么不会把你的文件写坏」（并发工具调度）。承接钩据实改指 EP06，非 plan 随手写的某集。
- **合规**：无臆造数据；「五道关卡」是对源码多层管道的口语化归纳（非声称源码里有一个叫"5"的常量）；无违禁词/绝对化营销话术/口播导流。
