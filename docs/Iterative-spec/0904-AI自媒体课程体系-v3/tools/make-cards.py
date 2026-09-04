#!/usr/bin/env python3
"""把 Multica PLUT-76..108 的 issue 描述转成本机任务卡 plan/cards/NN.md。"""
import json, re, subprocess, pathlib

M = "/Applications/Multica.app/Contents/Resources/app.asar.unpacked/resources/bin/multica"
WS = "3aad2771-ff96-479b-9f49-8d0723d1d445"
ROOT = pathlib.Path("/Users/yedizhang/yedi-study/douyin-media")
V3 = "docs/Iterative-spec/0904-AI自媒体课程体系-v3"
OLD = "docs/Iterative-spec/0901-AI自媒体课程体系"
OUT = ROOT / V3 / "plan/cards"
OUT.mkdir(parents=True, exist_ok=True)

REPL = [
    ("/Users/yedi/douyin-media", str(ROOT)),
    (f"{OLD}/courses-v3/", f"{V3}/courses/"),
    (f"{OLD}/writing/v3-", f"{V3}/writing/"),
    (f"{OLD}/writing/handoff-ledger.md", f"{V3}/plan/handoff-ledger.md"),
    (f"{OLD}/tools/check-lesson.sh", f"{V3}/tools/check-lesson.sh"),
    (f"{OLD}/courses-v2/", f"{V3}/plan/old-courses/v2-"),
    (f"{OLD}/courses/", f"{V3}/plan/old-courses/v1-"),
    ("`04-补全计划-零仓库从头实现.md`", "`00-ADR.md`"),
    ("04-补全计划-零仓库从头实现.md", "00-ADR.md（补全计划已并入 ADR，§ 号按 ADR 章节对应：§2.1 工具表见 ADR §5，§3 六步见 ADR D4，§4 推进顺序见 ADR §4 末表，§5 逐课见 ADR §4 大纲表）"),
]

def fetch(n):
    out = subprocess.check_output([M, "--profile", "desktop-api.multica.ai", "--workspace-id", WS,
                                   "issue", "get", f"PLUT-{n}", "--output", "json"])
    return json.loads(out)

for n in range(76, 109):
    d = fetch(n)
    lesson = n - 75
    desc = d["description"]
    # 1. 路径替换
    for a, b in REPL:
        desc = desc.replace(a, b)
    # 2. 第 8 块（Multica 接力）整块替换为本机流程
    desc = re.sub(r"## 8\. 接力与失败处置.*?(?=\n---\n\n## 共同约束)",
        "## 8. 交付后\n\n交稿后不做接力。把三样东西写进你的最终回复：成稿路径、check-lesson.sh 最后 12 行输出、未核实项清单（仓库里 grep 不到、已按规则删掉或改写的名词与数字）。主回话验收后决定下一课。\n\n失败怎么办：硬禁令没清零、材料不足被 Step 1 拦下这类能自愈的，原地重试一次。重试仍失败就停下，在回复里写清卡在哪一步、报错原文，不要自己降低标准硬交。\n",
        desc, flags=re.S)
    # 3. 材料清单里 mac mini 写的等价路径 writing/v3-NN/final.md 改成本机 writing 目录
    desc = re.sub(r"writing/(\d\d)/final\.md", r"writing/\1-*/final.md", desc)
    # 4. 第 01 课以外，把「上一课成稿」那条改成本机 courses/ 路径（已由 REPL 覆盖），再补一句
    header = (f"# 第 {lesson:02d} 课任务卡\n\n"
              f"> 来源：Multica {d['identifier']} 描述，2026-09-04 转换。先读 `{V3}/plan/00-写作背景包.md`，再读本卡。\n"
              f"> 本卡里凡是引用 `00-ADR.md` 章节号的地方，按 ADR 实际章节找；找不到就在回复的未核实项里说明。\n\n")
    (OUT / f"{lesson:02d}.md").write_text(header + desc, encoding="utf-8")
    print(lesson, d["title"])
