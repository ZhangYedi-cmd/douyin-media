# 阶段 4 · 发布

> 用 **`douyin-publish`** 技能（薄封装，底层调 social-auto-upload 的 `sau` CLI）。
> 铁律：先 dry-run 拼出命令+物料，**经 `feishu-notify` 推回飞书做二次确认，人点确认后才真发**（发布不可逆；阶段 3 过审 ≠ 发布授权，发布要再确认这一次）。

## AI 备齐的发布物料（写入 `4-publish.md`）
> ★ **时机**：`4-publish.md` 在**出审阶段（阶段 2 终检闸 G）就要产**，不是等到阶段 4。
> 因为飞书「过审 → 确认发布」卡在人点过审后**立即**读它拼 sau 命令（早于本阶段）。
> 本阶段（阶段 4）只负责**发布后回填**（实际时间/链接/状态）。
- 成稿标题（含钩子）
- 正文/简介文案
- 话题标签（#，3–5 个，蹭相关热搜）
- 封面图路径（`assets/`）
- 发布时段：写成**散文备注**即可，**不要**用可解析的「建议发布时段」bullet（非 datetime 文本会被原样塞进 sau `--schedule`）；默认立即发布，要定时由人在确认卡指定
- 口播视频文件 / 图文图片清单

## 人工发布步骤
1. 核对物料齐全。
2. 上传抖音、贴标题/话题/封面、设定发布时间。
3. 把发布链接、实际发布时间回填 `4-publish.md`。
4. `meta.yaml` status=`published`（或 `scheduled` 若排期），更新 `dashboard.md`。

## 发布时段参考（初版假设，按复盘修正）
- 工作日午休 12:00–13:00、晚间 19:00–22:00。

## 用到的 skill
**`douyin-publish`**（`.claude/skills/douyin-publish/`）——薄封装，底层调 `sau` CLI。
- 引擎：`tools/social-auto-upload`（uv+py3.12，已实测登录/校验/上传全通）
- 模式：dry-run（默认，拼命令+物料给人看）/ --publish（确认后真发）
- 字段映射见 `references/field-mapping.md`；环境/登录见 `references/sau-setup.md`
