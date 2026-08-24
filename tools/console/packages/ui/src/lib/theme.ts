import type { ThemeConfig } from 'antd'

// theme.css → antd ConfigProvider token 映射表（03-前端执行方案.md §2.11）。
// 值以 theme.css 为准；每行注释回指来源 token 名，两处同改（风险 R1）。
// color-mix 派生色按 alpha 近似换算成 rgba 常量。

export const themeConfig: ThemeConfig = {
  token: {
    // ─── 全局：theme.token ───────────────────────────────────────
    colorPrimary: '#2f6feb', // --accent
    colorInfo: '#2f6feb', // --accent
    colorSuccess: '#17a34a', // --success
    colorWarning: '#eab308', // --warn
    colorError: '#dc2626', // --danger
    colorText: '#111111', // --fg
    colorTextSecondary: '#6b6b6b', // --muted
    colorTextTertiary: '#6b6b6b', // --meta（--meta: var(--muted)，同值）
    colorBgLayout: '#fafafa', // --bg
    colorBgContainer: '#ffffff', // --surface
    colorBgElevated: '#ffffff', // --surface
    colorBorder: '#e5e5e5', // --border
    colorBorderSecondary: '#e5e5e5', // --border-soft（--border-soft: var(--border)，同值）
    borderRadius: 8, // --radius-sm
    borderRadiusLG: 12, // --radius-md
    borderRadiusXS: 4, // 原型 .tag/.logblock 内圆角
    fontFamily: '"Inter", -apple-system, system-ui, sans-serif', // --font-body
    fontFamilyCode: 'ui-monospace, "JetBrains Mono", monospace', // --font-mono
    fontSize: 14, // --text-sm
    fontSizeSM: 12, // --text-xs
    fontSizeLG: 16, // --text-base
    fontSizeHeading4: 16, // --text-base
    fontSizeHeading3: 20, // --text-lg
    fontSizeHeading2: 24, // --text-xl
    lineHeight: 1.5, // --leading-body
    motionDurationFast: '0.15s', // --motion-fast
    motionDurationMid: '0.2s', // --motion-base
    boxShadowSecondary: '0 2px 8px rgba(17,17,17,0.08)', // --elev-raised（oklab 92% 透明 ≈ alpha .08）
    controlOutline: 'rgba(47,111,235,0.30)', // --focus-ring（accent 70% 透明）
  },
  components: {
    // ─── 局部：theme.components ──────────────────────────────────
    Layout: {
      siderBg: '#ffffff', // --surface（.sidebar）
      headerBg: '#ffffff', // --surface（.topbar）
      bodyBg: '#fafafa', // --bg
    },
    Menu: {
      itemSelectedBg: 'rgba(47,111,235,0.07)', // --tint-accent（accent 93% 透明）
      itemSelectedColor: '#2f6feb', // --accent（.side-nav a.active）
    },
    Table: {
      headerColor: '#6b6b6b', // --muted（th 灰色小写标题）
      headerBg: '#ffffff', // --surface（原型 th 无底色）
      rowHoverBg: '#fafafa', // --bg（tbody tr:hover）
    },
    Card: {
      // OverrideTokenMap 允许组件级覆盖任意 AliasToken（antd v6 类型：
      // Partial<ComponentToken<C>> & Partial<AliasToken>）——paddingLG 是
      // AliasToken 成员，非 Card 私有 ComponentToken，这里是「仅对 Card 生效
      // 的全局 token 覆盖」，与 03 §2.11 表达的设计意图一致。
      paddingLG: 20, // --space-5（.card padding）
    },
    Modal: {
      borderRadiusLG: 16, // --radius-lg（.modal），同理是 Modal 局部覆盖的 AliasToken
    },
    // Steps / Timeline 未列组件 token：继承 colorPrimary/colorSuccess，
    // now 态由自绘类名补（03 §2.11 备注，S6 详情页落地时再验）。
  },
}

// 语义淡色底常量（自绘组件与 AlertCard 用；03 §2.11「语义淡色底常量」）。
export const tintWarn = 'rgba(234,179,8,0.10)' // --tint-warn
export const tintDanger = 'rgba(220,38,38,0.07)' // --tint-danger
export const tintSuccess = 'rgba(23,163,74,0.07)' // --tint-success
export const tintAccent = 'rgba(47,111,235,0.07)' // --tint-accent
