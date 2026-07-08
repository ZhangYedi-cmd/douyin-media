"""发送审核通知到飞书群（口播稿/文案预览 + 封面 + 审核卡片）

抖音产物 ≠ 小红书图文：这里推「口播稿全文 + 封面」，让人看着真实内容做判断。
成片 mp4 不直接推（体积/飞书限制），物料摘要里标注文件名，需要看本体本地打开。

发送顺序：
  1. 口播稿 / 文案全文（2-script.md，文本消息，便于核对）
  2. 封面图（富文本 post）
  3. 审核卡片（通过 / 打回）

用法:
  python notify.py --slug <slug> [--title ...] [--type kouban|tuwen] [--preview ...]
  --no-content  只发卡片，不推预览（兜底/调试）
"""

import argparse
import json
import sys
from pathlib import Path

import yaml

import meta
from cards import review_card
from feishu import FeishuClient


def send_content_preview(client, chat_id, title, slug_dir, ctype):
    """推 口播稿/文案全文 + 封面（口播）或全部配图（图文）。失败抛异常由调用方兜底。"""
    # 1) 文稿全文：口播稿 2-script.md 优先，回退 copy.txt
    script = Path(slug_dir) / "2-script.md"
    copy = Path(slug_dir) / "copy.txt"
    src = script if script.exists() else (copy if copy.exists() else None)
    if src:
        client.send_text(chat_id, f"📋 待审文稿 | {title}\n\n{src.read_text(encoding='utf-8')}")

    # 2) 配图：口播只推封面；图文推全部图
    video, cover, images = meta.find_assets(slug_dir)
    imgs = images if ctype == "tuwen" else ([cover] if cover else [])
    imgs = [p for p in imgs if p]
    if not imgs:
        return 0
    content = []
    for i, path in enumerate(imgs):
        key = client.upload_image(str(path))
        label = "封面" if (ctype != "tuwen") else f"图{i+1}"
        content.append([{"tag": "text", "text": f"【{label}】"}])
        content.append([{"tag": "img", "image_key": key}])
    client.send_post(chat_id, f"🖼 配图预览（{len(imgs)}张） | {title}", content)
    return len(imgs)


def main():
    ap = argparse.ArgumentParser(description="发送飞书文稿预览 + 审核卡片")
    ap.add_argument("--slug", required=True)
    ap.add_argument("--title", default="")
    ap.add_argument("--type", default="", help="kouban|tuwen，缺省读 meta")
    ap.add_argument("--preview", default="", help="卡片上的一句话摘要")
    ap.add_argument("--no-content", action="store_true")
    args = ap.parse_args()

    cfg = yaml.safe_load((Path(__file__).parent / "config.yaml").read_text())
    chat_id = cfg["chat_id"]
    project_root = cfg["project_root"]

    slug_dir = meta.find_slug_dir(project_root, args.slug)
    if not slug_dir:
        print(f"找不到内容条目: {args.slug}", file=sys.stderr)
        sys.exit(1)

    m = meta.load_meta(slug_dir)
    title = args.title or m.get("title") or args.slug
    ctype = args.type or m.get("type") or "kouban"

    client = FeishuClient()

    if not args.no_content:
        try:
            n = send_content_preview(client, chat_id, title, slug_dir, ctype)
            print(f"预览已推送：文稿 + {n} 张图")
        except Exception as e:
            print(f"⚠️ 预览推送失败（继续发卡片）: {e}", file=sys.stderr)

    card = review_card(args.slug, title, ctype, str(slug_dir), args.preview)
    result = client.send_card(chat_id, card)
    if result.get("code") == 0:
        print(f"审核卡片已发送 message_id={result.get('data', {}).get('message_id', '')}")
    else:
        print(f"发送失败: {json.dumps(result, ensure_ascii=False)}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
