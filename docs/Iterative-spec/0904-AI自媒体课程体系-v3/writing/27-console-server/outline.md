---
plan: fixed-from-card
length: long
figures: none
sections: 7
---

大纲照任务卡 `plan/cards/27.md` 「2.1 大纲」块展开，节的数目、顺序、每节交付物不改。局部调整只有两处，都是为了贴合背景包第 2 节「参考仓库文件不等于学员文件」的铁律：

1. 第 1 节交付物原文写「读接口内部一律调用 core 的 `snapshot.ts`/`dashboard.ts`」，写作时改成「读接口内部复用 core 已有的 `parsers`，用 Prompt 让 AI 照参考流水线的思路把这层聚合单独做成一个模块（对照参考仓库的 `snapshot.ts`）」——学员 core 包此刻只有第 14 课交的 `parsers`/`state`/`writer` 三件，没有 `snapshot.ts`，这一处必须改措辞，不能改判断本身。
2. 第 6 节的措辞对齐第 19 课成稿第 93 行原文（配置开关默认委托控制台、19 课当时锁定的是服务自己起子进程那条路），本课把开关翻回默认值；同时用 0818 后端执行方案 §1 S8 的真实范围收窄：只有「确认发布」「打回自动重做」这两类重活切给控制台，「审核卡通过」「打回挂待办」这两个快写动作继续走 M2 已经改好的 subprocess 调 `media flip`，不绕 server。任务卡原文没写这条范围区分，但第 19 课成稿和 0818 方案都白纸黑字这么写，不加区分会让读者以为飞书服务整个都不再直接碰状态,、跟第 19 课「通过按钮」的验收动作矛盾。

## 1. 六个快照接口：一页一个，不合并成一个大对象
核心判断: 六个页面各自只要自己的那份数据，接口按页面切而不是按数据表切，前端才不用自己再拼一次。
支撑材料: routes/read.ts 六个端点；projections.ts 纯投影函数；core/snapshot.ts 的 buildSnapshot() 单一 IO 聚合点；14 课 core 三件清单（防止把 snapshot.ts 当学员已有）。
交付物: 对照清单（接口/页面/数据来源）；一条 Prompt 让 AI 用 core 的 parsers 实现六个读接口并把快照聚合单独做成模块。
二级标题: none
收尾交接: 六个页面有了数据源，但 file/asset/health 这类不属于任何单一页面的能力还没接。

## 2. file、asset、health：三个基础设施接口
核心判断: 读白名单文件、读封面等静态物料、报健康状态，三件事每个页面都会用到，单独做成横切接口。
支撑材料: routes/files.ts 白名单目录与扩展名、Range 分片；routes/read.ts 的 /api/health 四盏灯。
交付物: 一条 Prompt 要求 file 只读白名单目录、health 带 revision；一张验收清单（越权路径应被拒绝、health 是否带 revision）。
二级标题: none
收尾交接: 单次请求的接口都通了，但状态变化怎么让前端知道还没做。

## 3. SSE 推变更：store、watcher、revision 三件怎么配合
核心判断: 前端不轮询，靠 SSE 收到有变化的信号后自己重拉，SSE 本身不推数据，只推一个 revision 号。
支撑材料: sse.ts SseHub 广播 {revision,reason}；watcher.ts chokidar 监听清单+DEBOUNCE_MS=500；store.ts revision 唯一产地。
交付物: 时序清单（文件变化→watcher感知→store重建快照→revision自增→SSE广播）；一条 Prompt 实现这条链路；两条排障句（debounce窗口/watcher漏目录）。
二级标题: none
收尾交接: 读路径全通了，下一步做写路径。

## 4. 快写 4 条：把点击翻译成一条 media 命令
核心判断: 写路径不重新发明状态变更逻辑，只是把 HTTP 请求原样转成一条 execFile media 命令。
支撑材料: routes/actions.ts 四端点；actions/whitelist.ts 映射函数；actions/execMedia.ts 错误透传（409 MEDIA_REJECTED 带 CLI 原文 message/rule）。
交付物: 映射表（端点/背后命令/触发场景）；一条 Prompt 让 AI 实现四条并原样透传非法迁移错误。
二级标题: none
收尾交接: 毫秒级记账动作通了，但有几个动作不是一条命令能完事的。

## 5. 慢作业 3 条：spawn 一次无头 CC，用 job runner 兜底
核心判断: 确认发布、打回重做、治理提议入库背后是要跑几分钟的判断性任务，先返回任务 id，进度靠 SSE 或轮询拿。
支撑材料: routes/jobs.ts 五端点（只讲前三条）；jobs/defs.ts 超时表+REWORK_LIMIT=2；jobs/runner.ts submitRework 的 before-step、execCcJob 直接调用 cc-stream 的 runHeadlessCC；jobs/verdict.ts 现场读 meta.yaml 状态；25课 cc-stream 六文件与裁决函数、结尾预告落终态快照。
交付物: 作业清单（类型/超时/成败怎么判）；一条 Prompt 让 AI 用 25 课的 cc-stream 和裁决函数实现三类作业，不重新造；一句话说明 harness-run/create 不在 1:1 范围。
二级标题: none
收尾交接: 写路径两条都通了，但这条线原来是飞书那边在走，现在要挪过来。

## 6. 飞书回调改道：第 19 课那个服务不再自己写
核心判断: 飞书按钮点下去之后记账动作，原来是飞书服务自己改状态、自己 spawn CC，现在改成打控制台的写 API，状态写入只留一个入口。
支撑材料: 19课成稿第89-93行原文（配置开关、默认委托控制台、19课当时锁定另一条路）；0818方案 §1 S8 精确范围（只切 publish/rework 两个重活，approve/todo 快写不改）。
交付物: 一条 Prompt 对照第 19 课服务里直接 spawn CC 改状态的代码段，改成调用第 4、5 节的端点；一条验收动作（飞书审核一次通过，看状态变化经没经过控制台写 API）。
二级标题: none
收尾交接: 读写两条 API 都通了，接下来该做界面。

## 7. 收尾：读写两条 API 都通了，界面还没影
核心判断: 无（收尾节）
支撑材料: handoff-ledger.md 第27行；卡片「学员交付」一节。
交付物: 无（总结段落）
二级标题: none
收尾交接: 逐字落在 handoff-ledger 第27行「结尾抛出的问题」：读写两条 API 都通了。开始做界面，骨架和头两页怎么落设计稿？
