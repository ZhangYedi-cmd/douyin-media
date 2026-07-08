# 数据通道(已实测 2026-06-14)

## 登录态:复用 sau cookie,免扫码
- cookie 文件:`tools/social-auto-upload/cookies/douyin_main.json`(Playwright `storage_state` 格式,带 `creator.douyin.com` 域 + `sessionid/sid_tt/sid_guard/ttwid`)。
- 由 sau 的发布链路天然维护;复盘只读复用,不单独维护登录。
- 运行环境:**必须用 sau 的 venv**(带 patchright):`tools/social-auto-upload/.venv/bin/python`,工作目录 = `tools/social-auto-upload`(cookie 路径相对它)。
- 失效检测:进页面后若 URL 含 `login/passport` → cookie 失效,`fetch.py` 退出码 2,提示去 `sau douyin login` 刷新。**绝不静默出空数据。**

## 关键页面
| 用途 | URL | 采集方式 |
|---|---|---|
| 账号总览(账号级+对标) | `/creator-micro/data-center/operation` | 对标文案 DOM 抓;数据表现可导出 |
| 作品分析(逐条) | `/creator-micro/data-center/content` → 切「投稿列表」 | **导出 xlsx**(已验通) |
| 作品详情(深钻) | `/creator-micro/work-management/work-detail/<awemeId>?enter_from=item_data` | DOM 抓 4 tab(待 v2 验导出) |

## 投稿列表导出字段(xlsx,16 列,原始精度)
`fetch.py` 标准库解析,无需 openpyxl。比率列是 0~1 小数,时长是秒。

| 导出列 | key | 说明 |
|---|---|---|
| 作品名称 | title | 含 hashtag |
| 发布时间 | publish_time | |
| 体裁 | format | 1min/3-5min/5min+视频、长图文、图文 |
| 审核状态 | audit | 公开/私密 |
| 播放量 | plays | |
| 完播率 | finish_rate | 比率 |
| 5s完播率 | finish_5s | 比率 |
| 封面点击率 | ctr | 比率,曝光→点进 |
| 2s跳出率 | bounce_2s | 比率,越低越好 |
| 平均播放时长 | avg_play_sec | 秒 |
| 点赞量/分享量/评论量/收藏量 | likes/shares/comments/collects | |
| 主页访问量 | profile_visits | |
| 粉丝增量 | fans_delta | 单条带来的涨粉 |

## 账号诊断对标(DOM 抓,平台白送的基准)
5 维「我的指标 vs 同类作者百分位」,文案形如:
`您的完播率为0.77%，低于99.13%的同类创作者`。
覆盖:投稿数、播放量、完播率、互动指数、新增粉丝。**这是天然基线,首次复盘无历史均值时的对标尺。**

## v2 待扩展(作品详情深钻,本版未采)
- 流量分析:推荐/搜索/粉丝/同城来源占比 → "靠什么火"
- 观众分析:留存曲线(第几秒陡降)+ 性别/年龄/地域/兴趣画像 → "谁在看、哪流失"
- 评论热词:评论区关键词 → 新选题线索
> 这三个 tab 在作品详情页,各自可能有独立导出按钮(待验);先 DOM 抓兜底。需要单条 awemeId,从作品详情链接取。
