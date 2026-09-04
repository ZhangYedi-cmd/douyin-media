---
plan: fixed-from-card
length: standard
figures: none
sections: 4
---

大纲不做自选，直接展开任务卡 `plan/cards/09.md` 第「2.1 大纲」块。局部调整只有一处：任务卡第 3 节的核心判断原文只覆盖"每一次 FAIL 都要让主回话推倒重来一整轮"，本大纲在第 3 节补一条子判断——工具白名单挡的是 Edit/Write 这两个工具，Bash 依然在白名单里，Bash 的重定向能力理论上仍可写文件，这条防线没有沙盒隔离兜底，只能靠事后 `git status` 核对；这是用户在任务书里明确要求"如实写"的一条，不写会让"判改分离"显得比实际更硬。这条补充放在第 2 节（工具白名单）收尾处，不新增小节、不改变节的数目和顺序。四节的数目、标题方向、承接顺序均照任务卡原样，未做其他调整。

## 1. 谁来判：执行和判断不能是同一个角色
核心判断: 写稿、改文案、判 PASS/FAIL 如果都在同一个 AI 的同一个上下文里做，它会不自觉地觉得自己刚做完的东西"过得去"，判断权要单独切出来，交给一个不参与创作的角色。
支撑材料: 第 07 课成稿的三分类判据（语速/多音字/音画一致原本归"人判"）+ `pipeline/2-create.md` 步骤 4 的"职责分离：reviewer 只判不改"原文
交付物: 反例对照块（同一个 AI 既写稿又判自己的活）+ 正解块（两个角色看同一批客观数字，判的人不参与改）
二级标题: none
收尾交接: 角色要分开这件事道理上说得通，但落到子代理定义里，得靠什么让它真的改不了。

## 2. 工具白名单：把"不能改"焊进定义里
核心判断: 判改分离不是靠这个角色"记得"不去改，是靠它的工具列表里物理上没有 Edit 和 Write，这条约束比任何一句提示词都硬；但这条硬约束的边界也要如实说清——Bash 还在，重定向能写文件，本课程没做沙盒隔离，靠事后 git status 看，这是一条软防线。
支撑材料: `.claude/agents/dubbing-reviewer.md` frontmatter 实物（`tools: Bash, Read, Grep, Glob`，无 Edit/Write）作为形状参考
交付物: Prompt 块——起草 `dubbing-reviewer.md` 子代理定义的 frontmatter
二级标题: none
收尾交接: 权限焊死了，但裁判怎么读六个脚本的结果、判多严，还没定。

## 3. 裁决口径：保守判 FAIL，输出格式钉死
核心判断: 每一次 FAIL 都要让主回话推倒重来一整轮（改文案、重合成、再判），代价不小，所以裁判必须对真问题判 FAIL、对统计假象不判，判断标准和输出格式都不能让它临场自由发挥。
支撑材料: `.claude/skills/dubbing-check/scripts/` 六脚本源码实测（三项 exit 1/0，三项只列候选不判对错）+ `pipeline/lessons.md` L2/L3 真实事故 + `dubbing-check/SKILL.md` 检查点阈值出处
交付物: Prompt 块——补裁决口径表（三项硬门槛+三项候选）并钉死输出格式（VERDICT/ROUND/BLOCKING/NON-BLOCKING/SUMMARY）
二级标题:
  3.1 六项检查点各自的裁决口径：三项硬门槛（脚本 exit 1 直接 FAIL）+ 三项候选（逐条辨真假再判）
  3.2 输出结构固定：VERDICT / ROUND / BLOCKING（每条问题配一个可执行的改法）/ NON-BLOCKING / SUMMARY
收尾交接: 定义写完了，得在一批真实配音上真跑一次，才知道它立不立得住。

## 4. 跑一次真实判决
核心判断: 定义写在纸上不算数，得让它真的判一次、拿到一份 PASS 或 FAIL 才算立住。
支撑材料: 学员第 05/06 课自己那条内容的 `build/` 工程目录（真实存在，`content/<slug>/build/`）+ `pipeline/2-create.md` 步骤 4 的轮次上限约定
交付物: 命令块——派 dubbing-reviewer 审一遍学员自己那条内容的配音批次，产出真实 VERDICT/ROUND/BLOCKING/NON-BLOCKING/SUMMARY 判决输出并存档
二级标题: none
收尾交接: 裁判独立了，一次判决能给出 PASS 或者 FAIL。判 FAIL 之后呢，谁去修，修完再判，什么时候停？
