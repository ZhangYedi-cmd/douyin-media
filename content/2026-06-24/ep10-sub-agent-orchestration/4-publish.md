# 发布物料

- **标题**：Claude Code 里的子 Agent，其实就是 AI 给 AI 打工｜一个 AI 当老板派一队 AI 分头干活｜拆 Claude Code 源码
  - 备选：AI 给 AI 打工是什么体验？我扒了 Claude Code 的子 Agent 系统｜一个 AI 当老板，派几个 AI 员工分头干活——Claude Code 的子 Agent 编排有多讲究
- **正文/简介**：一个 AI 当老板，给手下几个 AI 员工分头派活，干完各自汇报，老板把结果一汇总——这不是科幻，是 Claude Code 里每天在发生的事。为什么这么搞？因为主对话的上下文是最稀缺的资源，让一个脑子去翻几百个源码文件会立马撑爆，所以脏活累活派给子 Agent 去干，主对话只接一份结论。我扒了它的源码，核心就一个 Agent 工具：主 Agent 调一次就生出一个子 Agent，还能一口气并行派出好几个，每个都是独立的对话记录、独立的中断开关、独立的文件视图，互不串台。设计上还有三点讲究：一是工具裁过的——Agent 工具本身不下放，防止子 Agent 无限套娃，用户的私人记忆、密钥也只留主线，每种员工还按角色配工具；二是回传，子 Agent 只把最后的结论交回主 Agent，中间过程留在自己记录里，主对话永远干净；三是协调者模式，系统提示词第一句就写着「你是个协调者，负责指挥多个工人」，还能持续往返沟通盯进度。说白了，这就是公司那套管理学——分工、授权、汇报。逐行可溯源，系列每天更一期。
- **话题标签**：#ClaudeCode #源码解读 #AIagent #AI编程 #程序员
- **封面**：assets/cover.png（竖屏 9:16，baoyu-image-gen 仿 EP01 系列风格：复用方块像素吉祥物本体，顶部当「老板」AI 派活、底下三个一样的小吉祥物当「员工」各进各的房间、各抱一张橙色报告回传；背景虚化真实源码锚点 runAgent/AgentTool/filterParentToolsForFork/coordinator；标题「Claude Code 的子 Agent / 就是 AI 给 AI 打工」；生成提示词存 assets/cover-prompt.md）
- **媒体文件**：assets/ep10-sub-agent-orchestration.mp4（1920×1080，146.8s，约 12.3MB，已混音 + 烧录字幕 + 全片去停顿 + 去拉伸）

> 发布时段：本集为系列日更，无人审指定时段。默认**立即发布**（不写可解析的「建议发布时段」字段——非 datetime 文本会被原样传给 sau `--schedule` 致真发崩，见 series-production-pitfalls #5）。如需定时，由人在飞书「确认发布」时指定。

## 发布回填（人审通过后）
- **实际发布时间**：2026-06-24 21:33:55（立即发布）
- **账号**：main
- **链接**：（待回填，sau 未返回作品链接，去抖音创作者中心作品管理补）
- **发布方式**：sau douyin upload-video（用户口头授权「重新发布一下」→ 重跑 4-publish 命令直发）
- **sau 结果**：成功 — `🥳 视频已经传完啦`／`🖼️ 竖版封面上传完成`／`🥳 视频发布成功，小人开心收工`／`cookie 更新完毕`／`Douyin video upload submitted`。日志 `/tmp/ep10-sau-retry.log`，无 ERROR/超时。首次 21:03 那轮的「选择封面」浮层阻塞已不复现（人已清浮层），此轮一次过。

## 发布失败回填（2026-06-24 21:03）

- **结果**：sau `EXIT=1`，未发布。
- **进度**：cookie 校验通过 → 视频上传成功（"视频已经传完啦"）→ 5 个话题贴成功 → 卡在「选择封面」按钮。
- **失败根因**：playwright `Page.click` 30s 超时；点击「选择封面」被两个浮层遮挡：
  1. 抖音创作者中心 `shepherd-element` 新手引导弹窗「新增「共创中心」模块，管理你的共创作品。」（`data-popper-placement="right"` 的右箭头气泡）
  2. `tag-dVUDkJ tag-hash-o0tpyE` 的 `publish-mention-wrapper-LWv5ed` mention 容器
- **是否 cookie 失效**：否（`sau douyin check --account main` 返回 `valid`，且已成功进入 version_2 发布页、视频已上传）。
- **未自动登录**：按 skill 铁律 4，cookie 有效且问题在 UI 浮层而非认证态，不触发 login。
- **完整日志**：`/tmp/ep10-sau.log`（71 行，关键 SUCCESS 行为第 8 行「视频已经传完啦」；第 9 行进入设置封面阶段后开始重试 click）。
- **重跑前需人介入**：在浏览器（已登录的抖音创作者中心，账号 main）手动关闭「共创中心」新手引导弹窗和 mention 浮层，关掉后无需重新登录，cookie 不动；之后重跑同一命令即可继续到点击「选择封面」+「发布」。

## 重跑命令（浮层清掉后直接执行，不要再问确认）

```
cd /Users/yedi/douyin-media && uv run --project tools/social-auto-upload sau douyin upload-video \
  --account main \
  --file /Users/yedi/douyin-media/content/2026-06-24/ep10-sub-agent-orchestration/assets/ep10-sub-agent-orchestration.mp4 \
  --title "Claude Code 里的子 Agent，其实就是 AI 给 AI 打工｜一个 AI 当老板派一队 AI 分头干活｜拆 Claude Code 源码" \
  --desc "一个 AI 当老板，给手下几个 AI 员工分头派活，干完各自汇报，老板把结果一汇总——这不是科幻，是 Claude Code 里每天在发生的事。为什么这么搞？因为主对话的上下文是最稀缺的资源，让一个脑子去翻几百个源码文件会立马撑爆，所以脏活累活派给子 Agent 去干，主对话只接一份结论。我扒了它的源码，核心就一个 Agent 工具：主 Agent 调一次就生出一个子 Agent，还能一口气并行派出好几个，每个都是独立的对话记录、独立的中断开关、独立的文件视图，互不串台。设计上还有三点讲究：一是工具裁过的——Agent 工具本身不下放，防止子 Agent 无限套娃，用户的私人记忆、密钥也只留主线，每种员工还按角色配工具；二是回传，子 Agent 只把最后的结论交回主 Agent，中间过程留在自己记录里，主对话永远干净；三是协调者模式，系统提示词第一句就写着「你是个协调者，负责指挥多个工人」，还能持续往返沟通盯进度。说白了，这就是公司那套管理学——分工、授权、汇报。逐行可溯源，系列每天更一期。 #ClaudeCode #源码解读 #AIagent #AI编程 #程序员" \
  --tags "#ClaudeCode,#源码解读,#AIagent,#AI编程,#程序员" \
  --thumbnail /Users/yedi/douyin-media/content/2026-06-24/ep10-sub-agent-orchestration/assets/cover.png
```
