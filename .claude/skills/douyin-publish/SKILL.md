---
name: douyin-publish
description: >
  把一条已审核通过(status=approved)的内容发布到抖音。底层调用 social-auto-upload
  的 `sau` CLI（tools/social-auto-upload，已装好 uv+py3.12 环境），不再手搓浏览器 DOM。
  支持视频(upload-video)/图文(upload-note)、立即/定时、多账号。硬约束：先 dry-run 出
  最终命令+物料给人确认，人授权后才真发（发布不可逆）。当用户说"发布抖音""上传作品"
  "发这条""把 XX 发出去"，或发布阶段被调用时使用。
---

# 抖音发布技能（sau CLI 封装）

发布引擎 = `tools/social-auto-upload` 的 `sau` CLI（已实测登录/校验/上传全通）。
本技能只做**薄封装**：读 content 条目 → 映射字段 → 调 sau → 留痕。

## 硬约束（不可跳过）
1. **只发 `status==approved`**。其它状态一律拒绝。
2. **dry-run / 真发由 `--publish` 这一个信号决定**：
   - **不带** `--publish` = dry-run：只拼**完整 sau 命令 + 物料摘要**给人看、**绝不执行**，然后停下等确认。
   - **带** `--publish` = 调用方已拿到人的授权（如飞书确认卡点了「确认发布」）：**直接真发，跳过 dry-run、不再求确认、不要只打印命令**。
   发布不可逆，但授权关已在调用方（人点了确认才会带 `--publish`）；`--publish` 在 = 已授权，skill 不再设第二道交互确认。
3. **不假装成功**：以 sau 输出的 `视频发布成功`/`submitted` 为准；失败则记原因、status 不动。
4. cookie 失效**不自动登录**：提示用户手动跑 login（扫码）。

## 环境约定
- 引擎目录 `SAU_DIR = /Users/yedi/douyin-media/tools/social-auto-upload`
- 调用方式：`cd "$SAU_DIR" && uv run sau douyin ...`（conf.py 已就绪，cookie 在 `SAU_DIR/cookies/`）
- 账号名 `--account`：默认 `main`（已登录）。多账号则按内容指定。
- 传给 sau 的 `--file/--images/--thumbnail` 用**绝对路径**（content 条目里的 assets）。

## 用法
```
/douyin-publish <slug>            # dry-run：拼命令+物料摘要，停下等确认（不发）
/douyin-publish <slug> --publish  # 已授权直发：跳过 dry-run、不再求确认，直接真跑 sau
/douyin-publish <slug> --when "2026-06-16 19:30"  # 覆盖发布时间（定时）
```

## 工作流

### Step 0 · 校验
1. 读 `content/<...>/<slug>/meta.yaml`：`status` 必须 `approved`；取 `type`(kouban/tuwen)。
2. 读 `4-publish.md`：标题、正文、话题、封面、建议发布时段。
3. 查 `assets/`：视频成片 mp4 / 图文图片 + 封面，文件存在。
任一缺失 → 报告缺什么，中止。

### Step 1 · cookie 校验
```
cd "$SAU_DIR" && uv run sau douyin check --account main
```
- `valid` → 继续。
- `invalid` → **停**，提示用户手动登录：
  `cd "$SAU_DIR" && uv run sau douyin login --account main --headed`（扫码），登录后重跑。

### Step 2 · 字段映射 → 拼 sau 命令
按 `references/field-mapping.md` 把条目字段映射成 sau 参数：
- 视频 → `sau douyin upload-video --account main --file <abs mp4> --title "<标题>" --desc "<正文>" --tags 词1,词2 [--schedule "Y-m-d H:M"] [--thumbnail <abs 封面>]`
- 图文 → `sau douyin upload-note --account main --images <abs1> <abs2> ... --title "<标题>" --note "<正文>" --tags 词1,词2 [--schedule ...]`

发布时间：`--when` > `4-publish.md` 建议时段 > 无（无则立即发，dry-run 时显式提示"立即发布"）。
定时须在抖音窗口内（约 2 小时~14 天）。

### Step 3 · ★ dry-run 闸 ★（仅当**不带** `--publish`）
**带了 `--publish` 直接跳到 Step 4，不要执行本步。** 不带时：把以下给用户、**不执行**，然后停下：
- 完整 sau 命令（可复制）
- 物料摘要：标题 / 正文摘要 / 话题 / 封面文件 / 发布时间(立即 or 定时X)
请求确认。**未确认绝不进 Step 4。**
> 自动 / 非交互（如 `claude -p`）场景没人能回复确认，所以真发**必须带 `--publish`**；带了就别再求确认，否则会卡死在这一步。

### Step 4 · 真发（带 `--publish` 即执行——`--publish` 本身就是「已授权」）
执行拼好的 sau 命令（`--headed` 便于观察，或 `--headless`）。**直接跑，不要再问确认。**
读输出：出现 `视频发布成功`/`提交成功`/`submitted` = 成功；否则失败。
> 注意：sau 当前输出不一定带作品链接，链接可能要去抖音作品管理人工补。

### Step 5 · 留痕（★ 发布收尾 = 全流水线状态记账的唯一位置，见 pipeline/4-publish.md）
- `4-publish.md`：回填 实际发布时间、（能拿到的）作品链接、用的账号。
- 状态记账（`meta.yaml` status→published/scheduled + `backlog.yaml` picked→published + `dashboard.md` 在制表移出该条，三处一次翻齐）**只走**：
  ```
  media publish-done <slug> [--scheduled "<YYYY-MM-DD HH:mm>"] [--url <作品链接>]
  ```
  绝对路径兜底（无全局 PATH 时）：`node /Users/yedizhang/yedi-study/douyin-media/tools/console/packages/cli/dist/index.js publish-done <slug> ...`
  - 立即发布成功 → 不带 `--scheduled`；定时发布 → 带 `--scheduled "<时间>"`（meta→scheduled，backlog 保持 picked 待 CHK-03 盯守）。
  - 能拿到作品链接就带 `--url`；拿不到就先不带（`media check` 会挂 CHK-05「链接待补」提醒），事后同一条命令补填：`media publish-done <slug> --url <url>`（`published` 状态下仅回填链接，不改状态）。
- 失败：写失败原因到 `4-publish.md`，**不调用** `media publish-done`（status 不动），报警。

## 文件结构
```
.claude/skills/douyin-publish/
├── SKILL.md
└── references/
    ├── field-mapping.md   content 条目字段 → sau 参数 映射
    └── sau-setup.md       sau 环境/登录/账号/排错（指向 tools/social-auto-upload）
```

## 与底层引擎的关系
本技能是薄封装；引擎能力、CLI 契约、排错以 `tools/social-auto-upload/skills/douyin-upload/`
（官方自带）为准。抖音改版导致上传失败时，**优先更新/升级底层项目，而非改本技能**。
