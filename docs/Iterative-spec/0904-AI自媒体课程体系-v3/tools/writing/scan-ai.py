#!/usr/bin/env python3
"""课程 AI 味扫描器。用法: python3 scan-ai.py <md...> [--json]
数据源: ai-patterns.json(24 模式) + lexicon.json(口语词) + 本文件的 exclude 规则。
退出码: 有 ERROR 返回 1, 否则 0。"""
import json, re, sys, os, collections

HERE = os.path.dirname(os.path.abspath(__file__))
PATS = json.load(open(os.path.join(HERE, 'ai-patterns.json'), encoding='utf-8'))['patterns']
LEX = json.load(open(os.path.join(HERE, 'lexicon.json'), encoding='utf-8'))

# ADR 第四节：确认的误报，命中后再过这层过滤
EXCLUDE = {
    'P012': re.compile(r'^(一条|一样|一点|三点|两件|三件|四条|六项|一句)：$'),  # 冒号引导非承诺句
    'P013': re.compile(r'^踩坑$'),                                              # lessons.md 正式叫法
}
# ADR 决策 2：check-lesson.sh 原正则漏掉的无「而」变体
P007_EXTRA = re.compile(r'不是[^。！？；\n]{2,30}，(?:就)?是[^。！？；\n]{2,30}')
BAN_TITLE = LEX['title_verbs_ban']['words']
GUARD = LEX['term_guard']['patterns']

def strip_code(t):
    # 用等量空行替换代码块，保持行号与原文一致
    t = re.sub(r'```.*?```', lambda m: '\n' * m.group(0).count('\n'), t, flags=re.S)
    return re.sub(r'`[^`]*`', '', t)

def scan(path):
    raw = open(path, encoding='utf-8').read()
    txt = strip_code(raw)
    lines = txt.split('\n')
    out = []
    for pat in PATS:
        rx = pat.get('regex')
        if not rx:
            continue
        try:
            c = re.compile(rx, re.M)
        except re.error:
            continue
        ex = EXCLUDE.get(pat['id'])
        found = []
        for i, l in enumerate(lines, 1):
            for m in c.finditer(l):
                s = m.group(0)
                if ex and ex.match(s):
                    continue
                found.append((i, s[:50]))
        if len(found) >= (pat.get('min_count') or 1):
            out.append(dict(id=pat['id'], sev=pat['severity'], name=pat['name'],
                            n=len(found), hits=found[:4]))
    # P007 无「而」变体，ADR 决策 2 限量每篇 2 处
    v = [(i, m.group(0)[:50]) for i, l in enumerate(lines, 1) for m in P007_EXTRA.finditer(l)]
    if len(v) > 2:
        out.append(dict(id='P007b', sev='error', name='「不是X，是Y」超过每篇 2 处上限（ADR 决策 2）',
                        n=len(v), hits=v[:4]))
    # 口语词（ADR 决策 6）
    oral = []
    for w in LEX['oral']:
        for i, l in enumerate(lines, 1):
            for m in re.finditer(re.escape(w['word']), l):
                ctx = l[max(0, m.start()-6):m.end()+6]
                if any(g in ctx for g in GUARD):
                    continue
                oral.append((i, w['word'], '/'.join(w['to'][:2])))
    if oral:
        out.append(dict(id='LEX', sev='error', name='口语词需改书面语（ADR 决策 6）',
                        n=len(oral), hits=[(i, f'{w} → {t}') for i, w, t in oral[:6]]))
    # 标题层强修辞动词（ADR 决策 5）
    th = [(i, l.strip()[:60]) for i, l in enumerate(lines, 1)
          if l.startswith('#') and any(b in l for b in BAN_TITLE)]
    if th:
        out.append(dict(id='TTL', sev='error', name='标题含强修辞动词（ADR 决策 5）', n=len(th), hits=th[:4]))
    # 标题编号形态（ADR 决策 4）
    bad = []
    for i, l in enumerate(lines, 1):
        if re.match(r'^## ', l) and not re.match(r'^## [一二三四五六七八九十]+、', l):
            bad.append((i, l.strip()[:50]))
        if re.match(r'^### ', l) and not re.match(r'^### \d+\.\d+ ', l):
            bad.append((i, l.strip()[:50]))
    if bad:
        out.append(dict(id='NUM', sev='error', name='标题编号不合 ADR 决策 4（## 用「一、」/ ### 用「1.1」）',
                        n=len(bad), hits=bad[:4]))
    return out

def main():
    files = [a for a in sys.argv[1:] if not a.startswith('--')]
    as_json = '--json' in sys.argv
    rc, report = 0, {}
    for f in files:
        r = scan(f)
        report[os.path.basename(f)] = r
        if any(x['sev'] == 'error' for x in r):
            rc = 1
        if not as_json:
            errs = [x for x in r if x['sev'] == 'error']
            warns = [x for x in r if x['sev'] != 'error']
            print(f"\n=== {os.path.basename(f)}  ERROR {len(errs)} / WARN {len(warns)}")
            for x in errs + warns:
                print(f"  [{x['sev'].upper():5}] {x['id']} {x['name']}  x{x['n']}")
                for ln, s in x['hits']:
                    print(f"          L{ln}: {s}")
    if as_json:
        print(json.dumps(report, ensure_ascii=False, indent=1))
    sys.exit(rc)

main()
