"""claude -p 委托的 prompt / 命令 —— 单一真相源。

server.py import 本文件构造委托给子 claude 进程的输入。
**改 prompt 只动这里，不碰 server 逻辑**（prompt 即配置，调度器只是解释器）。
人读的说明见 PROMPTS.md；本文件是机器真相源。
"""

# 两处委托共用的工具白名单
ALLOWED_TOOLS = "Bash,Read,Write,Edit,Skill"


def rework_prompt(slug, slug_dir, reason, nth):
    """场景1：打回 → 自动重做。自然语言走 pipeline/2-create.md SOP（抖音无单一重做 skill）。
    server 同步等重做跑完 → 读 meta.status：回到 review 则自动重新出审（推新审核卡），
    否则发预警。Claude 改完须把 status 改回 review——这是 server 判成败、决定回报的依据。"""
    return (
        f"内容条目 {slug}（目录 {slug_dir}）被人工审核打回，这是第 {nth} 次重做。\n"
        f"打回原因：{reason}\n"
        f"请读 pipeline/2-create.md 与该条目的 1-brief.md、2-script.md、3-review.md，"
        f"针对打回原因重做创作（口播稿改 2-script.md，必要时重生成 assets），"
        f"完成后把 meta.yaml 的 status 改回 review，并在 3-review.md 记一行重做说明。\n"
        f"若遇到需要人工对齐的节点（如 web-video-presentation 的对齐），停下并在 3-review.md "
        f"记录待办，不要假装完成。"
    )


def publish_command(slug):
    """场景2：确认发布 → 调 douyin-publish skill。斜杠命令直调现成 skill，不在此重实现。
    讲死授权语义：claude -p 非交互，没人能回复确认；--publish = 人已在飞书确认卡授权，
    必须直接真发、跳过 dry-run、不再求确认（否则 skill 会停在确认闸、status 不动判失败）。"""
    return (
        f"人已在飞书确认卡点「确认发布」授权发布条目 {slug}（这就是 --publish=已确认）。"
        f"调用 /douyin-publish {slug} --publish 直接真发到抖音："
        f"跳过 dry-run 确认闸、不要再问我确认、不要只打印命令，直接执行 sau 命令完成发布，"
        f"再按 skill Step 5 回填 meta.yaml 的 status（published/scheduled）和 4-publish.md。"
        f"若 cookie 失效就如实报失败、不要自动登录。"
    )
