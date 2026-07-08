#!/usr/bin/env python3
"""douyin-retro 采集器:复用 social-auto-upload 的 patchright 环境 + 抖音 cookie,
免扫码拉创作者中心数据,输出结构化 JSON。零额外依赖(xlsx 用标准库解析)。

用法(必须用 sau 的 venv 跑,它带 patchright):
  cd tools/social-auto-upload
  .venv/bin/python <skill>/scripts/fetch.py --out /tmp/retro.json [--keep-xlsx DIR]

退出码:0 成功 | 2 cookie 失效(去 `sau douyin login` 刷新)| 1 其它错误
"""
import argparse, json, sys, zipfile, pathlib
import xml.etree.ElementTree as ET
from patchright.sync_api import sync_playwright

NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
OPERATION = "https://creator.douyin.com/creator-micro/data-center/operation"
CONTENT = "https://creator.douyin.com/creator-micro/data-center/content"
COOKIE = "cookies/douyin_main.json"  # 相对 sau 工作目录

# 导出列名 → 英文 key + 是否比率(比率列导出值是 0~1 小数)
COLMAP = {
    "作品名称": "title", "发布时间": "publish_time", "体裁": "format",
    "审核状态": "audit", "播放量": "plays", "完播率": "finish_rate",
    "5s完播率": "finish_5s", "封面点击率": "ctr", "2s跳出率": "bounce_2s",
    "平均播放时长": "avg_play_sec", "点赞量": "likes", "分享量": "shares",
    "评论量": "comments", "收藏量": "collects", "主页访问量": "profile_visits",
    "粉丝增量": "fans_delta",
}
RATE_COLS = {"finish_rate", "finish_5s", "ctr", "bounce_2s"}
NUM_COLS = {"plays", "likes", "shares", "comments", "collects",
            "profile_visits", "fans_delta", "avg_play_sec"}


def log(*a): print(*a, file=sys.stderr, flush=True)


def parse_xlsx(path):
    """标准库解析 xlsx 第一个 sheet → list[dict],按 COLMAP 转 key + 类型。"""
    z = zipfile.ZipFile(path)
    ss = []
    if "xl/sharedStrings.xml" in z.namelist():
        r = ET.fromstring(z.read("xl/sharedStrings.xml"))
        for si in r.findall(f"{NS}si"):
            ss.append("".join(t.text or "" for t in si.iter(f"{NS}t")))
    sheet = ET.fromstring(z.read("xl/worksheets/sheet1.xml"))

    def cell(c):
        v = c.find(f"{NS}v")
        if v is None:
            return ""
        return ss[int(v.text)] if c.get("t") == "s" else v.text

    rows = [[cell(c) for c in row.findall(f"{NS}c")]
            for row in sheet.findall(f".//{NS}row")]
    if not rows:
        return []
    header = [COLMAP.get(h, h) for h in rows[0]]
    out = []
    for r in rows[1:]:
        d = dict(zip(header, r))
        for k in list(d):
            if k in NUM_COLS:
                try: d[k] = float(d[k]) if d[k] not in ("", "-") else None
                except ValueError: d[k] = None
            elif k in RATE_COLS:
                try: d[k] = round(float(d[k]), 6) if d[k] not in ("", "-") else None
                except ValueError: d[k] = None
        out.append(d)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True, help="输出 JSON 路径")
    ap.add_argument("--cookie", default=COOKIE)
    ap.add_argument("--keep-xlsx", help="保留原始 xlsx 到该目录(可追溯)")
    ap.add_argument("--headful", action="store_true")
    args = ap.parse_args()

    tmp = pathlib.Path(args.keep_xlsx) if args.keep_xlsx else pathlib.Path("./.retro_tmp")
    tmp.mkdir(parents=True, exist_ok=True)
    result = {"account": {}, "works": []}

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=not args.headful)
        ctx = browser.new_context(storage_state=args.cookie, accept_downloads=True)
        page = ctx.new_page()

        # --- 登录态 ---（dashboard 长连接,不用 networkidle,靠选择器等渲染）
        page.goto(OPERATION, wait_until="domcontentloaded", timeout=60000)
        if "login" in page.url or "passport" in page.url:
            log("cookie 失效,跑 `sau douyin login` 刷新"); browser.close(); sys.exit(2)
        log("[1] 登录态 OK")

        # --- 账号诊断对标(DOM 抓 "高于 X% 的同类创作者" 文案) ---
        try:
            page.wait_for_selector("text=同类创作者", timeout=15000)
            lines = page.locator("text=/高于.*同类创作者|低于.*同类创作者/").all_inner_texts()
            result["account"]["peer_benchmark"] = [s.strip() for s in lines if s.strip()]
            log("[2] 对标文案", len(result["account"]["peer_benchmark"]), "条")
        except Exception as e:
            log("[2] 对标抓取失败:", e)

        # --- 投稿列表导出 xlsx ---
        page.goto(CONTENT, wait_until="domcontentloaded", timeout=60000)
        try:
            page.get_by_text("投稿列表", exact=True).first.click(timeout=20000)
            page.wait_for_timeout(2500)
            with page.expect_download(timeout=30000) as dl_info:
                page.get_by_role("button", name="导出数据").first.click()
            dl = dl_info.value
            xlsx = tmp / dl.suggested_filename
            dl.save_as(str(xlsx))
            result["works"] = parse_xlsx(xlsx)
            log("[3] 投稿列表", len(result["works"]), "条")
        except Exception as e:
            log("[3] 投稿列表导出失败:", repr(e)); browser.close(); sys.exit(1)

        browser.close()

    pathlib.Path(args.out).write_text(
        json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    log("=> 写出", args.out)


if __name__ == "__main__":
    main()
