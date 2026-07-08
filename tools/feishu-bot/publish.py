"""发布逻辑 — douyin-publish 的确定性 Python 化身。

把内容条目映射成 sau 命令（拼字符串，不经 LLM），并负责真发 + 留痕。
飞书 server 在「确认发布」回调里直接调本模块，守 douyin-publish 的铁律：
  - 只发 status==approved
  - build_payload 出命令+物料给人看（飞书第二张卡），confirm 才 run_publish 真发
  - 不假装成功：以 sau 输出关键词为准
"""

import re
import shlex
import subprocess
from datetime import datetime
from pathlib import Path

import meta

SUCCESS_MARKERS = ("视频发布成功", "图文发布成功", "发布成功", "提交成功", "submitted")


def _sau_dir(project_root):
    return Path(project_root) / "tools" / "social-auto-upload"


def build_payload(project_root, slug, account="main", when=None):
    """读条目 → 拼 sau 命令 + 物料摘要。返回 dict：
       {ok, errors, slug_dir, type, cmd_argv, cmd_display, summary, cover}
    不执行任何东西。errors 非空表示物料不全，调用方应中止真发。"""
    errors = []
    slug_dir = meta.find_slug_dir(project_root, slug)
    if not slug_dir:
        return {"ok": False, "errors": [f"找不到内容条目: {slug}"], "slug_dir": None}

    m = meta.load_meta(slug_dir)
    status = m.get("status")
    ctype = m.get("type") or "kouban"
    if status != "approved":
        errors.append(f"status={status}（必须 approved 才能发布）")

    mat = meta.read_publish_material(slug_dir)
    title = mat.get("标题", "").strip()
    desc = (mat.get("正文") or mat.get("正文/简介") or mat.get("简介") or "").strip()
    tags = meta.parse_tags(mat.get("话题标签", ""))
    schedule = when or mat.get("建议发布时段", "").strip() or None

    video, cover, images = meta.find_assets(slug_dir)

    if not title:
        errors.append("4-publish.md 缺标题")

    sau_dir = _sau_dir(project_root)
    argv = ["uv", "run", "sau", "douyin"]

    if ctype == "tuwen":
        if not images:
            errors.append("assets/ 无图片（图文必需）")
        argv += ["upload-note", "--account", account, "--images", *[str(p) for p in images],
                 "--title", title]
        if desc:
            argv += ["--note", desc]
    else:  # kouban / 默认视频
        if not video:
            errors.append("assets/ 无视频成片 mp4（口播必需）")
        argv += ["upload-video", "--account", account, "--file", str(video) if video else "<缺mp4>",
                 "--title", title]
        if desc:
            argv += ["--desc", desc]
        if cover:
            argv += ["--thumbnail", str(cover)]

    if tags:
        argv += ["--tags", ",".join(tags)]
    if schedule:
        argv += ["--schedule", schedule]

    cmd_display = f"cd {shlex.quote(str(sau_dir))} && " + " ".join(shlex.quote(a) for a in argv)

    summary = {
        "类型": "图文" if ctype == "tuwen" else "口播视频",
        "标题": title or "（缺）",
        "正文": (desc[:60] + "…") if len(desc) > 60 else (desc or "（无）"),
        "话题": "  ".join(f"#{t}" for t in tags) if tags else "（无）",
        "封面": cover.name if cover else "（无）",
        "媒体": (video.name if video else "（缺mp4）") if ctype != "tuwen"
                 else f"{len(images)}张图",
        "发布时间": schedule or "立即发布",
        "账号": account,
    }
    return {
        "ok": not errors,
        "errors": errors,
        "slug_dir": slug_dir,
        "type": ctype,
        "cmd_argv": argv,
        "cmd_display": cmd_display,
        "summary": summary,
        "cover": cover,
        "schedule": schedule,
    }


def run_publish(project_root, slug, account="main", when=None, headed=False):
    """真发：build_payload → 执行 sau → 判结果 → 留痕。返回 (ok, log_text)。
    不可逆动作，调用方必须已拿到人的「确认发布」点击。"""
    p = build_payload(project_root, slug, account=account, when=when)
    if not p.get("ok"):
        return False, "发布前校验未过：\n- " + "\n- ".join(p.get("errors", ["未知"]))

    argv = list(p["cmd_argv"])
    argv += ["--headed"] if headed else ["--headless"]
    sau_dir = _sau_dir(project_root)
    try:
        proc = subprocess.run(argv, cwd=str(sau_dir), capture_output=True,
                              text=True, timeout=600)
        out = (proc.stdout or "") + "\n" + (proc.stderr or "")
    except Exception as e:
        return False, f"调用 sau 异常：{e}"

    ok = any(mk in out for mk in SUCCESS_MARKERS)
    tail = "\n".join(out.strip().splitlines()[-12:])
    if ok:
        _writeback(p["slug_dir"], p["schedule"])
        return True, tail
    return False, "未检测到成功标记，发布可能失败：\n" + tail


def _writeback(slug_dir, schedule):
    """成功后留痕：meta.status + 4-publish.md 回填实际发布时间。"""
    new_status = "scheduled" if schedule else "published"
    meta.set_status(slug_dir, new_status)
    now = datetime.now().strftime("%Y-%m-%d %H:%M")
    f = Path(slug_dir) / "4-publish.md"
    if f.exists():
        text = f.read_text(encoding="utf-8")
        text = re.sub(r"^(\s*[-*]\s*\*\*实际发布时间\*\*[：:]).*$",
                      rf"\g<1> {schedule or now}", text, count=1, flags=re.M)
        f.write_text(text, encoding="utf-8")
