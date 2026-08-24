# e2e —— 验收测试层（Playwright + Midscene）

> 角色：**验收工具，不是开发测试**。单元/集成测试住各包（vitest，仓根 `npm test`）；
> 本目录服务 05 实施计划的 G3 终验与 D 各页验收——用 midscene 的自然语言断言对照
> `docs/design/` v2 原型与 03 执行方案的验收标准。

## 跑法

```bash
# 1) 起服务（M3 后可用）
bash tools/console/start.sh start        # 或 dev 期在 .env.e2e 设 CONSOLE_URL 指向 vite dev
# 2) 在 tools/console/ 下执行
npm run e2e
```

报告：`e2e/playwright-report/`（playwright）+ `e2e/midscene_run/report/`（midscene 可回放 HTML，含每步截图、模型输入输出、定位框）。

## 模型配置

全部住 `.env.e2e`（gitignored，本机已配好并实测跑通；新环境 `cp .env.e2e.example .env.e2e` 填真值）。
**安全红线**：网关域名、密钥、内部服务名只准出现在 `.env.e2e`——本仓任何入库文件不得含公司内部
标识关键词，仓根 `npm test` 前置的 guard 脚本会扫描拦截，详见 05 实施计划 §3。

三条实战教训（来自同款基建的实测，已固化，别删）：
1. `MIDSCENE_MODEL_FAMILY` 必填——不设走通用分支，元素定位系统性偏移；
2. `MIDSCENE_MODEL_TIMEOUT=60000` 请求级超时——防单请求挂死吃光 90s 用例预算，表现成假「用例超时」；
3. Midscene 1.10.x **不支持 Claude 系列模型**，别往配置里填。

## 约定

- 用例按闸口/页面组织：`g3-smoke.spec.ts`（终验冒烟池）→ 后续按页拆 `p1-overview.spec.ts` 等。
- AI 断言（aiAssert/aiQuery）用于「人看得出来」的验收判断；精确数值断言仍走常规 `expect`（数据源对照 `media * --json`）。
- 禁真发红线同 05 §3：e2e 绝不触发真实发布动作，发布相关只验拒绝路径与 dry-run 预览。
