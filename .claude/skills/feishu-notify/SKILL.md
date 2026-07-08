---
name: feishu-notify
description: 抖音流水线的「人审闸口」与通知通道——把待审内容(口播稿+封面)推到飞书等人点头/打回，过审后再把最终发布物料(sau命令+标题/话题/封面/排期)推回飞书做二次确认才真发；打回可选「自动重做」(起 claude -p 走创作 SOP)或「挂待办」。底层飞书官方 SDK 长连接(无需公网)：notify.py 出站发审核卡，server.py 入站收按钮、就地驱动审核/重做/发布闭环。当一条内容创作完待审、需发审核卡、需通知人、或要确认飞书通道(server 长连接)是否在线时触发。
---

# feishu-notify — 飞书人审闸口 & 发布确认通道（抖音版）

## 角色：流水线和人之间的唯一信使

抖音生产线自动跑到「出审」，**只在两个闸口需要人点头**，本 skill 把两个闸口都收进飞书：

1. **内容审核闸**：创作完 → 推口播稿+封面+审核卡 → 人点「通过 / 打回」
2. **发布确认闸**（守发布铁律）：通过 → 自动拼最终 `sau` 命令+物料 → 推「确认发布」卡 → 人点「确认 / 取消」才真发

发布是不可逆外向动作，所以「通过」≠「直接发」：**通过只到 status=approved，发布前必有第二张卡让人看最终真实物料**。两次点击 = 两次人类授权。

**server 是薄信使**：它本身不创作、不实现发布，只在回调里改 status / 拼物料 / 把重活**委托给 `claude -p`**（重做走创作 SOP、发布调 `/douyin-publish`）。prompt/命令的单一真相源是 `prompts.py`。

---

## 资产位置（不要重复造，直接调）

```
tools/feishu-bot/
├── config.yaml      # app_id/secret/token/chat_id/ns/project_root（含 secret，勿提交）
├── feishu.py        # 飞书 API 客户端：token 自管 + send_card/update_card/send_text/upload_image/send_post
├── meta.py          # 条目定位：find_slug_dir / set_status(正则保原貌) / read_publish_material / find_assets
├── publish.py       # 确认卡物料的确定性拼装：build_payload(读 meta+4-publish+assets 拼 sau 命令+物料摘要)
├── cards.py         # 卡片模板：审核卡 / 打回原因卡(两出口) / 发布确认卡 / 终态卡（value 全带 ns）
├── prompts.py       # ★claude -p 委托的 prompt/命令单一真相源：rework_prompt(重做) / publish_command(发布)
├── PROMPTS.md       # 委托设计说明（人读；机器真相源是 prompts.py）
├── notify.py        # ★出站 CLI：推文稿+封面预览 + 审核卡
├── server.py        # ★入站常驻：ws.Client 长连接收按钮 → 驱动审核/重做/发布闭环
└── start.sh         # server 生命周期：start|status|stop|restart（python -u）
```

所有命令用 `.venv/bin/python`（已装 lark-oapi/requests/pyyaml）。

---

## 能力一：发审核卡（创作完、内容自检通过后调）

```bash
cd tools/feishu-bot && .venv/bin/python notify.py --slug <slug> \
  [--title "<标题>"] [--type kouban|tuwen] [--preview "<一句话摘要>"] [--no-content]
```

- `--slug` 是唯一必填；`title`/`type` 缺省自动读该条目 `meta.yaml`。
- 按序发让人**看着真实内容判断**：① 口播稿全文(`2-script.md`，回退 `copy.txt`) ② 封面图(图文则全部配图) ③ 审核卡(通过/打回)。
- **成片 mp4 不推本体**（体积/飞书限制），物料摘要里标注文件名，要看本体本地开。
- `--no-content` 只发卡片不推预览（兜底/调试）。
- 预览 best-effort：缺稿/缺图只少推那部分，不挡卡片。

## 能力二：审核处置闭环（server 自动，无需手动调）

人点按钮后由 `server.py` 自动驱动，全在飞书内闭环。**两条路径：**

### 通过 → 发布
```
通过 → set_status(approved) → build_payload 拼最终 sau 命令+物料 → 发「确认发布」卡
确认发布 → claude -p /douyin-publish <slug> --publish（异步跑现成发布引擎）
         → 读 meta.status 判成败（变 published/scheduled = 成功）→ 更新卡为终态
取消 → status 留 approved，可稍后重发起
```

### 打回 → 两个出口
点「打回」弹原因卡（`form` 输入框 + 两个 `form_submit` 按钮），填原因后选：
```
打回并自动重做 ┬ 未达 REWORK_LIMIT(2) → status=drafting + 留痕 + claude -p 走 pipeline/2-create.md
              │                        定向重做；server 同步等它跑完 → 读 status：回 review
              │                        则自动重新出审（推新审核卡），否则发预警（卡人工节点）
              └ 已达上限           → status=rejected + 转人工通知（主观反馈无客观判据，不无限自愈）
打回·挂待办                        → status=rejected + 留痕 + 待办通知（等人决定重做或弃用）
```

### 两个设计要点
- **确认卡物料走确定性 Python，真发走 claude -p**：`build_payload` 是纯映射（读 `meta.yaml`+`4-publish.md`+`assets/` 拼字符串），不经 LLM，所以 3 秒回调窗口内安全、给人看的是真实命令；真发则委托 `claude -p /douyin-publish` 复用现成 skill 引擎、异步跑不占窗口，**成败以 `meta.status` 变化判定**（比解析自然语言可靠），失败 status 不动、不假装成功。
- **重做有护栏**：同一条自动重做累计 `≥ REWORK_LIMIT(2)` 次仍被打回 → 停止自愈、转人工。内容打回是主观反馈、无客观收敛判据，不做无限重做。

## 能力三：发文本通知（完成 / 失败 / 预警）

```bash
cd tools/feishu-bot && .venv/bin/python -c "
from feishu import FeishuClient; import yaml
cfg = yaml.safe_load(open('config.yaml'))
FeishuClient().send_text(cfg['chat_id'], '✅ 已发布：<标题>')
"
```

## 能力四：保活入站通道（发审核卡前必做）

**铁律：发审核卡前先确认 `server.py` 在跑。** server 没跑 = 按钮点了没人接 = 闸口死掉。

```bash
bash tools/feishu-bot/start.sh status   # running / stopped
bash tools/feishu-bot/start.sh start    # 幂等，没跑才起
```

---

## 闭环（线框）

```
内容自检通过 → [能力四]确认 server 在跑 → [能力一]notify.py 发审核卡
                                                    │
                                          飞书 ──卡片──▶ 📱人
                                           ▲              ├ 点「通过」 ──┐
                          长连接 WebSocket │              └ 点「打回」→ 填原因 → 重做/待办
                                    ┌───────────┐
                                    │ server.py │  ① 秒回 toast + resp.card（3秒内，零 HTTP）
                                    └─────┬─────┘  ② 重活甩 threading 异步
                                          ▼
        通过 → set_status=approved → build_payload → 发「确认发布」卡
                                          │
                              📱人 点「确认发布」 ──▶ claude -p /douyin-publish --publish（异步）
                                          │              → 读 meta.status 判成败 → 更新终态卡
        打回·重做 → status=drafting → claude -p 走创作 SOP（server 同步等）→ 回 review 则自动重新出审，否则预警
        打回·待办 → status=rejected + 记 3-review.md + 待办通知
```

**为什么回调里同步只回 toast+resp.card、重活全异步**：飞书卡片回调有 **3 秒响应窗口**，超时或返回非法体报 `-356`。所以 handler 只在窗口内 `return`（`resp.card` 是响应体原子更新卡片，**零额外 HTTP**），`build_payload`、`claude -p`、甚至**冗余的 `update_card` PATCH** 都甩 `threading` 异步——PATCH 要「新建 client 取 token + PATCH」两次串行网络调用，绝不能挡在窗口里。别把任何 HTTP/重活塞进同步路径。

---

## claude -p 子进程的认证（关键坑）

server 起 `claude -p` 时**必须清掉 `ANTHROPIC_API_KEY` 环境变量**（`server.py` 的 `CLAUDE_ENV` 已处理）。

- 本机 `ANTHROPIC_API_KEY` 是 **OAuth token**（`sk-ant-oat01-…`），子 claude 会把它当 API key 用 → `Invalid API key · Fix external API key`，发布/重做静默失败。
- 删掉该变量后，`claude -p` 回落到 CLI 自己的 OAuth 登录凭证（`~/.claude`），与交互式会话同一套认证。
- 自检：`env -u ANTHROPIC_API_KEY claude -p "回复OK" --allowedTools ""` 应返回 `OK`；带着该变量则报 `Invalid API key`。

## 发布幂等锁

同一 slug 同时只允许一个 `_async_publish` 在跑（`server.py` 的 `_publishing` set + lock）。飞书会重投回调、人也可能连点，无锁则**同条并发双发**（不可逆外发，严重）。重复点击只回 toast「该条正在发布中」。

---

## 命名空间隔离（共用 xhs 应用/同群的关键，且是 -356 的隐藏来源）

本项目与 xhs 复用**同一飞书应用 + 同一个群**，带来两重隐患：

1. **多 server 抢事件**：同一应用的 `card.action.trigger` 在多条长连接间**负载均衡投递（非广播）**，多个 server 会互相截走对方的点击。
2. **旧卡无 ns 被丢弃 → 表现为 -356**：本项目卡片 `value` 带 `ns: douyin`，`server.py` 开头 `if value.get("ns") != NS: 打日志并 return`。点一张**加 ns 之前发的旧卡**，当前 server 因 ns 不匹配静默放过，飞书侧 3 秒无有效响应 → 报 `-356`。**遇 -356 先确认点的是不是新卡**。

缓解（当前）：抖音运营期保证 xhs server 不常驻、`pgrep -f server.py` 确认只有一个进程；测试时永远发新卡再点。

> **长期 TODO：给抖音建独立飞书应用**，从根上消除「抢事件 + 旧卡污染」。复用是临时省事，不是终态。

---

## 前置依赖（一次性，已就绪则跳过）

1. `config.yaml` 已填 app_id/secret/verification_token/chat_id（复用 xhs 值）+ `ns: douyin` + `project_root`
2. 飞书后台「事件与回调 → 回调配置」订阅方式 = **长连接**，已订阅 `card.action.trigger`
3. 「应用能力 → 机器人」已开，机器人在目标群
4. `.venv` 已建 + `pip install -r requirements.txt`（lark-oapi/requests/pyyaml）
5. 本机 `claude` CLI 已 OAuth 登录（`claude -p` 委托依赖它；见上「认证坑」）

## 故障排查

| 现象 | 根因 | 处理 |
|---|---|---|
| 点「通过/打回」报 `-356` | ①点的是旧卡(无 ns)被静默丢弃 ②同步路径有 HTTP 超 3 秒 | 重发新卡再点；确认 `_resp` 不在同步路径做 PATCH（已甩异步） |
| 抖音卡点了没反应，xhs 流水线却被触发 | 共用应用，xhs server 截走/误吃抖音卡 | 停掉 xhs server，或给它也加 `ns` 过滤；确认只跑一个 server |
| 「确认发布」后失败卡显示 `Invalid API key` | claude -p 子进程继承了 OAuth token 当 API key | server 起子进程须 `env` 去掉 `ANTHROPIC_API_KEY`（`CLAUDE_ENV` 已做） |
| 重做/发布卡更新了但内容没真改/没真发 | claude -p 跑完但 status 未达预期 | 看失败卡 ``` tail；本地 `cd && claude -p '/douyin-publish <slug> --publish'` 复跑看输出 |
| 连点「确认发布」担心双发 | 飞书重投/人连点 | 已有幂等锁，重复点只回 toast；如仍双发查 `_publishing` 释放 |
| 打回卡输入框不显示 | 裸 `input`/嵌套 `action` 在 form 里不渲染 | input 与 form_submit 按钮**直接平铺**在 `form.elements`，取值在 `action.form_value[name]` |
| 点按钮飞书无反应、本地无日志 | server 没跑 / 僵尸占连接 | `start.sh restart`；`pgrep -f server.py` 查重复进程 |
| 「确认发布」报物料不全 | 4-publish.md 缺字段或 assets 缺 mp4/封面 | 卡上已列缺项，补齐后从审核重走，或直接 `/douyin-publish <slug>` 终端发 |
| cookie 失效发布失败 | sau cookie 过期 | **不自动登录**：`cd tools/social-auto-upload && uv run sau douyin login --account main --headed` 扫码 |
| 本地日志半天不出 | print 被缓冲 | server 必须 `python -u`（start.sh 已带） |

## 边界

- **不自己实现发布 DOM 操作**——真发统一委托 `claude -p /douyin-publish` → `sau` CLI（与 `douyin-publish` 同一引擎）。
- **守发布铁律**：通过 ≠ 真发；真发前必有「确认发布」卡展示最终 sau 命令+物料；`--publish` = 人已在确认卡授权。
- **不假装成功**：以 `meta.status` 变化判成败，失败 status 不动并回报。
- **改 prompt 只动 `prompts.py`**（单一真相源），不碰 server 逻辑。
- **不**把 config.yaml 提交进 git（含 secret，已在 .gitignore）。
- 长连接模式无需公网；改 HTTP webhook 才需 ngrok/cloudflared（当前不用）。
