# 发布物料

- **标题**：为了检测你按没按 Shift，它直接调了 macOS 系统底层｜都说 JS 是玩具语言，可它六十多行就读到了键盘物理状态｜Claude Code 源码解读 EP12
  - 备选：JS 干不了底层？Claude Code 用六十多行直接调了 macOS 系统框架，没写一行 C｜拆 bun:ffi 与跨平台键鼠三套后端
- **正文/简介**：都说 JavaScript 是写网页的玩具语言、干不了底层。可 Claude Code 用 JavaScript 直接读出了你键盘的物理状态，没写一行 C，也没编译任何东西。它想知道的只是你那一刻有没有按住 Shift 键，按常规思路这得写 C、调系统接口、编译成二进制再分发；它偏不，靠的是 Bun 运行时内置的 FFI，外部函数接口，让 JS 直接跟操作系统喊话。整个过程就一个文件、六十多行：第一步用 dlopen 打开 macOS 自带的 Carbon 框架，再声明借用一个读键盘状态的 C 函数，之后像调本地函数一样调它，调一次拿回所有修饰键状态，跟 Shift 的标志位做个按位与，按没按一目了然。更狠的是另一个功能，让 AI 模拟键鼠操作你的电脑，同一个功能写了三套后端：macOS 用 JXA 调 CoreGraphics 造鼠标事件，Windows 运行时拼出一段 C# 代码调 Win32 的 SendInput，Linux 直接包一层 xdotool，对上层却暴露同一个接口。所以语言本身没有高低，卡住它的从来不是语言，是生态和接口，Bun 把 FFI 做成内置，等于把 JS 的边界重新画了一遍。逐行可溯源，系列每天更一期。
- **话题标签**：#ClaudeCode #源码解读 #JavaScript #AI编程 #程序员
- **封面**：assets/cover.png（竖屏 9:16，1536×2752，baoyu-image-gen 仿 EP01 系列风格：复用方块像素吉祥物本体，改为从顶部把拳头砸穿「网页 WEB / 运行时 RUNTIME / 系统底层 OS」三层地板、伸到最底层抓住一枚发光的「⇧ Shift」键，暗底单热橙、橙色冲击火花；背景虚化真实源码锚点 await import("bun:ffi") / dlopen Carbon.framework / CGEventSourceFlagsState / FLAG_SHIFT / currentFlags & flag / SendInput / xdotool；标题「为了检测你按没按 Shift / 它直接调了系统底层」承担钩子；生成提示词存 assets/cover-prompt.md）
- **媒体文件**：assets/ep12-ffi-native.mp4（1920×1080，137.3s，约 11.5MB，已混音 + 烧录字幕 + 全片去停顿 + 去拉伸）

> 发布时段：本集为系列日更，无人审指定时段。默认**立即发布**（不写可解析的「建议发布时段」字段——非 datetime 文本会被原样传给 sau `--schedule` 致真发崩，见 series-production-pitfalls #5）。如需定时，由人在飞书「确认发布」时指定。

## 发布回填（人审通过后）
- **实际发布时间**：2026-06-26 21:20（立即发布，非定时）
- **账号**：main
- **链接**：sau 未返回作品链接，待去抖音「作品管理」人工补
- **发布方式**：sau douyin upload-video（cookie valid，--headed，竖版封面 cover.png）
- **sau 结果**：成功 — 日志「🥳 视频发布成功」+「Douyin video upload submitted」；5 个话题全贴、竖版封面上传完成、自主声明「内容为个人观点或见解」
