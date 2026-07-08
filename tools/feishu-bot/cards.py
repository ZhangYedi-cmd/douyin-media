"""飞书交互卡片模板（抖音版）

状态流：审核卡(approve/reject) → [approve] 发布确认卡(confirm/cancel) → 终态卡
所有按钮 value 必带 ns（命名空间），server 据此过滤共用应用/群下的他项目回调。
"""

NS = "douyin"


def _v(**kw):
    """统一给按钮 value 注入 ns。"""
    kw["ns"] = NS
    return kw


# ── 1. 审核卡 ─────────────────────────────────────────────
def review_card(slug, title, content_type, slug_dir, preview=""):
    type_label = {"kouban": "口播视频", "tuwen": "图文"}.get(content_type, content_type)
    elements = [{
        "tag": "div",
        "text": {"tag": "lark_md", "content": (
            f"**选题：** {title}\n"
            f"**类型：** {type_label}\n"
            f"**目录：** `{slug_dir}`"
        )},
    }]
    if preview:
        elements.append({"tag": "div", "text": {"tag": "lark_md", "content": preview}})
    elements.append({
        "tag": "action",
        "actions": [
            {"tag": "button", "text": {"tag": "plain_text", "content": "通过"},
             "type": "primary", "value": _v(action="approve", slug=slug)},
            {"tag": "button", "text": {"tag": "plain_text", "content": "打回"},
             "type": "danger", "value": _v(action="reject", slug=slug)},
        ],
    })
    return {
        "config": {"wide_screen_mode": True, "update_multi": True},
        "header": {"title": {"tag": "plain_text", "content": f"内容审核 | {title}"},
                   "template": "blue"},
        "elements": elements,
    }


# ── 2. 打回原因卡（两个出口：自动重做 / 挂待办）────────────
def reject_reason_card(slug, title):
    return {
        "config": {"wide_screen_mode": True, "update_multi": True},
        "header": {"title": {"tag": "plain_text", "content": f"打回 | {title}"},
                   "template": "red"},
        "elements": [
            {"tag": "div", "text": {"tag": "lark_md",
                "content": "**填写打回原因**（会作为重做的方向约束，越具体越好）："}},
            {
                # form 容器内 input 与 button 必须直接平铺，不能再嵌 action 容器，
                # 否则飞书不渲染输入框（踩坑：两个 form_submit 按钮各带自己的 action）。
                "tag": "form", "name": "reject_form",
                "elements": [
                    {"tag": "input", "name": "reason_text",
                     "placeholder": {"tag": "plain_text",
                                     "content": "如：钩子太平，开头3秒没抛冲突；或 第2段MoE结论需核实来源"}},
                    {"tag": "button", "action_type": "form_submit", "name": "rework",
                     "text": {"tag": "plain_text", "content": "打回并自动重做"},
                     "type": "primary", "value": _v(action="reject_rework", slug=slug)},
                    {"tag": "button", "action_type": "form_submit", "name": "todo",
                     "text": {"tag": "plain_text", "content": "打回·挂待办"},
                     "type": "default", "value": _v(action="reject_todo", slug=slug)},
                ],
            },
            {"tag": "hr"},
            {"tag": "div", "text": {"tag": "lark_md", "content":
                "重做＝带原因退回创作自动改（口播视频遇人工节点会停下记待办）；"
                "待办＝只挂起 status=rejected，等你处理。"}},
        ],
    }


# ── 3. 发布确认卡（approve 后，dry-run 物料推回，守发布铁律）──
def publish_confirm_card(slug, title, summary, cmd_display, errors=None):
    """summary: dict 物料摘要；cmd_display: 完整 sau 命令字符串。
    errors 非空 → 只展示问题、不给「确认发布」按钮（物料不全不可发）。"""
    lines = "\n".join(f"**{k}：** {v}" for k, v in summary.items())
    elements = [
        {"tag": "div", "text": {"tag": "lark_md",
                                "content": "✅ **已过审。发布前请核对最终物料：**"}},
        {"tag": "div", "text": {"tag": "lark_md", "content": lines}},
        {"tag": "hr"},
        {"tag": "div", "text": {"tag": "lark_md",
                                "content": f"**将执行的命令：**\n```\n{cmd_display}\n```"}},
    ]
    if errors:
        elements.append({"tag": "div", "text": {"tag": "lark_md",
            "content": "⚠️ **物料不全，无法发布：**\n- " + "\n- ".join(errors)}})
        actions = [{"tag": "button", "text": {"tag": "plain_text", "content": "取消"},
                    "type": "default", "value": _v(action="publish_cancel", slug=slug)}]
        header_tpl = "orange"
    else:
        actions = [
            {"tag": "button", "text": {"tag": "plain_text", "content": "确认发布"},
             "type": "primary", "value": _v(action="publish_confirm", slug=slug)},
            {"tag": "button", "text": {"tag": "plain_text", "content": "取消"},
             "type": "default", "value": _v(action="publish_cancel", slug=slug)},
        ]
        header_tpl = "turquoise"
    elements.append({"tag": "action", "actions": actions})
    return {
        "config": {"wide_screen_mode": True, "update_multi": True},
        "header": {"title": {"tag": "plain_text", "content": f"确认发布 | {title}"},
                   "template": header_tpl},
        "elements": elements,
    }


# ── 4. 终态卡 ─────────────────────────────────────────────
def _terminal(title, tpl, body):
    return {
        "config": {"wide_screen_mode": True, "update_multi": True},
        "header": {"title": {"tag": "plain_text", "content": title}, "template": tpl},
        "elements": [{"tag": "div", "text": {"tag": "lark_md", "content": body}}],
    }


def approved_pending_card(title):
    """approve 后、确认卡另发期间，原审核卡更新成的中间态。"""
    return _terminal(f"已过审 | {title}", "green", "已过审，正在拼发布物料，请看下一张卡确认。")


def rework_card(title, reason, nth):
    return _terminal(f"已打回·重做中 | {title}", "orange",
                     f"**原因：** {reason}\n已退回创作（status=drafting），第 {nth} 次自动重做已触发，"
                     f"完成后会重新进审核。")


def rework_limit_card(title, reason, done):
    return _terminal(f"已打回·转人工 | {title}", "red",
                     f"**原因：** {reason}\n已自动重做 {done} 次仍被打回，停止自动重做、"
                     f"转人工（status=rejected）。建议你亲自定方向或弃用。")


def todo_card(title, reason):
    return _terminal(f"已打回·挂待办 | {title}", "red",
                     f"**原因：** {reason}\n已挂起（status=rejected），等你决定重做或弃用。")


def published_card(title, schedule, log_tail=""):
    when = f"定时 {schedule}" if schedule else "立即发布"
    body = f"已提交抖音（{when}）。\n\n```\n{log_tail}\n```" if log_tail else f"已提交抖音（{when}）。"
    return _terminal(f"已发布 | {title}", "green", body)


def publish_failed_card(title, log_tail=""):
    return _terminal(f"发布失败 | {title}", "red",
                     f"sau 未返回成功标记，status 不动。\n\n```\n{log_tail}\n```")


def publish_canceled_card(title):
    return _terminal(f"已取消发布 | {title}", "grey",
                     "已取消本次发布，status 保持 approved，可稍后重新发起。")
