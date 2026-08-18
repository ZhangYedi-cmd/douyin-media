"""飞书卡片回调 server — 长连接模式（官方 SDK，无需公网）

抖音版人审闸口：审核卡(通过/打回) → [通过] 发布确认卡(确认/取消) → 真发。
守 douyin-publish 铁律：通过=过审，发布前必有第二张「最终 sau 命令+物料」卡再确认。

与 xhs 同源的踩坑结构原样保留：
  - 回调 3 秒窗口内只 return toast/card；真发等重活甩 threading 异步
  - 卡片更新两路都走（resp.card + PATCH），覆盖长连接下的不同实现
  - 打回自由文本走 form_submit，取值在 action.form_value[name]

命名空间隔离：只处理 value.ns == 本项目 ns 的卡片；与 xhs 共用应用/同群时，
他项目卡片一律静默忽略（反向：若 xhs server 也常驻，需给它也加 ns 过滤）。

启动: bash start.sh start
"""

import os
import subprocess
import sys
import threading
import time
from datetime import datetime
from pathlib import Path

import requests
import yaml
import lark_oapi as lark
from lark_oapi.event.callback.model.p2_card_action_trigger import (
    P2CardActionTrigger,
    P2CardActionTriggerResponse,
)

import cards
import meta
import prompts
import publish
from feishu import FeishuClient

CONFIG = yaml.safe_load((Path(__file__).parent / "config.yaml").read_text())
NS = CONFIG.get("ns", "douyin")
CHAT_ID = CONFIG["chat_id"]
PROJECT_ROOT = CONFIG["project_root"]


# ── 留痕 helper ───────────────────────────────────────────
def _append_review(slug_dir, conclusion):
    """把审核结论追加到 3-review.md。"""
    f = Path(slug_dir) / "3-review.md"
    stamp = datetime.now().strftime("%Y-%m-%d %H:%M")
    line = f"\n- [{stamp}] 飞书审核：{conclusion}\n"
    with open(f, "a", encoding="utf-8") as fh:
        fh.write(line)


def _title_of(slug):
    sd = meta.find_slug_dir(PROJECT_ROOT, slug)
    if not sd:
        return slug
    return meta.load_meta(sd).get("title") or slug


REWORK_LIMIT = 2  # 同一条自动重做上限，超了转人工（主观反馈无客观判据，不无限自愈）

# claude -p 子进程的执行环境：必须去掉 ANTHROPIC_API_KEY。
# 本机该变量是 OAuth token(sk-ant-oat01-…)，子 claude 会把它当 API key 用 → Invalid API key。
# 删掉后 claude CLI 回落到自己的 OAuth 登录凭证（~/.claude），与交互式会话同一套认证。
CLAUDE_ENV = {k: v for k, v in os.environ.items() if k != "ANTHROPIC_API_KEY"}

# media CLI（状态记账唯一入口，见 0818-看板工作台 CLI 拍板 §6 融合表第 4 行）。
# 绝对路径兜底（拍板 §6.1 第 1 条）：server 是常驻进程，起时的 PATH 未必挂了 npm link。
MEDIA_CLI = [
    "node",
    "/Users/yedizhang/yedi-study/douyin-media/tools/console/packages/cli/dist/index.js",
]
# 复用 CLAUDE_ENV 的处理（去 ANTHROPIC_API_KEY）+ 叠加 MEDIA_ACTOR，供 audit.jsonl 溯源写者身份。
MEDIA_ENV = {**CLAUDE_ENV, "MEDIA_ACTOR": "feishu-server"}


def _flip(slug, status, reason=None):
    """状态记账唯一入口：subprocess 调 `media flip`（替代原 meta.py 里那套正则改行的第二套实现，
    见 0818-看板工作台 CLI 拍板 §6 融合表第 4 行）。args 数组不经 shell。
    冷启动 ~100ms 量级；本函数的全部调用方都在 threading 异步线程里跑，不占 3 秒回调窗口。
    失败（非法迁移/条目不存在等）抛异常，交调用方既有 try/except 兜底报飞书。"""
    args = [*MEDIA_CLI, "flip", slug, status, "--root", PROJECT_ROOT, "--json"]
    if reason:
        args += ["--reason", reason]
    proc = subprocess.run(args, env=MEDIA_ENV, capture_output=True, text=True, timeout=30)
    if proc.returncode != 0:
        raise RuntimeError(
            f"media flip {slug} {status} 失败(exit={proc.returncode}): {(proc.stdout or '') + (proc.stderr or '')}"
        )


# ── console job runner（0818 看板工作台 02 后端执行方案 S8）─────
# 场景 3(确认发布真发)/场景 4(打回重做) 改造点只有 _async_publish/_async_rework 两处函数体：
# 原地 spawn `claude -p` 换成 POST console job runner(:5170) + 轮询终态，判成败逻辑（读 meta.status）
# 从 python 移进 job runner，python 只消费 verdict.ok（后端拍板 §9.1、02 方案 S8 行）。
# console_api: true(默认)=走 console；false=旧 spawn 路径（回滚开关，见 config.example.yaml 注释；
# 真实 config.yaml 本机不存在，缺省值只活在代码里）。回滚 = 改这一键 + `bash start.sh restart`，不 revert commit。
CONSOLE_API = CONFIG.get("console_api", True)
CONSOLE_BASE_URL = "http://127.0.0.1:5170"  # 端口固定 5170（02 方案 §2.0，与 console 侧 CONSOLE_PORT 默认一致）
# token 落点契约：tools/console/.runtime/token（02 方案 §2.0），console 仓与主仓同挂在 PROJECT_ROOT 下。
CONSOLE_TOKEN_PATH = Path(PROJECT_ROOT) / "tools" / "console" / ".runtime" / "token"
CONSOLE_POLL_INTERVAL_SEC = 10  # 每 10s 轮询 GET /api/jobs/:id（S8 行原文）
CONSOLE_POLL_EXTRA_SEC = 5 * 60  # 轮询上限 = job 超时 + 5min（S8 行原文）
# 需与 tools/console/packages/server/src/jobs/defs.ts 的 JOB_TIMEOUT_MS 保持一致（两仓独立，改一处需同步改
# 另一处；无更好的跨语言共享方式，此处登记以便日后同步维护）。
CONSOLE_JOB_TIMEOUT_SEC = {"publish": 20 * 60, "rework": 45 * 60}


class ConsoleActionError(Exception):
    """POST /api/actions/* 未受理（console 不可达/鉴权失败/409 系列）。code 取 server 错误信封的 error.code；
    console 本身不可达、网络异常、token 缺失时置 UNREACHABLE。"""

    def __init__(self, code, message):
        super().__init__(message)
        self.code = code


def _console_token():
    return CONSOLE_TOKEN_PATH.read_text(encoding="utf-8").strip()


def _console_post_action(action, payload):
    """POST /api/actions/{publish,rework} 提交 job，返回 job id。
    禁止自动 fallback（S8 铁律）：console 不可达/非 202 一律抛 ConsoleActionError，
    交调用方按发布失败上报，不静默、不自动切回旧路径。"""
    try:
        token = _console_token()
    except Exception as e:
        raise ConsoleActionError("UNREACHABLE", f"读取 console token 失败（console 可能未启动）：{e}")
    try:
        resp = requests.post(
            f"{CONSOLE_BASE_URL}/api/actions/{action}",
            json=payload, headers={"Authorization": f"Bearer {token}"}, timeout=15,
        )
    except Exception as e:
        raise ConsoleActionError("UNREACHABLE", f"console 不可达（{CONSOLE_BASE_URL}）：{e}")
    if resp.status_code == 202:
        return resp.json()["jobId"]
    try:
        body = resp.json()
    except Exception:
        body = {"raw": resp.text}
    code = (body.get("error") or {}).get("code") if isinstance(body, dict) else None
    raise ConsoleActionError(code or f"HTTP_{resp.status_code}", f"status={resp.status_code} body={body}")


def _console_poll_job(job_id, timeout_sec):
    """每 10s 轮询 GET /api/jobs/:id 至终态，上限 = job 超时 + 5min（S8 行原文）。
    终态三种：succeeded/failed（job runner 已裁决）、unknown（server 曾重启任务表已失——
    见 02 方案 §4 风险 9，需人工核 meta.status，不得误报成功/失败）。"""
    token = _console_token()
    deadline = time.time() + timeout_sec + CONSOLE_POLL_EXTRA_SEC
    while time.time() < deadline:
        resp = requests.get(
            f"{CONSOLE_BASE_URL}/api/jobs/{job_id}",
            headers={"Authorization": f"Bearer {token}"}, timeout=15,
        )
        if resp.status_code == 200:
            job = resp.json()
            if job.get("state") in ("succeeded", "failed", "unknown"):
                return job
        time.sleep(CONSOLE_POLL_INTERVAL_SEC)
    raise TimeoutError(f"console job {job_id} 轮询超时（{timeout_sec + CONSOLE_POLL_EXTRA_SEC}s 未见终态）")


# 发布幂等锁：console_api=false 的旧路径专用（同一条同时只允许一个 _async_publish 在跑，
# 飞书会重投回调、人也可能连点，无锁则同条并发双发，不可逆外发，严重）。
# console_api=true 时本锁不再使用——双击由 job runner 的 409 JOB_DUPLICATE 兜住（S8 决策3，
# 全系统发布幂等锁唯一实现下沉到 job runner），旧路径原样保留供 console_api:false 回滚时用。
_publishing = set()
_publishing_lock = threading.Lock()


def _count_rework(slug_dir):
    """已自动重做次数 = 3-review.md 里「打回·重做」留痕条数。"""
    f = Path(slug_dir) / "3-review.md"
    if not f.exists():
        return 0
    return f.read_text(encoding="utf-8").count("打回·重做")


def _run_rework(slug, slug_dir, reason, nth):
    """同步等 claude -p 带原因定向重做跑完（在异步线程里调，不占 3 秒回调窗口）。
    与发布路径对称：跑完由调用方读 meta.status 判结果再回报飞书。
    口播视频遇人工节点会停，prompt 已要求它如实记待办（此时 status 不会回 review）。"""
    prompt = prompts.rework_prompt(slug, slug_dir, reason, nth)
    try:
        subprocess.run(
            ["claude", "-p", prompt, "--allowedTools", prompts.ALLOWED_TOOLS],
            cwd=PROJECT_ROOT, env=CLAUDE_ENV,
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=900,
        )
    except Exception as e:
        print(f"重做 claude -p 异常 [{slug}]: {e}")


def _send_review_card(slug):
    """复用 notify.py 重新出审：推文稿+封面+审核卡（发卡不需 claude，普通 env 即可）。"""
    notify_py = Path(__file__).parent / "notify.py"
    subprocess.run(
        [sys.executable, str(notify_py), "--slug", slug],
        cwd=str(Path(__file__).parent), capture_output=True, text=True, timeout=120,
    )


# ── 回调响应（两路更新卡片，沿用 xhs 踩坑解法）────────────
def _patch_async(message_id, card):
    """PATCH 加固甩异步：新建 client 取 token(HTTP)+PATCH(HTTP) 是两次串行网络调用，
    绝不能挡在 3 秒回调窗口里（否则 -356 超时）。resp.card 已原子更新，PATCH 只是冗余兜底。"""
    try:
        FeishuClient().update_card(message_id, card)
    except Exception as e:
        print(f"异步 PATCH 更新卡片失败（已靠 resp.card 更新）: {e}")


def _resp(text, kind="info", card=None, message_id=None):
    # 同步路径零 HTTP：只组装 resp（toast + resp.card 都是内存操作），3 秒窗口绝对安全。
    resp = P2CardActionTriggerResponse()
    resp.toast = {"type": kind, "content": text}
    if card is not None:
        resp.card = {"type": "raw", "data": card}
        if message_id:  # PATCH 兜底甩异步，不阻塞响应
            threading.Thread(target=_patch_async, args=(message_id, card), daemon=True).start()
    return resp


# ── 异步重活 ──────────────────────────────────────────────
def _async_approve(slug):
    """过审：置 status=approved，拼发布物料，另发「确认发布」卡。"""
    try:
        sd = meta.find_slug_dir(PROJECT_ROOT, slug)
        _flip(slug, "approved")
        title = meta.load_meta(sd).get("title") or slug
        p = publish.build_payload(PROJECT_ROOT, slug)
        card = cards.publish_confirm_card(
            slug, title, p["summary"], p["cmd_display"], errors=p.get("errors"))
        FeishuClient().send_card(CHAT_ID, card)
    except Exception as e:
        FeishuClient().send_text(CHAT_ID, f"⚠️ 拼发布物料失败 [{slug}]：{e}")


def _async_publish(slug, message_id):
    """真发。console_api=true（默认）：POST console job runner /api/actions/publish + 轮询终态，
    结论取 job.verdict.ok（job runner 内部复读 meta.status 双重确认，见 02 方案 §2.3）——不静默、
    不自动回退旧路径，console 不可达直接报失败卡（S8 铁律）。
    console_api=false：旧 spawn `claude -p /douyin-publish` 路径，本地读 meta.status 判成败（回滚开关）。"""
    title = _title_of(slug)
    schedule = None
    try:
        schedule = publish.build_payload(PROJECT_ROOT, slug).get("schedule")
    except Exception:
        pass

    if CONSOLE_API:
        try:
            job_id = _console_post_action("publish", {"slug": slug})
        except ConsoleActionError as e:
            if e.code == "JOB_DUPLICATE":
                # 双击兜底（S8 决策3）：告知即可，不重复触发、不当失败处理
                FeishuClient().send_text(CHAT_ID, f"该条正在发布中，勿重复点击 [{slug}]")
                return
            card = cards.publish_failed_card(
                title, f"console 未启动或不可达，发布未触发：{e}\n"
                       f"请 `bash tools/console/start.sh start`，或翻回 config.yaml console_api:false 用旧路径")
            try:
                FeishuClient().update_card(message_id, card)
            except Exception as e2:
                FeishuClient().send_text(CHAT_ID, f"发布失败但更新卡片也失败 [{slug}]：{e2}")
            return

        try:
            job = _console_poll_job(job_id, CONSOLE_JOB_TIMEOUT_SEC["publish"])
        except Exception as e:
            card = cards.publish_failed_card(
                title, f"job {job_id} 轮询异常，结果未知，请人工核实 meta.status：{e}")
            try:
                FeishuClient().update_card(message_id, card)
            except Exception as e2:
                FeishuClient().send_text(CHAT_ID, f"发布结果未知且更新卡片失败 [{slug}]：{e2}")
            return

        if job.get("state") == "unknown":
            # console 曾重启，任务表已失——真相仍在 meta.status，不误报成功/失败（02 方案 §4 风险 9）
            card = cards.publish_failed_card(
                title, f"console 曾重启，任务状态未知（job={job_id}），请人工核实 meta.status。\n{job.get('note', '')}")
            try:
                FeishuClient().update_card(message_id, card)
            except Exception as e2:
                FeishuClient().send_text(CHAT_ID, f"发布结果未知且更新卡片失败 [{slug}]：{e2}")
            return

        verdict = job.get("verdict") or {}
        ok = bool(verdict.get("ok"))
        tail_src = verdict.get("note") or job.get("error") or f"job state={job.get('state')}"
        tail = "\n".join(str(tail_src).splitlines()[-12:])
        card = (cards.published_card(title, schedule, tail) if ok
                else cards.publish_failed_card(title, tail))
        try:
            FeishuClient().update_card(message_id, card)
        except Exception as e:
            FeishuClient().send_text(CHAT_ID, f"发布已结束但更新卡片失败 [{slug}]：{e}")
        return

    # ── 旧路径（console_api:false 回滚开关，原逻辑原样保留）─────
    try:
        sd = meta.find_slug_dir(PROJECT_ROOT, slug)
        try:
            proc = subprocess.run(
                ["claude", "-p", prompts.publish_command(slug),
                 "--allowedTools", prompts.ALLOWED_TOOLS],
                cwd=PROJECT_ROOT, env=CLAUDE_ENV,
                capture_output=True, text=True, timeout=900,
            )
            out = (proc.stdout or "") + "\n" + (proc.stderr or "")
        except Exception as e:
            out = f"调用 claude -p /douyin-publish 异常：{e}"

        after = meta.load_meta(sd).get("status") if sd else None
        tail = "\n".join(out.strip().splitlines()[-12:])
        card = (cards.published_card(title, schedule, tail) if after in ("published", "scheduled")
                else cards.publish_failed_card(title, f"status 仍为 {after}\n{tail}"))
        try:
            FeishuClient().update_card(message_id, card)
        except Exception as e:
            FeishuClient().send_text(CHAT_ID, f"发布已结束但更新卡片失败 [{slug}]：{e}")
    finally:
        with _publishing_lock:
            _publishing.discard(slug)


def _async_rework(slug, reason, nth):
    """打回·重做。console_api=true（默认）：POST console job runner /api/actions/rework + 轮询终态。
    before-step（flip drafting 记账）、改稿、flip 回 review、3-review.md 留痕、重推审核卡全部由
    job runner + CC 子进程完成（见 reworkPrompt）；python 不再本地重复这些动作，只消费 verdict.ok
    （避免与 job runner 内 before-step 双重 flip、避免推两张审核卡）。
    console_api=false：旧路径——本地 flip drafting + 留痕 + subprocess 同步等 claude 重做（回滚开关）。"""
    title = _title_of(slug)

    if CONSOLE_API:
        try:
            job_id = _console_post_action("rework", {"slug": slug, "reason": reason})
        except ConsoleActionError as e:
            if e.code == "JOB_DUPLICATE":
                FeishuClient().send_text(CHAT_ID, f"该条正有重做任务在跑，勿重复点击 [{slug}]")
                return
            FeishuClient().send_text(
                CHAT_ID, f"⚠️ console 未启动或不可达，重做未触发 [{slug}]：{e}\n"
                         f"请 `bash tools/console/start.sh start`，或翻回 config.yaml console_api:false 用旧路径")
            return

        try:
            job = _console_poll_job(job_id, CONSOLE_JOB_TIMEOUT_SEC["rework"])
        except Exception as e:
            FeishuClient().send_text(CHAT_ID, f"⚠️ 重做任务轮询异常，结果未知 [{slug}] job={job_id}：{e}")
            return

        if job.get("state") == "unknown":
            # console 曾重启，任务表已失——真相仍在 meta.status，不误报成功/失败（02 方案 §4 风险 9）
            FeishuClient().send_text(
                CHAT_ID, f"⚠️ console 曾重启，{title} 第{nth}次重做状态未知（job={job_id}），"
                         f"请人工核实 meta.status / 3-review.md。")
            return

        verdict = job.get("verdict") or {}
        if verdict.get("ok"):
            # 回到 review = 重做成功；审核卡已由 job 内 CC 子进程按 pipeline/3-review.md 经 feishu-notify 重推，
            # 这里不再重复推卡（避免同一条出两张审核卡）。
            FeishuClient().send_text(CHAT_ID, f"🔁 {title} 第{nth}次重做完成，已回到 review，审核卡已重新推送。")
        else:
            note = verdict.get("note") or job.get("error") or f"job state={job.get('state')}"
            FeishuClient().send_text(
                CHAT_ID, f"⚠️ {title} 第{nth}次重做未回到 review（{note}），"
                         f"可能卡在人工节点，job={job_id}，请看该条目 3-review.md。")
        return

    # ── 旧路径（console_api:false 回滚开关，原逻辑原样保留）─────
    try:
        sd = meta.find_slug_dir(PROJECT_ROOT, slug)
        _flip(slug, "drafting")
        _append_review(sd, f"打回·重做(第{nth}次) — {reason}")
        _run_rework(slug, sd, reason, nth)  # 同步等重做跑完
        after = meta.load_meta(sd).get("status")
        title = meta.load_meta(sd).get("title") or slug
        if after == "review":
            # 回到 review = 重做成功，自动重新出审（推新稿+封面+审核卡）
            FeishuClient().send_text(CHAT_ID, f"🔁 {title} 第{nth}次重做完成，重新出审 ↓")
            _send_review_card(slug)
        else:
            # 没回 review（卡在人工节点/未完成）→ 预警，不假装成功
            FeishuClient().send_text(
                CHAT_ID, f"⚠️ {title} 第{nth}次重做未回到 review（当前 status={after}），"
                         f"可能卡在人工节点，请看 {sd}/3-review.md。")
    except Exception as e:
        FeishuClient().send_text(CHAT_ID, f"⚠️ 重做流程异常 [{slug}]：{e}")


def _async_rework_limit(slug, reason, done):
    """达重做上限：落 rejected + 留痕 + 通知人介入。"""
    try:
        sd = meta.find_slug_dir(PROJECT_ROOT, slug)
        _flip(slug, "rejected", reason=reason)
        _append_review(sd, f"打回·重做达上限({done}次)转人工 — {reason}")
        FeishuClient().send_text(
            CHAT_ID, f"⚠️ 重做上限：{_title_of(slug)} 已自动重做 {done} 次仍被打回，"
                     f"转人工。原因：{reason}")
    except Exception as e:
        FeishuClient().send_text(CHAT_ID, f"⚠️ 上限留痕失败 [{slug}]：{e}")


def _async_todo(slug, reason):
    """打回·挂待办：落 rejected + 留痕 + 发待办通知。"""
    try:
        sd = meta.find_slug_dir(PROJECT_ROOT, slug)
        _flip(slug, "rejected", reason=reason)
        _append_review(sd, f"打回·待办 — {reason}")
        FeishuClient().send_text(
            CHAT_ID, f"📌 待办：{_title_of(slug)} 已打回挂起。\n原因：{reason}\n"
                     f"条目：{sd}\nstatus=rejected，待你决定重做或弃用。")
    except Exception as e:
        FeishuClient().send_text(CHAT_ID, f"⚠️ 待办留痕失败 [{slug}]：{e}")


# ── 主回调 ────────────────────────────────────────────────
def handle_card_action(data: P2CardActionTrigger) -> P2CardActionTriggerResponse:
    event = data.event
    action = event.action
    value = action.value or {}
    message_id = event.context.open_message_id if event.context else None

    # 命名空间隔离：非本项目卡片静默忽略。先打日志，便于发现「旧卡无 ns 被丢弃」这类问题。
    if value.get("ns") != NS:
        print(f"[douyin] 忽略非本项目卡片(ns={value.get('ns')!r}): "
              f"action={value.get('action')!r}, msg_id={message_id}")
        return P2CardActionTriggerResponse()

    act = value.get("action", "")
    slug = value.get("slug", "")
    title = _title_of(slug)
    print(f"[douyin] 回调: action={act}, slug={slug}, msg_id={message_id}")

    if act == "approve":
        threading.Thread(target=_async_approve, args=(slug,), daemon=True).start()
        return _resp("已通过，正在拼发布物料", "success",
                     card=cards.approved_pending_card(title), message_id=message_id)

    if act == "reject":
        return _resp("填原因，选重做或挂待办", "info",
                     card=cards.reject_reason_card(slug, title), message_id=message_id)

    if act in ("reject_rework", "reject_todo"):
        fv = action.form_value or {}
        reason = (fv.get("reason_text") or "").strip() or "（未填原因）"
        sd = meta.find_slug_dir(PROJECT_ROOT, slug)

        if act == "reject_todo":
            threading.Thread(target=_async_todo, args=(slug, reason), daemon=True).start()
            return _resp("已挂待办", "info",
                         card=cards.todo_card(title, reason), message_id=message_id)

        # reject_rework：护栏判断（读文件，3秒内可完成）
        done = _count_rework(sd) if sd else 0
        if done >= REWORK_LIMIT:
            threading.Thread(target=_async_rework_limit, args=(slug, reason, done),
                             daemon=True).start()
            return _resp("已达重做上限，转人工", "warning",
                         card=cards.rework_limit_card(title, reason, done), message_id=message_id)
        threading.Thread(target=_async_rework, args=(slug, reason, done + 1),
                         daemon=True).start()
        return _resp("已打回，自动重做中", "info",
                     card=cards.rework_card(title, reason, done + 1), message_id=message_id)

    if act == "publish_confirm":
        if CONSOLE_API:
            # console_api=true：_publishing 幂等 set 不再使用，双击由 job runner 的 409 JOB_DUPLICATE
            # 兜住（在 _async_publish 内处理，S8 决策3）——全系统发布幂等锁唯一实现下沉到 job runner。
            threading.Thread(target=_async_publish, args=(slug, message_id), daemon=True).start()
            return _resp("正在发布，完成后更新本卡", "info")
        # 旧路径（console_api:false 回滚开关）：幂等靠本地 set，同条已在发布则拒重复点击
        # （飞书重投/人连点 → 否则并发双发，不可逆外发）
        with _publishing_lock:
            if slug in _publishing:
                return _resp("该条正在发布中，勿重复点击", "warning")
            _publishing.add(slug)
        threading.Thread(target=_async_publish, args=(slug, message_id), daemon=True).start()
        return _resp("正在发布，完成后更新本卡", "info")  # 只 toast，结果异步 PATCH

    if act == "publish_cancel":
        return _resp("已取消发布", "info",
                     card=cards.publish_canceled_card(title), message_id=message_id)

    return _resp("未知操作", "warning")


def main():
    handler = (
        lark.EventDispatcherHandler.builder("", CONFIG["verification_token"])
        .register_p2_card_action_trigger(handle_card_action)
        .build()
    )
    cli = lark.ws.Client(
        app_id=CONFIG["app_id"],
        app_secret=CONFIG["app_secret"],
        log_level=lark.LogLevel.INFO,
        event_handler=handler,
    )
    print(f"飞书长连接 server 启动（ns={NS}）... 等待卡片回调")
    cli.start()


if __name__ == "__main__":
    main()
