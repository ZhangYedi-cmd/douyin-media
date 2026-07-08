# feishu-bot 的 claude -p 委托清单

server.py 在两个出口把重活**委托**给 `claude -p`，自己只当薄信使。

> **真相源是 `prompts.py`（机器读），不是本文档。** 本文档讲设计；prompt/命令全文在 `prompts.py`。
> 改 prompt 只动 `prompts.py`，server 逻辑不用碰（prompt 即配置，server 只是解释器）。

两处委托都用 `prompts.ALLOWED_TOOLS`（`Bash,Read,Write,Edit,Skill`），工作目录 `project_root`。

| | 场景1 打回→重做 | 场景2 确认发布 |
|---|---|---|
| 触发 | 「打回」→ 填原因 →「打回并自动重做」（未达 `REWORK_LIMIT=2`）| 通过 → 确认卡「确认发布」 |
| prompt 真相源 | `prompts.rework_prompt()` | `prompts.publish_command()` |
| 形态 | 自然语言走 `pipeline/2-create.md` SOP | 斜杠命令 `/douyin-publish <slug> --publish` |
| 执行 | `subprocess.run` 同步等（timeout 900，异步线程内） | `subprocess.run` 同步等（timeout 900） |
| 回报飞书 | 是（读 status：review→自动重新出审卡；否则预警卡人工节点） | 是（更新确认卡） |
| 成败判定 | 读 `meta.status` 是否回到 review | 读 `meta.status` 变成 published/scheduled |
| 代码位置 | `server.py:_async_rework` / `_run_rework` / `_send_review_card` | `server.py:_async_publish` |

> 两条委托现已对称：**异步线程内 `subprocess.run` 同步等 claude 跑完 → 读 `meta.status` 判结果 → 回报飞书**。
> 「claude -p 干完活必有飞书回调」是硬约束，别退回 fire-and-forget（重做完静默 = 没人知道该重新审）。

设计要点：
- **重做**护栏：同一条 `≥ REWORK_LIMIT` 次仍被打回 → 不再重做、落 rejected 转人工（主观反馈无客观判据，不做无限自愈）。
- **发布**：`--publish` = 人已在确认卡授权，douyin-publish 跳过自身 dry-run 闸直发；确认卡（Python `build_payload` 拼物料）是不可逆发布前最后一道人工关。
- xhs 的 `/pipeline-planner` 不在此列——抖音没有 pipeline-planner，这两处是抖音 server 全部的 claude -p 委托。
