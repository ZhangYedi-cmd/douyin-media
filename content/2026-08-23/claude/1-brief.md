# 选题 Brief

- **标题方向**：你让 Claude 写的每段字，都被悄悄打上了「暗号」——文本水印机制拆解
- **支柱**：depth（机制拆解立身题，带强时效）
- **形式**：口播
- **目标人群**：所有用 Claude / AI 写东西的工程师与内容创作者（切身利益题，受众宽口径）
- **核心钩子**（开口 3 秒说什么）：你让 Claude 写的文字里，可能已经被埋进了一个你看不见的暗号——复制粘贴它还跟着走。
- **要讲清的 1–3 个点**：
  1. 暗号怎么埋：写作 = 一连串选词，水印用密钥+前文替模型「掷骰子」定同义选择（DeepMind SynthID-Text，2024 Nature）。
  2. 谁能验、验出什么：只有拿密钥的 Anthropic 能算；给的是概率不是盖章；短文本/大改写查不出；代码不打水印（注释会打）。
  3. 为什么与争议：欧盟 AI 法案驱动、全球生效、老模型分月补上；Gruber（个人观点）批「算法替你选词是对写作的污染」。
- **takeaway / 互动引导**：验出水印 =「Claude 参与过」≠「AI 写的」；强 CTA：评论区扣「水印」换机制笔记（benchmarks：软 CTA 已证无效）。
- **信息来源**（可溯源，全部 2026-08-26 实抓核对）：
  - Anthropic 官方公告（2026-08-14）：https://www.anthropic.com/news/claude-text-watermark
  - Claude 支持文档：https://support.claude.com/en/articles/16266773-how-claude-marks-ai-generated-content
  - Gruber 批评（个人观点）：https://daringfireball.net/2026/08/anthropics_watermark_text_adulteration_in_claude_is_a_perversion_of_writing
  - declaude.org 交互式机制讲解：https://declaude.org/watermarking/
- **打分**：promote 自 backlog `2026-08-19-001` 带入：4.5 / S（practical 3, social 5, emotion 5, hook 5, timeliness 5, trigger 4，含 +0.15 立身软加成）
- **预估**：偏深度沉淀，兼具流量爆发面（HN 815 分本周最热 AI 事件；宽口径切身利益题，符合 benchmarks「宽口径破圈」打法）

## 口径纪律（backlog 带入 + 抓取核实后补充）
- 检测是**概率性**的，只有 Anthropic 有密钥能验自家水印——勿说「百分百可检测」。
- 市面第三方「AI 检测器」（GPTZero/Pangram 类）走文风分析，**验不了**这个水印，两者别混。
- 「超 200 token 才打水印」这一具体阈值在官方两源中**未核实到**，稿内不引用具体数字，只说「太短的文本查不出来」。
- 老模型是「接下来几个月分阶段」补水印，**不说**「所有 Claude 输出已全部生效」；钩子用「可能已经」留余地。
- Gruber 的批评必须归因为其个人观点。
- 水印可被大幅改写稀释是官方自认的限制，作为机制事实讲，**不做**「教你去水印」的引导。
