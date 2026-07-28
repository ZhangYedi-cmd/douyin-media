#!/usr/bin/env python3
"""Fix degraded mermaid code blocks in an imported Feishu docx.

Usage: python3 fix_mermaid_blocks.py <doc_token> <local_md_file>

After `lark-cli drive +import --type docx` on a .md file, ```mermaid fences
degrade into plain <pre><code>flowchart...</code></pre> text blocks instead of
rendered diagrams. This script finds each such block (matched in document
order against the mermaid fences in the source .md) and replaces it with a
native `<whiteboard type="mermaid">` block via `lark-cli docs +update
--command block_replace`.
"""
import json
import re
import subprocess
import sys
import tempfile
import os

CLI = ["npx", "--yes", "@larksuite/cli"]


def run(args, cwd=None):
    r = subprocess.run(CLI + args, cwd=cwd, capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(f"lark-cli {' '.join(args)} failed:\n{r.stdout}\n{r.stderr}")
    return r.stdout


def main():
    doc_token, md_file = sys.argv[1], sys.argv[2]

    md_text = open(md_file, encoding="utf-8").read()
    fences = re.findall(r"```mermaid\n(.*?)\n```", md_text, re.DOTALL)
    if not fences:
        print("no mermaid fences in source md, nothing to do")
        return

    out = run(["docs", "+fetch", "--as", "user", "--doc", doc_token,
               "--scope", "full", "--detail", "with-ids", "--format", "json"])
    doc = json.loads(out)
    content = doc["data"]["document"]["content"]

    pre_ids = []
    for m in re.finditer(r'<pre id="([^"]+)"[^>]*><code>(flowchart|sequenceDiagram|graph|classDiagram|gantt|pie|erDiagram|stateDiagram)', content):
        pre_ids.append(m.group(1))

    n = min(len(fences), len(pre_ids))
    if len(fences) != len(pre_ids):
        print(f"WARNING: {len(fences)} mermaid fences in md but {len(pre_ids)} degraded <pre> blocks found in doc; "
              f"fixing the first {n} by order, rest left as-is", file=sys.stderr)

    with tempfile.TemporaryDirectory() as tmpdir:
        for i in range(n):
            mmd_name = f"diagram{i}.mmd"
            with open(os.path.join(tmpdir, mmd_name), "w", encoding="utf-8") as f:
                f.write(fences[i].strip() + "\n")
            run(["docs", "+update", "--as", "user", "--doc", doc_token,
                 "--command", "block_replace", "--block-id", pre_ids[i],
                 "--content", f'<whiteboard type="mermaid" path="@{mmd_name}"></whiteboard>'],
                cwd=tmpdir)
            print(f"replaced mermaid block {i+1}/{n} (block_id={pre_ids[i]})")

    print(f"done: {n} mermaid block(s) converted to native whiteboard")


if __name__ == "__main__":
    main()
