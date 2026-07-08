# 成稿 · 口播稿（EP09 · 同一份代码，怎么同时支持 Claude、GPT、Gemini）

> 系列：Claude Code 源码解读 S2E9 ｜ 结构：工程美学（翻译官 / 流适配器 / 适配器模式落地）｜ 目标时长 约 3min
> 这是口播稿**唯一真相源**；web-video-presentation 里的 narrations.ts 是它的派生件，以本文件为准。
> 所有技术结论溯源见文末「事实核对」，逐条指到 source_repo 行号。
> ★ 据实校正（plan vs 源码）：
>   1）plan 钩子写「核心代码一行都没改」——略夸大。源码 `claude.ts:1334-1372` 里**有**按 provider 的条件分发分支
>      （`if (getAPIProvider() === 'openai') yield* queryModelOpenAI(...)` …）。准确说法：**下游干活的那套代码**
>      （agent 循环、工具系统、UI）一行不动；新增 provider 只在分发处加一行 import 分支 + 新建一个适配目录。
>   2）plan 说「7 个 provider」——核到 `providers.ts:6-13` `APIProvider` 联合类型确有 7 个值，但其一 `firstParty`
>      = 自家 Claude，另外 6 个里 openai/gemini/grok 是别家模型、bedrock/vertex/foundry 是云上部署通道。脚本据实表述。
>   3）plan 说「流式逐 delta、不攒包、延迟为零」——事件级属实（每收到一个事件即翻即吐），但 SSE 解析有**协议必需**的
>      帧级缓冲（找 `\n\n` 帧边界，`responsesAdapter.ts:193-222`）。脚本说「每收到一个片段就当场翻、当场传」，不喊「零缓冲」。

---

## 钩子（前 3 秒 · 冷开，不依赖上下文）
Claude Code 改一个环境变量，就能让它去跑 GPT、跑 Gemini。而下游干活的那套代码，一行都不用动。怎么做到的？

## 难点：每家大模型，长得都不一样
难点在哪？每家大模型的接口，消息长什么样、流式怎么往外吐、工具怎么调用，格式全不一样。
硬接，就得到处写判断分支，改一处，崩三处。

## 过桥：它的解法，像一个职业
Claude Code 的解法，特别像现实里的一个职业——同声传译。

## 类比：国际会议上的同声传译
想象一个国际会议：台上有人说英语、有人说日语、有人说法语。台下听众只懂中文，却全程毫无障碍。
靠的就是隔间里那个同声传译。

## 方案：API 层放一个翻译官
Claude Code 在接口这一层，放的就是这么个翻译官。
GPT 那边吐出来的流式事件，进来之后被逐条翻译成 Claude 自己的内部格式，再吐给下游。

## 关键一个字：流式
关键就一个字，流式。
它不是等 GPT 把一整段说完再翻，而是每收到一个小片段，当场翻译、当场传出去，延迟几乎感觉不到。

## 翻译是怎么对应的
怎么翻？一一对应。
GPT 的"文字增量"事件进来，翻成 Claude 的"文本块增量"；"调用工具"的事件进来，翻成 Claude 的"工具使用"。每一种事件，都有它对应的译文。

## 下游浑然不觉
翻完之后，下游那套循环、工具、界面，拿到的永远是同一种格式。
它们压根不知道，刚才在背后干活的，是 GPT，还是 Claude。

## 设计点开场
这套设计，我挑三个点说说，看完你会觉得挺讲究。

## 设计点一：一家模型，一个文件夹
第一，每接一家模型，就单开一个文件夹。GPT 一个、Gemini 一个、Grok 一个，各装各的翻译官，互不打扰。

## 设计点一·延伸：加新模型多省事
所以加一个新模型，等于请一个新翻译官——新建一个文件夹，再在分发的地方加一行判断。
旧代码，一个字都不用碰。

## 设计点二：到底用哪家，谁说了算
第二，到底用哪家模型，源码里一个函数说了算，优先级很清楚：
你在设置里指定的，最优先；其次看环境变量；什么都不设，默认就走自家的 Claude。

## 设计点三：列表里到底有几家
第三，这个模型列表，源码里一共列了七种：自家的 Claude，加上 GPT、Gemini、Grok 这些别家模型，还有三种云上的部署通道。
想换哪家，就是改个开关的事。

## 升华：这就是适配器模式
退一步看，这就是设计模式里那个"适配器模式"，落到真实工程里，最干净的一个样子。

## 升华·点透
课本上有句老话：对扩展开放，对修改关闭。听着像八股。
可在这儿，你看到了它真金白银的回报——再接十家模型，下游代码一行不动。克制和分层，省下的全是维护成本。

## 结尾钩
模型能随便换了。那下一个问题就来了：
干活的那个 AI，能不能再分身，自己给自己派活？下一集，聊聊 Claude Code 里的子 Agent——AI 给 AI 打工。

## 互动
互动留个问题：你主力用哪家模型，Claude、GPT、Gemini，还是国产的？评论区站个队。

---

## 分镜 / 高亮速记（给组件对齐）
| 段落 | 关键画面 | 高亮数字/词 |
|---|---|---|
| 钩子 | 一个环境变量开关被拨动，同一套代码下方接出 GPT / Gemini 三个出口 | **改一个环境变量 / 下游代码一行不动** |
| 难点 | 三家 API 的消息/流式/工具格式并排，形状各异、对不上 | **格式全不一样 / 改一处崩三处** |
| 过桥 | "同声传译"四个字浮现 | **解法 = 同声传译** |
| 类比 | 会议室：英/日/法 → 翻译隔间 → 听众只听到中文 | **多语种进 → 一种语言出** |
| 方案 | API 层一个翻译亭：GPT 流事件进 → Claude 内部格式出 | **API 层放翻译官** |
| 流式 | 小片段一颗颗进翻译亭，即进即出，不攒整段 | **流式 / 即翻即传** |
| 对应 | 事件映射表：文字增量→文本块增量 / 调用工具→工具使用 | **一一对应** |
| 下游无觉 | 下游循环/工具/UI 三个盒子，标"同一种格式"，背后 GPT/Claude 灰掉 | **下游拿到同一种格式 / 浑然不觉** |
| 设计开场 | "三个点" | **三点设计** |
| 文件夹 | src/services/api 下 openai / gemini / grok 三个并列文件夹 | **一家模型一个文件夹** |
| 加新模型 | 新建 newprovider/ 文件夹 + 分发处 +1 行 | **加目录 + 加一行 / 旧码不碰** |
| 选择优先级 | 优先级阶梯：设置 > 环境变量 > 默认 Claude | **设置 > 环境变量 > 默认 Claude** |
| 七种 | 列表：Claude + GPT/Gemini/Grok + Bedrock/Vertex/Foundry | **共 7 种 / 改开关即换** |
| 升华1 | "适配器模式"标题 | **Adapter 适配器模式** |
| 升华2 | 天平：对扩展开放 / 对修改关闭，"加十家下游不动" | **开放扩展·关闭修改 / 接十家下游一行不动** |
| 结尾钩 | EP10 预告：一个 AI 分裂成多个子 Agent | **EP10：子 Agent，AI 给 AI 打工** |
| 互动 | Claude/GPT/Gemini/国产 四个投票位 | **你主力用哪家？** |

## 事实核对（交审用，逐条可溯源）
> source_repo: `/Users/yedi/yedi-study/yedi-ai-study/claude-code-source/claude-code-main`
- **provider 列表 = 7 种（含自家 Claude）** ←
  `src/utils/model/providers.ts:6-13` `export type APIProvider = 'firstParty' | 'bedrock' | 'vertex' | 'foundry' | 'openai' | 'gemini' | 'grok'`。
  其中 `firstParty` = 自家 Anthropic/Claude；`openai/gemini/grok` = 别家模型；`bedrock/vertex/foundry` = 云上部署通道。
  ★ 据实表述：脚本说「一共七种：自家 Claude + GPT/Gemini/Grok + 三种云上通道」，不含糊成"7 个别家模型"。
- **选择优先级 = 设置 > 环境变量 > 默认 Claude** ←
  `src/utils/model/providers.ts:15-32` `getAPIProvider()`：先 `settings.modelType`（`openai/gemini/grok`）；
  再 `CLAUDE_CODE_USE_BEDROCK/VERTEX/FOUNDRY`（云通道环境变量）；再 `CLAUDE_CODE_USE_OPENAI/GEMINI/GROK`；
  全不命中 `return 'firstParty'`（默认 Anthropic）。脚本口语化为「设置最优先 > 环境变量 > 默认 Claude」属实。
- **翻译官 = 流式适配器（逐事件翻译）** ←
  `src/services/api/openai/responsesAdapter.ts:249-443` `adaptResponsesStreamToAnthropic(stream, model)`：
  `async function*`，`for await (const event of stream)`（`:286`）逐帧消费 GPT(Responses API) 的 SSE 事件，
  即时 `yield` 出 Anthropic 的 `BetaRawMessageStreamEvent`。请求方向转换在 `convertMessagesToResponsesInput()`（`:61`，Anthropic→OpenAI 输入）。
- **事件一一对应（映射表）** ←
  `responsesAdapter.ts`：`response.output_text.delta`→`content_block_delta`(text_delta)（`:290-312`）；
  reasoning→thinking_delta（`:315-337`）；`response.output_item.added`→`content_block_start`(tool_use)（`:340-374`）；
  `response.function_call_arguments.delta`→`content_block_delta`(input_json_delta)（`:377-391`）；
  `response.output_item.done`→`content_block_stop`（`:394-405`）；`response.completed/incomplete`→`message_delta`+`message_stop`（`:419-441`）。
- **「即翻即传」+ 帧级缓冲澄清** ←
  事件级零攒包（每个 event 立即 yield）属实；但 SSE 解析 `parseSSE()`（`:193-222`）有**协议必需**的字节缓冲找 `\n\n` 帧边界。
  ★ 脚本说「每收到一个小片段，当场翻、当场传」，**不喊「零缓冲/延迟为零」**，避免夸大。
- **一家模型一个目录 + 加新 provider 不碰旧码** ←
  目录 `src/services/api/{openai,gemini,grok}/`（各含 `index.ts` 导出 `queryModel<Provider>`、`client.ts` 等）；
  分发在 `src/services/api/claude.ts:1334-1372`：`if (getAPIProvider()==='openai'){ const {queryModelOpenAI}=await import('./openai/index.js'); yield* queryModelOpenAI(...) }`，
  gemini/grok 同构分支。加新模型 = 新建目录 + 此处加一条 import 分支 + `providers.ts` 加类型/环境变量，旧代码不动。
- **下游归一、无感知** ←
  所有 provider 最终都 `yield` 成 Anthropic SDK 的统一事件/消息类型（`StreamEvent` / `AssistantMessage`，
  见 `packages/@ant/model-provider/src/types/message.ts`；`claude.ts` 下游 `for await (const event of adaptedStream)` 只 switch 这套 Anthropic 事件）。
  → agent 循环 / 工具 / UI 拿到的永远同一种格式，不知道背后是 GPT 还是 Claude。
- **结尾钩对齐 EP10**：日更按 episode 升序，下一集 = EP10「Claude Code 里的子 Agent」（AI 给 AI 打工）。
- **合规**：无臆造数据；7 种 provider、优先级顺序、函数名、事件映射均溯源上述行号；据实校正 plan 的「核心代码一行没改 / 零缓冲」夸大表述；
  「适配器模式 / 对扩展开放对修改关闭」是对设计取舍的工程化点评，非营销承诺；无违禁词/绝对化/口播导流。
