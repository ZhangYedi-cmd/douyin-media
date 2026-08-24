# packages/ui — AI 维护约定

> 契约唯一出处：`docs/Iterative-spec/0818-看板工作台/03-前端执行方案.md`（本文只复述可执行的四条约定 +
> 两条豁免记录，`03-前端执行方案.md` §2 详细设计 / `2026-08-18-看板前端技术方案.md` §7 是原文，
> 冲突以那两份为准）。

## 四条约定（前端技术方案 §7 原文）

1. **一页一目录，页面私有组件不出目录；跨页复用满 2 处才升 `components/`。**
   `src/pages/<页名>/` 下的组件、纯逻辑 `.ts`（如 `backlogHelpers.ts`/`kanbanGroups.ts`）、
   `.module.css` 一律只服务本页；另一个页面要用同一逻辑，先判断是否真的复用满 2 处，
   够了才升到 `src/components/`，不够就各页各写一份小重复（本仓已有先例：`WipStats.tsx` 的
   `WIP_ORDER` 与 `kanbanGroups.ts` 的 `WIP_STATUS_ORDER` 是同一份枚举顺序的两份独立拷贝）。
2. **数据获取只准走 `usePageData`/`useJob`（`lib/store.tsx`）两个 hook，组件内不得裸 `fetch`。**
   写动作只经 `lib/actions.tsx` 的 `useAction`/`useJobAction`；`lib/api.ts` 是全站唯一
   fetch 出口，其它文件不得直接调 `fetch(...)`。`grep -rn "fetch(" src --include='*.tsx'`
   命中应只有 `lib/api.ts` 本体（AI 约定 2 的可判形态）。
3. **视觉值只准引 token（antd `ConfigProvider` theme 或 `theme.css` 的 `var(--…)`），不得写死色值/字号。**
   自绘组件一律 `var(--token)`；antd 组件颜色走 `lib/theme.ts` 的 `themeConfig`。
   例外见下方「豁免记录」第二条（11px/10px 微排版）。
4. **新增依赖须先在 `2026-08-18-看板前端技术方案.md` §1 依赖表记录理由，再 `npm install`。**
   当前运行时依赖 6 个 = 拍板四件（react / react-dom / react-router-dom / antd）
   + 2026-08-19 UX 走查后追加的 `react-markdown` / `remark-gfm`（口播稿与治理报告原先以
   markdown 源码呈现，是每日最高频阅读路径；用户当日拍板接受破「依赖四件」上限，理由已登记
   §1 依赖表）。任何 PR 多出未登记的包仍视为违约——**约束是「必须登记」，不是「必须四件」。**

## 构建产物约定（前端技术方案 §6 / 03 §2.12）

- `packages/ui/dist/` **进 git**（`.gitignore` 已对它开白名单）：server `serveStatic`
  直接指向这个目录，clone 即跑，不强制前端工具链。
- **含 `src` 变更的 commit 必须同时含重建后的 `dist`**：改完源码先跑
  `npm run build -w @console/ui`（= `tsc -p tsconfig.json && vite build`），
  再把 `packages/ui/src` 与 `packages/ui/dist` 一起提交。
- 校验凭证：侧栏 `side-foot` 显示 `localhost:5170 · __BUILD_TIME__`（`vite.config.ts`
  的 `define` 注入，精确到分钟），与 commit 日期肉眼对不上就是忘 build 的信号。

## 豁免记录（05-实施计划 §5D 交接项，2026-08-18）

1. **`tsconfig.json` 的 `moduleResolution: "Bundler"` 不是疏漏，不要"纠正"回 `NodeNext`。**
   `core`/`cli`/`server` 面向 Node 运行时用 `NodeNext`；`ui` 面向 Vite/浏览器打包目标，
   用 `Bundler` 解析策略是 Vite 官方 React+TS 模板同款（相对导入不必被迫写 `.js` 后缀）。
   `verbatimModuleSyntax` 仍从 `tsconfig.base.json` 继承生效（`= true`），照样焊死
   `@console/core`/`@console/server` 的 type-only import——这条约定不因解析策略而放松。
2. **`theme.css` 里的 `11px`/`10px` 硬编码字号是原型既有、未 token 化的特征，非本包新引入。**
   `theme.css` 由 `docs/design/css/theme.css` 原样搬入（S1，「代码不搬只抄规格」的唯一例外
   是这份 CSS 本体），其中 `.side-brand small`/`.badge`/`.kb-card .slug`/`.check-row .state`
   等选择器大量出现 `font: … 11px/…`/`10px/…`（`--text-xs` 已是 `12px`，微排版比它更小一档，
   原型没有对应 token）。S7-S9 的页面私有代码（如 `PoolStats.tsx`/`kanban.module.css`）延续
   同一惯例，未新增违规。**未决**：若后续要收紧「视觉值只准引 token」到 100%，需要先在
   `theme.css`/`lib/theme.ts` 补一级 `--text-2xs`（≈11px）token，再回填这些选择器——
   不在本波范围，留给下一次 UI 一致性巡检。

## 已知契约偏差（供下任维护者查证，不代表本包实现有误）

- **`@console/server/api-types` 的导入路径**：契约字面路径（03 §2.10/§3.2）在 `server`
  包缺 `exports["./api-types"]` 映射时无法解析，`lib/api.ts`/`lib/store.tsx` 顶部已各自
  记录改用真实产物路径过渡；若 `server` 补上该 exports 映射，这里的注释与 import 路径
  应同步复核是否还需要保留。
- **`promote` 动作必须显式带 `slug`**：02 执行方案表格原未列出该字段，但 `media promote`
  的 `--slug` 是 requiredOption；`PromoteDialog.tsx` 因此在 `useAction` 的 dry-run 流程前
  插了一步收集 slug 的表单（默认值按标题/id 生成建议），偏离了 03 §2.6 原设计的
  「CommandChip(action: promote --auto) 一步到位」——已在组件顶部注释记录理由。
- **P5 `proposals` 目前恒为 `kind: 'prose'`**：`server/src/routes/projections.ts` 的
  `deriveProposals()` 尚未产出过 `kind: 'structured'` 的提议（未接入 backlog-gardener
  的撞题/归档结构化结论），`ProposalList.tsx` 的「结构化」应用直落分支（`backlog-apply`）
  代码已按契约写好、类型检查通过，但截至 2026-08-18 未能用真实数据活体验证——server 补上
  结构化提议的判别与下发后应回补一次真机验证。
