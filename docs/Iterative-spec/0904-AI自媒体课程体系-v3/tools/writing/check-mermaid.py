#!/usr/bin/env python3
"""校验课程里的 mermaid 图。用法: python3 check-mermaid.py <md...>
退出码: 有 ERROR 返回 1。"""
import re,sys,os
OK_HEAD=('flowchart TD','flowchart LR','flowchart RL','flowchart BT','sequenceDiagram','stateDiagram-v2')
BAD_CHARS={'——':'破折号','「':'直角引号','」':'直角引号','！':'感叹号'}
def blocks(t):
    out=[];cur=None
    for i,l in enumerate(t.split('\n'),1):
        if l.strip().startswith('```mermaid'): cur=[i,[]]; continue
        if cur is not None:
            if l.strip()=='```': out.append((cur[0],cur[1])); cur=None
            else: cur[1].append(l)
    return out
def check(p):
    t=open(p,encoding='utf-8').read(); errs=[]; n=0
    for ln,body in blocks(t):
        n+=1
        if not body: errs.append((ln,'空图')); continue
        head=body[0].strip()
        if not head.startswith(OK_HEAD):
            errs.append((ln,f'图类型不在允许列表: {head[:30]}'))
        txt='\n'.join(body)
        # 标签含特殊字符但没用双引号包住
        for m in re.finditer(r'[\w]+\[([^\]\n]*)\]',txt):
            lab=m.group(1)
            if lab.startswith('"') and lab.endswith('"'): continue
            hit=[c for c in '():/"' if c in lab]
            if hit: errs.append((ln,f'标签含 {"".join(hit)} 未加双引号: {m.group(0)[:36]}'))
        # subgraph 嵌套
        d=0
        for l in body:
            s=l.strip()
            if s.startswith('subgraph'): d+=1; errs.append((ln,'含 subgraph（约定不用）')) if d>1 else None
            elif s=='end': d=max(0,d-1)
        # 节点数
        ids=set(re.findall(r'(?m)^\s*([A-Za-z]\w*)\s*[\[\(\{]',txt))
        if len(ids)>15: errs.append((ln,f'节点数 {len(ids)} 超过 15'))
        # 禁用字符
        for c,name in BAD_CHARS.items():
            if c in txt: errs.append((ln,f'图内出现{name}'))
        if re.search(r'[\U0001F300-\U0001FAFF]',txt): errs.append((ln,'图内出现 emoji'))
    return n,errs
rc=0; tot=0
for p in [a for a in sys.argv[1:] if not a.startswith('--')]:
    n,errs=check(p); tot+=n
    tag='OK' if not errs else f'{len(errs)} 个问题'
    print(f'{os.path.basename(p):46} 图 {n} 张  {tag}')
    for ln,e in errs: print(f'    L{ln}: {e}'); rc=1
print(f'\n合计 {tot} 张图')
sys.exit(rc)
