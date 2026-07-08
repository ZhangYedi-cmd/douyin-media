"""内容条目定位与读写 — content/<日期>/<slug>/ 下的 meta.yaml / 4-publish.md / assets

只做确定性的文件读写，不依赖 LLM。供 publish.py / notify.py / server.py 共用。
"""

import re
from datetime import datetime
from pathlib import Path

VIDEO_EXTS = (".mp4", ".mov", ".m4v")
IMAGE_EXTS = (".png", ".jpg", ".jpeg", ".webp")
COVER_HINTS = ("cover", "封面", "thumb")


def find_slug_dir(project_root, slug):
    """在 content/ 下定位 <slug> 目录。兼容 content/<日期>/<slug>/ 与 content/<slug>/。"""
    root = Path(project_root) / "content"
    # content/*/<slug>
    hits = sorted(root.glob(f"*/{slug}"))
    hits = [p for p in hits if p.is_dir()]
    if hits:
        return hits[-1]  # 多个同名取最新（日期目录排序靠后）
    direct = root / slug
    if direct.is_dir():
        return direct
    return None


def load_meta(slug_dir):
    """读 meta.yaml 为 dict（用 yaml）。仅用于读字段，不用于回写（回写走正则保原貌）。"""
    import yaml
    f = Path(slug_dir) / "meta.yaml"
    if not f.exists():
        return {}
    return yaml.safe_load(f.read_text(encoding="utf-8")) or {}


def set_status(slug_dir, new_status, stamp=True):
    """正则改 meta.yaml 的 status 行（保留注释/顺序）；best-effort 填对应 timestamps。"""
    f = Path(slug_dir) / "meta.yaml"
    text = f.read_text(encoding="utf-8")
    text = re.sub(r"^(status:\s*)\S+(.*)$", rf"\g<1>{new_status}\g<2>",
                  text, count=1, flags=re.M)
    if stamp:
        now = datetime.now().strftime("%Y-%m-%d %H:%M")
        # 在 timestamps 下，把 "  <status>:" 这一行补上时间（仅当该行当前为空）
        text = re.sub(rf"^(\s+{re.escape(new_status)}:)\s*$",
                      rf"\g<1> {now}", text, count=1, flags=re.M)
    f.write_text(text, encoding="utf-8")


_FIELD_RE = re.compile(r"^\s*[-*]\s*\*\*(.+?)\*\*[：:]\s*(.*)$")


def read_publish_material(slug_dir):
    """解析 4-publish.md 的 bullet 字段为 dict。
    支持键：标题 / 正文 / 简介 / 话题标签 / 封面 / 建议发布时段 / 媒体文件。
    注：取每个 bullet 行冒号后的单行内容（正文多行场景取首行，复杂排版需人工核对）。"""
    f = Path(slug_dir) / "4-publish.md"
    out = {}
    if not f.exists():
        return out
    for line in f.read_text(encoding="utf-8").splitlines():
        m = _FIELD_RE.match(line)
        if not m:
            continue
        key, val = m.group(1).strip(), m.group(2).strip()
        out[key] = val
    return out


def parse_tags(raw):
    """'#a #b #c' 或 '#a #b #c' → ['a','b','c']；'a,b' 也兼容。"""
    if not raw:
        return []
    parts = re.split(r"[#,\s]+", raw)
    return [p.strip() for p in parts if p.strip()]


def find_assets(slug_dir):
    """返回 (video_path|None, cover_path|None, images[list])，均为绝对路径。"""
    adir = Path(slug_dir) / "assets"
    video = cover = None
    images = []
    if not adir.is_dir():
        return video, cover, images
    files = sorted(adir.rglob("*"))
    vids = [p for p in files if p.suffix.lower() in VIDEO_EXTS]
    imgs = [p for p in files if p.suffix.lower() in IMAGE_EXTS]
    if vids:
        video = vids[0].resolve()
    # 封面：文件名带 cover/封面/thumb 的优先，否则第一张图
    cov = [p for p in imgs if any(h in p.name.lower() for h in COVER_HINTS)]
    if cov:
        cover = cov[0].resolve()
    elif imgs:
        cover = imgs[0].resolve()
    images = [p.resolve() for p in imgs]
    return video, cover, images
