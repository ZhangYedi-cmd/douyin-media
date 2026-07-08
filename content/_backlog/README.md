# 选题池

`backlog.yaml` 是选题的**唯一真相来源**——所有候选题、状态、复盘数据都在这一个文件，
由 `douyin-ideate` 技能追加和维护（单文件便于去重、查状态、统计）。

- 人读的"每次调研快照"在 `../_research/`。
- 状态（粗粒度三态）：`idea → picked → published`（异常 `rejected/expired/archived`）。**细粒度生产状态在内容目录的 `meta.yaml`，backlog 不镜像**（详见 `backlog.yaml` 头部「单一真相源规则」）。
- promote 一题：`status: idea→picked` + 回填 `content_path` + 复制 `../_template/` 成 `../<发布日>/<slug>/` 进创作。发布完成再把该条置 `published`。
