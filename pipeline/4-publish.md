# 阶段 4 · 发布

> 用 **`douyin-publish`** 技能（薄封装，底层调 social-auto-upload 的 `sau` CLI）。
> 硬约束：先 dry-run 拼出命令+物料，**经 `feishu-notify` 推回飞书做二次确认，人点确认后才真发**（发布不可逆；阶段 3 过审 ≠ 发布授权，发布要再确认这一次）。

## 发布物料 `4-publish.md`
> ★ **时机与字段格式以 `2-create.md` 终检闸 G 为准**（出审前必产，L5/L6）——本阶段只消费它，不产它。
> 物料含：标题（含钩子）/ 正文简介 / 话题标签 3–5 个 / 封面路径 / 媒体文件清单；发布时段只写散文备注。

## 发布流程
1. 人在飞书审核卡点「通过」→ server 自动拼最终 sau 命令+物料 → 推「确认发布」卡。
2. 人点「确认发布」→ `claude -p /douyin-publish <slug> --publish` 真发（成败以 meta.status 变化判定）。
3. 失败先原样重试一次（L7 慢渲染超时 / L8 UI 浮层，重跑常一次过），仍失败转人工。

## 发布收尾（★ 状态记账的唯一位置）
发布成功后，`media publish-done <slug>` 一次做完三件记账（合法状态值见 `media publish-done --help`，唯一定义 = `core/state.ts`），**其它环节不代翻**：
1. `meta.yaml` 翻至终态 + 回填实际时间/链接到 `4-publish.md`。
2. `backlog.yaml` 对应条目同步翻转（漏翻曾发生两次，靠 daily-run 事后补——L 记账教训，故收口到这一处）。
3. `dashboard.md` 在制表移出该条。

## 发布时段参考（初版假设，按复盘修正）
- 工作日午休 12:00–13:00、晚间 19:00–22:00。

## 用到的 skill
**`douyin-publish`**（`.claude/skills/douyin-publish/`）——薄封装，底层调 `sau` CLI。
- 引擎：`tools/social-auto-upload`（uv+py3.12，已实测登录/校验/上传全通）
- 模式：dry-run（默认，拼命令+物料给人看）/ --publish（确认后真发）
- 字段映射见 `references/field-mapping.md`；环境/登录见 `references/sau-setup.md`
