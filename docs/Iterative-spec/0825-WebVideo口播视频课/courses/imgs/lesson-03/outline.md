---
style: cartoon-ops
density: balanced
image_count: 3
---

## Illustration 1

**Position**: §一「给时间线配上声音」链路说明之后
**Purpose**: 把 script.md 到 mp3 的真相源派生链画成一条可追踪流水线。
**Type**: pipeline
**Visual Content**: 口播稿逐层派生到网页文案、分段 JSON 和 mp3，字幕从同一文本分支出去。
**Key Labels**: script.md、narrations.ts、npm run extract-narrations、audio-segments.json、tts-dub、public/audio
**Filename**: 01-pipeline-truth-source-chain.png

## Illustration 2

**Position**: §5.2「死气」处理规则之后
**Purpose**: 并列解释多音字和死气两类 TTS 病，以及不同修复手段。
**Type**: split-compare
**Visual Content**: 左侧多音字按语境处理，右侧死气按静音阈值扫描和压缩。
**Key Labels**: 各十几行、就得打折、诚实得多、overrides、0.45 秒、depause、.tmp.mp3
**Filename**: 02-split-compare-tts-failures.png

## Illustration 3

**Position**: §六「一次音画不符事故」三步纪律之后
**Purpose**: 把改文案后的强制重生成纪律画成四道门，防止旧派生件被跳过。
**Type**: gate-chain
**Visual Content**: 重抽分段、删除旧 mp3、重新合成、源同步检查四道连续关卡。
**Key Labels**: npm run extract-narrations、rm public/audio/<chapter>/<step>.mp3、synthesize.mjs、check-source-sync.mjs
**Filename**: 03-gate-chain-resync-discipline.png
