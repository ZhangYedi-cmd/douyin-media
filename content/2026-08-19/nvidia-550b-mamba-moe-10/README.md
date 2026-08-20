# 内容条目模板（真实 schema）

新建一条内容 = 复制本目录到 `content/<发布日>/<slug>/`。**不是每个文件都必产**，按下表来：

| 文件 | 谁产 / 何时 | 必产？ |
|---|---|---|
| `meta.yaml` | promote 时（阶段 1） | ✅ |
| `1-brief.md` | promote 时从 backlog 条目回填；**系列题用 `plan_file` 替代，可不建** | 视模式 |
| `2-script.md` | 阶段 2 创作，口播稿唯一真相源 | ✅ |
| `3-review.md` | 仅当审核有记录要留（打回意见/挂起原因）；一次过审可不建 | 按需 |
| `4-publish.md` | ★ 阶段 2 出审前产（终检闸 G，L5），**不是**等到阶段 4 | ✅ |
| `5-retro.md` | 治理线复盘（`douyin-retro`）填 | 治理线 |
| `assets/` | 成品媒体：`cover.png` + 成片 mp4（媒体本体已 gitignore） | ✅ |
| `build/` | 口播创作工作区（Vite 工程），不进模板、整目录 gitignore | 口播才有 |
| `demo/` | 实验/演示产物工作区，整目录 gitignore | 按需 |

> 档案层（上表 md + meta）进 git；工作区（build/demo）与媒体本体不进。状态只写 `meta.yaml`（阶段是状态字段，不是目录位置）。
