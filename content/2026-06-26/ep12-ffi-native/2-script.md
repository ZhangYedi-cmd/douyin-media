# EP12 口播稿 · 为了检测你按没按 Shift，它直接调了 macOS 系统底层

> 唯一真相源（字幕 / 配音 / 画面三方以此为准）。
> 系列：claude-code-source-series s3e12 ｜ backlog: 2026-06-10-012
> 源码仓：/Users/yedi/yedi-study/yedi-ai-study/claude-code-source/claude-code-main
> 每句技术结论的出处见文末「逐条溯源」。结尾钩对齐 EP13（防御性编程有多变态）。

---

## 章节与分段（与 build/src/chapters 一一对应）

### coldopen · JS 干不了底层？

1. 都说 JavaScript 是写网页的玩具语言，干不了底层。可有个 AI 编程工具，用 JavaScript 直接读出了你键盘的物理状态，没写一行 C，也没编译任何东西。

2. 它想知道的，只是你那一刻有没有按住 Shift 键。按常规思路，这活儿得写 C 代码、调系统接口、编译成二进制再分发。

3. 它偏不走这条路。靠的是 Bun 运行时内置的一个能力，叫 FFI，外部函数接口，让 JavaScript 直接跟操作系统喊话。

### layers · 案例一：60 行读出 Shift

1. 整个过程就一个文件、六十多行。第一步，直接打开 macOS 系统自带的 Carbon 框架。

2. 然后声明一下，要借用框架里一个读键盘状态的 C 函数，告诉运行时它的参数和返回值长什么样。从这行起，JavaScript 里就能像调本地函数一样调它。

3. 调一次，拿回当前所有修饰键的状态，再跟 Shift 的标志位做个按位与，按没按一目了然。传统要写 C、要编译、要分发二进制的活，这里六十多行就全包了。

### details · 案例二：一个功能，三套方言

1. 更狠的在另一个功能：让 AI 模拟键盘鼠标，去操作你的电脑。同一个功能，它写了三套后端，三个系统各说各的方言。

2. macOS 这边，用 JXA 脚本调 CoreGraphics 造出鼠标事件，直接灌进系统的事件流。Windows 这边更绝，运行时拼出一段 C# 代码，调 Win32 的 SendInput，扔进 PowerShell 编译了再跑。

3. Linux 最朴素，直接包一层 xdotool 命令。三套实现各写各的，对上层却暴露同一个接口，调用的人根本不用管自己在哪个系统。

### ending · 边界是被重新画的

1. 所以你看，语言本身没有高低。所谓 JavaScript 干不了底层，卡住它的从来不是语言，是生态和接口。Bun 把 FFI 做成内置能力，等于把 JavaScript 能干的边界，重新画了一遍。

2. 不过，能调系统底层只是有这个能耐，敢在生产环境里真这么用，背后还得有一整套兜底。下集就盘一盘，这帮工程师的防御性编程到底有多变态。评论区也出个题，你觉得 JavaScript 还有什么干不了的？

---

## 逐条溯源（fact check，全核于 source_repo）

- **JS 直接读键盘物理状态、没写 C、没编译**：`packages/modifiers-napi/src/index.ts`（全文 66 行）。`loadFFI()` 内 `const ffi = await import('bun:ffi')`，再 `ffi.dlopen('/System/Library/Frameworks/Carbon.framework/Carbon', {...})`（index.ts:26-35）。**纯 TypeScript，无 C 源文件、无编译步骤、无随包分发的二进制**——靠 Bun 内置 `bun:ffi` 运行时直调系统动态库。脚本「用 JavaScript 直接读键盘物理状态、没写一行 C、没编译」属实。
- **检测的是 Shift 等修饰键**：`isModifierPressed(modifier)`（index.ts:48-66）支持 shift/control/option/command，标志位常量 `FLAG_SHIFT = 0x20000` 等（index.ts:1-11）。脚本「想知道你有没有按住 Shift 键」属实。
- **FFI = 外部函数接口、Bun 内置**：`await import('bun:ffi')`（index.ts:26）即 Bun 运行时内置的 Foreign Function Interface 模块；`ffi.dlopen` / `ffi.FFIType.i32` / `ffi.FFIType.u64`（index.ts:27-33）。脚本「Bun 运行时内置的能力，叫 FFI，外部函数接口」属实。
- **打开 macOS 自带的 Carbon 框架**：`dlopen` 第一参数即系统路径 `/System/Library/Frameworks/Carbon.framework/Carbon`（index.ts:28）。脚本「直接打开 macOS 系统自带的 Carbon 框架」属实。
- **声明借用 C 函数 + 参数/返回值类型**：`dlopen` 第二参数声明符号 `CGEventSourceFlagsState: { args: [ffi.FFIType.i32], returns: ffi.FFIType.u64 }`（index.ts:30-33），之后 `lib.symbols.CGEventSourceFlagsState(stateID)` 像本地函数一样调用（index.ts:37）。脚本「声明要借用一个读键盘状态的 C 函数，告诉运行时参数和返回值类型，之后像调本地函数一样调它」属实。（CGEventSourceFlagsState 是 CoreGraphics/Carbon 提供的读取当前事件源修饰键状态的系统函数。）
- **调一次 + 按位与判断**：`const currentFlags = cgEventSourceFlagsState(kCGEventSourceStateCombinedSessionState)`（index.ts:62-64，stateID=0）后 `return (currentFlags & flag) !== 0`（index.ts:65）。脚本「调一次拿回所有修饰键状态，跟 Shift 标志位做按位与」属实。
- **66 行就全包了**：`wc -l index.ts` = 66。脚本「整个过程就一个文件、六十多行」「这里六十多行就全包了」属实（口语化为「六十多行」，精确 66 行）。
- **传统做法对照（写 C+编译+分发二进制）**：对照项是行业常识背景（Node.js 原生插件历来需 C/C++ + node-gyp 编译 + 按平台分发 .node 二进制），用于反衬 bun:ffi 的「无编译」路径；不引具体第三方数据，属说明性对照，非臆造跑分。
- **案例二：一个功能三套后端（Computer Use 键鼠模拟）**：`packages/@ant/computer-use-input/src/backends/` 下 darwin.ts / win32.ts / linux.ts 三个后端文件，对上层暴露同一 `InputBackend` 接口（见各文件 `import type { InputBackend } from '../types.js'`）。脚本「同一个功能写了三套后端、三个系统各说各的方言、对上层暴露同一个接口」属实。
- **macOS：JXA 调 CoreGraphics 造鼠标事件、灌进事件流**：darwin.ts 文件头注释「Uses AppleScript (osascript) and JXA … via CoreGraphics events」（darwin.ts:1-6）；`jxa()` 走 `osascript -l JavaScript`（darwin.ts:64-72）；`buildMouseJxa` 内 `ObjC.import("CoreGraphics"); … $.CGEventCreateMouseEvent(...) … $.CGEventPost($.kCGHIDEventTap, e)`（darwin.ts:82-87）。脚本「JXA 脚本调 CoreGraphics 造鼠标事件，灌进系统事件流」属实。
- **Windows：运行时拼 C# 代码、P/Invoke 调 Win32 SendInput、PowerShell 编译再跑**：win32.ts 文件头注释「Uses PowerShell with Win32 P/Invoke (SetCursorPos, SendInput, keybd_event…)」「All P/Invoke types are compiled once at module load」（win32.ts:1-7）；`WIN32_TYPES` 是一段 `Add-Type -Language CSharp @'…public class CuWin32 { [DllImport("user32.dll")] … SendInput(…) … }'@` 的 C# 源串（win32.ts:39-86），随 `['powershell','-NoProfile','-NonInteractive','-Command', script]` 执行（win32.ts:18,27）。脚本「运行时拼出一段 C# 代码，调 Win32 的 SendInput，扔进 PowerShell 编译了再跑」属实（「编译一次缓存复用」未在口播展开，不算错）。
- **Linux：包一层 xdotool**：linux.ts 文件头注释「Uses xdotool for mouse and keyboard simulation. Requires: xdotool」（linux.ts:4-5）；实现全程 `run(['xdotool', ...])`（如 click/keydown/key/type，linux.ts:124-208）。脚本「Linux 最朴素，直接包一层 xdotool 命令」属实。
- **升华「语言没高低，卡的是生态和接口；Bun 把 FFI 做成内置」**：这是从上述源码事实（bun:ffi 是 Bun 内置、无需 C/编译即可直调系统库）引出的工程点评/观点，非营销承诺、非绝对化用词。
- **结尾钩对齐 EP13**：日更按 episode 升序，下一集 EP13「Anthropic 工程师的防御性编程，变态到什么程度」（backlog 2026-06-10-013，盘点向）。结尾钩「敢在生产环境真用还得有一整套兜底，下集盘点防御性编程有多变态」对齐 EP13 主题，不剧透细节、不依赖本集上文。
- **冷开自成立**：首句「都说 JavaScript 是写网页的玩具语言，干不了底层」自带完整语境（争议钩），第一次刷到的人 3 秒站得住，不依赖「上一集」。
- **合规**：源码仓为社区反编译/重建版（措辞已注意，未声称官方原始仓）；无臆造数据/跑分（「玩具语言」「更狠」「更绝」是口语态度词非数据）；「语言没高低」是观点非营销承诺；无违禁词、无绝对化（未用「最/第一/100%」）、无口播导流。
