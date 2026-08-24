import type { Alert, MetaStatus } from '@console/core'
import type { Job } from '@console/server/api-types'
import type { NormEvent } from '@console/cc-stream'

// S3 临时路由 #/dev 的本地 fixture 数据——不经网络，纯前端常量，用来视觉对照
// docs/design/ 的 .alert / .days / .badge / .file-row / .logblock（05 §5D）。

export const ALERT_FIXTURES: Alert[] = [
  {
    key: 'log-error:daily-run',
    rule: 'log-error',
    level: 'error',
    subject: '日志报错 · TTS 余额阻塞全线配音',
    message: '最新 daily-run 日志命中关键词「1008」 · 建议：火山引擎充值后重跑 daily-run',
    evidencePath: 'pipeline/logs/2026-08-18.md',
  },
  {
    key: 'review-stale:2026-07-04-agent-memory',
    rule: 'review-stale',
    level: 'warn',
    subject: '待审积压 · EP18 在 review 停留 72h（>48h）',
    message: '人审卡住，schedule 窗口在收窄',
    evidencePath: 'content/2026-07-04-agent-memory/meta.yaml',
    action: { label: '去审核台', to: '/content/2026-07-04-agent-memory' },
  },
  {
    key: 'harness-overdue:douyin-ideate',
    rule: 'harness-overdue',
    level: 'warn',
    subject: '治理逾期 · douyin-ideate 已 5 天未跑（周期 2 天 ×1.5）',
    message: '选题补给断供风险',
    count: 2,
    evidencePath: 'harness/logs/index.jsonl',
    action: { label: '治理线', to: '/harness' },
  },
  {
    key: 'info:demo',
    rule: 'demo-info',
    level: 'info',
    subject: '示例 · info 级不置顶',
    message: '仅供视觉对照三档色阶（error/warn/info）',
  },
]

export const STATUS_FIXTURES: MetaStatus[] = [
  'ideated',
  'drafting',
  'review',
  'approved',
  'scheduled',
  'published',
  'retro_done',
  'rejected',
]

export const COMMAND_FIXTURES: string[] = [
  'media flip 2026-07-04-agent-memory approved --dry-run',
  'media backlog sweep --dry-run',
]

// FileDrawer 的 fixture 文本：key = 传给 FileDrawer 的 path，用于本地 FileTextResolverContext。
export const FILE_FIXTURES: Record<string, string> = {
  'pipeline/logs/2026-08-18.md': [
    '04:30:02 [daily-run] 开始 · 队列 1 条：EP19 mcp-explained',
    '04:31:47 [daily-run] 阻塞退出 · 产出 0 · 建议：充值后重跑',
  ].join('\n'),
  'content/2026-07-04-agent-memory/meta.yaml': [
    'status: review',
    'source: T-035',
    'timestamps:',
    '  review: 2026-08-15T10:00:00+08:00',
  ].join('\n'),
}

// ── JobLogView fixture（CC 运行日志查看功能，L 号执行）───────────────────────
// K 号的 GET /api/jobs/:id/log 端点在本波开发期间尚未就绪，按任务卡指引先用
// tools/console/logs/jobs/publish-20260819134540-1f97.jsonl（"发布失败"那次真实历史日志，
// 115 条原始事件）的真实内容手工构造一份 NormEvent[] fixture 把组件做完——session id、
// 时间戳、Bash 命令原文、Skill 调用、失败输出、最终裁决文案全部取自这份真实日志，只有
// 「已中断」「卡顿」两类真实日志里没有出现过的事件是补的合成样例（标了注释，不冒充真实发生过）。
// 见 pages/dev/index.tsx「JobLogView」一节：端点就绪后应换成真实 GET 调用做最终视觉核对。
export const JOB_LOG_FIXTURE_JOB: Job = {
  id: 'publish-20260819134540-1f97',
  type: 'publish',
  slug: 'hy3-moe-teardown',
  state: 'failed',
  milestones: [
    { id: 'located-entry', label: '定位内容条目', at: '2026-08-19T05:45:55.991Z' },
    { id: 'material-check-failed', label: '物料校验未通过', at: '2026-08-19T05:52:26.897Z' },
  ],
  narration: [],
  stalling: false,
  costUsd: 1.0537064999999999,
  turns: 21,
  durationMs: 127022,
  startedAt: '2026-08-19T05:45:48.000Z',
  endedAt: '2026-08-19T05:52:27.000Z',
  error: '物料校验未过（成片 mp4 缺失 + cookie 失效），未执行任何 sau 命令',
  logPath: 'tools/console/logs/jobs/publish-20260819134540-1f97.jsonl',
}

export const JOB_LOG_FIXTURE_EVENTS: NormEvent[] = [
  { kind: 'started', sessionId: '5e84386e-cea0-4223-b57b-6361f064128e', at: '2026-08-19T05:45:48.000Z' },
  { kind: 'say', messageId: 'msg_011CeBaU4wRCKcyahoTLQH1U', text: "I'll start by loading the douyin-publish skill.", at: '2026-08-19T05:45:48.606Z' },
  {
    kind: 'tool',
    id: 'toolu_01LAJbvG4SFJxqYWsrVJcq3a',
    name: 'Skill',
    input: { skill: 'douyin-publish', args: 'hy3-moe-teardown --publish' },
    at: '2026-08-19T05:45:49.235Z',
  },
  { kind: 'toolDone', id: 'toolu_01LAJbvG4SFJxqYWsrVJcq3a', ok: true, preview: 'Launching skill: douyin-publish', at: '2026-08-19T05:45:49.318Z' },
  {
    kind: 'tool',
    id: 'toolu_01CVT4nvQAycpaG24ijeY8Da',
    name: 'Bash',
    input: {
      command: 'find content -maxdepth 3 -name "hy3-moe-teardown" -o -maxdepth 3 -type d -name "hy3*" | head -20',
      description: 'Locate the content entry directory',
    },
    at: '2026-08-19T05:45:54.295Z',
  },
  {
    kind: 'toolDone',
    id: 'toolu_01CVT4nvQAycpaG24ijeY8Da',
    ok: true,
    preview: 'content/2026-07-14/hy3-moe-teardown',
    bytes: 36,
    truncated: false,
    at: '2026-08-19T05:45:55.991Z',
  },
  {
    kind: 'tool',
    id: 'toolu_011zzxbHDWHC6rNPYgREFD38',
    name: 'Bash',
    input: {
      command:
        'ls -d /Users/yedi/douyin-media/tools/social-auto-upload 2>&1; ls -d /Users/yedizhang/yedi-study/douyin-media/tools/social-auto-upload 2>&1',
      description: 'Check which SAU_DIR path exists',
    },
    at: '2026-08-19T05:45:54.819Z',
  },
  {
    kind: 'toolDone',
    id: 'toolu_011zzxbHDWHC6rNPYgREFD38',
    ok: false,
    preview:
      'Exit code 1\nls: /Users/yedi/douyin-media/tools/social-auto-upload: No such file or directory\nls: /Users/yedizhang/yedi-study/douyin-media/tools/soc',
    bytes: 512,
    truncated: true,
    at: '2026-08-19T05:46:00.968Z',
  },
  {
    kind: 'thinking',
    text: 'SAU_DIR 在两个候选路径下都失败了一个，先确认真实安装位置再往下走，不要假设 SKILL.md 里写的路径仍然有效。',
    at: '2026-08-19T05:46:01.200Z',
  },
  // 以下一条为合成样例（真实日志里这次运行没有被中断）：演示"命令被打断"时的显著标出效果。
  {
    kind: 'tool',
    id: 'fixture-interrupted-01',
    name: 'Bash',
    input: { command: 'uv run sau douyin upload-video --account yedi --file assets/hy3-moe-teardown.mp4', description: '尝试上传成片（合成样例）' },
    at: '2026-08-19T05:46:30.000Z',
  },
  {
    kind: 'toolDone',
    id: 'fixture-interrupted-01',
    ok: false,
    interrupted: true,
    preview: 'Killed by user (SIGTERM) —— 合成样例，用于演示"已中断"标记，非本次真实运行内容',
    at: '2026-08-19T05:46:31.500Z',
  },
  // 以下一条同样为合成样例：真实日志的 rate_limit_event 出现在另一份（harness-run-...-642f）日志里。
  { kind: 'stalling', reason: 'rate_limit', at: '2026-08-19T05:47:10.000Z' },
  {
    kind: 'tool',
    id: 'toolu_013kdKzZiwFZ7f3PmfnmysgE',
    name: 'Bash',
    input: {
      command: "cat >> content/2026-07-14/hy3-moe-teardown/4-publish.md <<'EOF'\n\n## 发布失败记录（2026-08-19，douyin-publish --publish）\n…\nEOF",
      description: '把失败记录写进 4-publish.md',
    },
    at: '2026-08-19T05:52:04.137Z',
  },
  { kind: 'toolDone', id: 'toolu_013kdKzZiwFZ7f3PmfnmysgE', ok: true, preview: 'written\n content/2026-07-14/hy3-moe-teardown/4-publish.md | 10 ++++++++++\n 1 file changed, 10 insertions(+)', at: '2026-08-19T05:52:04.278Z' },
  {
    kind: 'say',
    messageId: 'msg_011CeBawydiEuCiGFZmBokHY',
    text:
      '**发布失败——没发出去，也没记账。** 两个阻断，都在 Step 0/1 就撞上了，一条 sau 命令都没执行。\n\n' +
      '## 阻断 1（硬阻断）：成片 mp4 根本不存在\n\n`meta.yaml` 的 `deliverables.video` 声明 `assets/hy3-moe-teardown.mp4`，但实际目录里没有这个文件。\n\n' +
      '## 阻断 2：cookie 已失效\n\n`uv run sau douyin check --account yedi` 返回 invalid，按铁律我没有自动登录，需要你手动扫码。\n\n' +
      '## 状态处置\n\n`meta.yaml` 的 `status` 保持 `approved` 未动，没有调用 `media publish-done`。',
    at: '2026-08-19T05:52:26.897Z',
  },
  { kind: 'done', ok: true, costUsd: 1.0537064999999999, turns: 21, durationMs: 127022, at: '2026-08-19T05:52:27.000Z' },
]
