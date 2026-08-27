---
style: cartoon-ops
density: balanced
image_count: 3
language: zh
aspect: 1536x1024
watermark: false
---

## Illustration 1

**Position**: 第一节“日志连续写了六天，人没看见”末尾
**Purpose**: 用事故对照说明本地日志与主动推送的读者和时效完全不同，立住“只写本地日志不算上报”。
**Type**: split-compare
**Visual Content**: 左侧六份日志在仓库角落积灰、工程师毫不知情；右侧飞书消息直达手机，工程师当下处理，时间轴从“六天”缩短到“分钟级”。
**Key Labels**: `06-30`、`07-05`、`连续 6 天空跑`、`只写本地日志不算上报`、`日志面向复盘`、`推送面向当下`、`六天→分钟级`
**Filename**: 01-split-compare-log-push.png

## Illustration 2

**Position**: 第二节“上报通道怎么搭”三要素示例之后
**Purpose**: 把一条可行动上报拆成三个固定信息块，读者一眼看懂收到通知后为何不必再翻日志。
**Type**: role-lineup
**Visual Content**: AI 机器人依次递出三张白卡，工程师手机收到三条飞书气泡；三张卡分别承担发生了什么、为什么、下一步动作。
**Key Labels**: `事件：取题空`、`根因：status:idea 为 0`、`需要人做什么：切回双赛道选题驱动`、`feishu-notify`、`send_text`、`出站即达`
**Filename**: 02-role-lineup-report-triad.png

## Illustration 3

**Position**: 第五节“无人系统的三问”末尾
**Purpose**: 把无人系统是否合格的三问与“重试、停下、升级”三个出口合成一个判定图，避免只记口号。
**Type**: decision-flow
**Visual Content**: 质检员依次举牌检查多久知道、能否定位根因、是否知道停还是重试；终态分成自动重试、停在明确状态、超限转人工。
**Key Labels**: `它挂了你多久知道`、`你知道时能定位根因吗`、`它自己知道该停还是该重试吗`、`原样重试一次`、`status=drafting`、`最多 3 轮`、`重做上限 2 次`、`超限转人工`
**Filename**: 03-decision-flow-autonomy-questions.png
