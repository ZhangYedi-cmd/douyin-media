# 材料盘点：第 04 课 声画组装与资产生成

## 1. 核心材料清单（已具备且经过实测）

1. 文案抽取与信封契约
- 源码定位：`.claude/skills/web-video-presentation/templates/scripts/extract-narrations.ts`
- 结构规范：`src/chapters/<folder>/narrations.ts` 与 `audio-segments.json` 之间的映射关系（`chapter`, `step`, `text`, `audio`）。
- 静音步骤设计：空字符串台词自动跳过生成 TTS 任务，避免生成无意义静音音频。

2. TTS 引擎与配置注入
- 源码定位：`.claude/skills/tts-dub/scripts/synthesize.mjs` 与 `.claude/skills/tts-dub/scripts/providers/minimax.mjs`
- 关键特性：直调 MiniMax HTTP API（绕开 `mmx` CLI 参数格式化缺陷）、念法规整（`normalize`）与字幕源解耦、指数退避重试（3 次重试，`800ms * attempt`）。
- 配置文件结构：`brain/tts.config.json` 中的全局参数（`voice_id`, `speed`, `pitch`, `normalize`）与逐段覆盖（`overrides`）。

3. 多音字与单段调优实战
- 真实案例：技术术语多音字（行高 `háng` vs 执行 `xíng`；重载 `chóng` vs 重要 `zhòng`）。
- 逐段 overrides 机制：针对单个 `chapter/step` 注入拼音声调数组（`["行/(hang2)"]`），防止全局字典误伤其他段落。
- 同段同字两读极限情况：单段内相同文字存在两种读音时的文案重构解法（换用无歧义词汇）。

4. 工程防御与前置余额探测
- 故障场景：批量合成 30+ 音频时遇到 MiniMax 1008 余额耗尽错误，导致半成品与算力浪费。
- 探测与熔断机制：合成前单段极短探测，遇到 1008 优雅挂起，状态置为 `drafting`，推送飞书充值告警。
- 增量合成与重试：根据文件存在性自动跳过已生成音频，支持 `--force` 和 `--only`。

5. 9:16 竖版封面自动化生成
- 平台逻辑：抖音 9:16 竖屏展示特性与 16:9 横屏截图黑边/小字陷阱。
- 视觉规范与提示词：`assets/cover-prompt.md`，顶部胶囊徽章、中间吉祥物主体与道具交互、底部大字双行标题。
- 参考图锚定：使用 `baoyu-image-gen` 携带 `--ref` 锁定首集封面角色、黑底科技基调与配色。

6. 质量验收与防退化体检
- 脚本定位：`.claude/skills/dubbing-check/scripts/`（`check-completeness.mjs`, `check-pace.mjs`, `check-silence.mjs`, `check-source-sync.mjs`）。
- 自动化指标：音频丢失扫描、语速离群值检测、静音长度检测。

## 2. 篇幅与结构规划

- 目标字数：8000 至 10000 汉字（正文纯中文 8000+ 字）。
- 结构安排：
  - 第 1 节：文案解耦：从前端组件中提取台词清单（约 1800 字）
  - 第 2 节：高拟真语音合成：接入 tts-dub 与注音覆盖（约 2600 字）
  - 第 3 节：批量合成与工程防御：前置探测与容错（约 1800 字）
  - 第 4 节：视觉门面：生成高辨识度的 9:16 竖版封面（约 1800 字）
  - 第 5 节：质量验收与防退化闭环（约 1200 字）
