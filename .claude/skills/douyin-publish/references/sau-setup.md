# sau 引擎 环境 / 登录 / 排错

底层引擎：`social-auto-upload`（dreammis/social-auto-upload），位于
`/Users/yedi/douyin-media/tools/social-auto-upload`。

## 环境（已就绪，2026-06-14 实测通过）
- `uv` + Python 3.12 venv（系统默认 3.14 太新，项目要求 <3.13）。
- `conf.py`（由 `conf.example.py` 拷得）。
- patchright chromium 已装。
- 调用：`cd <SAU_DIR> && uv run sau douyin --help`。

## 账号 / 登录
- cookie 存 `<SAU_DIR>/cookies/douyin_<account>.json`。
- 校验：`uv run sau douyin check --account main` → `valid`/`invalid`。
- 登录（cookie 失效时，人工扫码）：
  `uv run sau douyin login --account main --headed`
  弹出 Chromium 显示二维码，用手机抖音 App 扫；也可扫 `cookies/` 下临时 png。
- 多账号：换 `--account <别的名字>`，各自独立 cookie。

## 已知 / 实测
- 视频立即/定时均通；定时自动切换（传 `--schedule` 即定时）。
- 上传成功日志关键词：`视频发布成功` / `submitted`。
- sau 输出**不一定带作品链接**，链接需去抖音作品管理人工确认/补。
- 发布会触发"自主声明"，sau 默认选「内容为个人观点或见解」。

## 排错优先级
1. 命令失败 → 看 `<SAU_DIR>/skills/douyin-upload/references/troubleshooting.md`（官方自带）。
2. 抖音改版导致 DOM 失效 → **升级底层项目**（`git -C <SAU_DIR> pull` + `uv sync`），不要改本封装技能。
3. cookie 频繁失效 → 重新 login。
