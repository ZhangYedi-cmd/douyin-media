import { useState } from 'react'
import { Modal, Table, Tooltip } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { HarnessTaskRow } from '@console/server/api-types'
import { useJobAction } from '../../lib/actions'
import { taskRunText, triggerLabel } from './harnessHelpers'
import { TaskRunHistory } from './TaskRunHistory'

// 03 §2.7 ①：任务注册表 Table——task·skill·enabled·trigger·windows·距上次运行(超期 warn)。
// 行不可点开详情页（03 §4-Q1 已拍板：treatment-detail 归属选 C「P5 注册表 Table 即全部」）。
//
// 2026-08-19 曾把 CC 运行日志查看功能挂成 antd Table 的行内 `expandable`——真机实测翻车：
// 展开区是这张 Table 自己的一个 <td>，而 antd 的 auto table layout 按内容自然宽度撑列，日志里
// 不换行的 pre 块/长命令的 min-content 宽度直接决定了整张表的宽度（实测 `.ant-table-body`
// clientWidth=1134 但 scrollWidth=4280，展开行 <td> 本身宽 4280px——要横向滚近 4 屏才能读完
// 一条日志）。改回 Modal 弹窗承载（本页对同类问题已有先例：报告阅读器原是常驻右栏，用户走查
// 反馈「点击后直接在弹窗中展示吧」，见 ReportReader.tsx 头注释与 pages/harness/index.tsx 的
// 报告 Modal）——触发入口是本表新增的「查看记录」按钮，Modal 是独立浮层不是新路由/新组件树，
// 「P5 注册表 Table 即全部」（不开详情页/不新增路由）依旧成立，只是承载容器从「表格内展开」
// 换成了「表格外浮层」。
export interface TaskRegistryTableProps {
  tasks: HarnessTaskRow[]
  now: Date
}

// ── 2026-08-19 新增「运行」列：手动触发治理任务（真机走查用户原话「能增加一个手动触发的功能么？
// 启动一个 CC 进程，和发布、审批那个流程一样」）——复用 publish/rework 同一套 useJobAction 慢作业机制。
//
// 按钮可用性纯函数（本包无 jsdom，抽出来单测；直接从本文件导出，测试直接 import 本文件——已实测
// 过：node 环境下 import 一个引入 antd 的 .tsx 模块、只取里面的纯函数/不渲染 JSX，不会报错，
// 不必为此新建 harnessHelpers.ts 之外的文件，也不越出白名单）：
// - `check` 任务无 skill：体检已经由看板每次刷新时跟着 `media check` 走，不需要人手动点一下。
// - 其余无 skill 的行（TODO 任务）：还没人写执行 skill，点了也没有东西可跑。
// - 有 skill 且 enabled：唯一可点的情形。
export interface RunButtonState {
  enabled: boolean
  tooltip?: string
}

const CHECK_TASK_NAME = 'check'

export function runButtonState(task: HarnessTaskRow): RunButtonState {
  if (task.name === CHECK_TASK_NAME) {
    return { enabled: false, tooltip: '体检由看板持续进行，无需手动运行' }
  }
  if (task.skill && task.enabled) {
    return { enabled: true }
  }
  if (!task.skill) {
    return { enabled: false, tooltip: '尚未接入执行技能' }
  }
  return { enabled: false, tooltip: '该任务当前已停用' }
}

// 选题养池（ideate）/理池清扫（backlog-gardener）是治理线「只产报告」铁律的既定例外——它们的
// 入池/规则化清扫视同状态记账，会直接写 content/_backlog/backlog.yaml（CLAUDE.md 治理线一句话原文）。
// 点「运行」前必须让人知道这条，不能等报告出来才发现文件已经被改了。
const DIRECT_WRITE_TASKS = new Set(['ideate', 'backlog-gardener'])

export interface HarnessRunSummaryLines {
  base: string
  exception: string | null
}

export function harnessRunSummaryLines(task: HarnessTaskRow): HarnessRunSummaryLines {
  const base =
    `将启动一个后台 Claude Code 进程执行 ${task.skill ?? task.name}。治理线铁律：只产报告 + 记一行运行账本，` +
    '变更提议仍需你人审通过后才会应用到 brain/。'
  const exception = DIRECT_WRITE_TASKS.has(task.name)
    ? '例外：这个任务（选题养池 / 理池清扫）会直接写 content/_backlog/backlog.yaml——入池/清扫视同记账，属既定例外，不会停下来等你审。'
    : null
  return { base, exception }
}

function RunConfirmContent({ task }: { task: HarnessTaskRow }) {
  const { base, exception } = harnessRunSummaryLines(task)
  return (
    <div>
      <p style={{ marginBottom: 'var(--space-2)' }}>
        <code>{task.name}</code>{' '}
        <span className="muted" style={{ fontSize: 'var(--text-xs)' }}>
          · <code>{task.skill}</code>
        </span>
      </p>
      <p className="muted" style={{ fontSize: 'var(--text-xs)' }}>
        {base}
      </p>
      {exception ? (
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--warn)', marginTop: 'var(--space-2)' }}>{exception}</p>
      ) : null}
    </div>
  )
}

export function TaskRegistryTable({ tasks, now }: TaskRegistryTableProps) {
  const { start } = useJobAction()
  // 「查看记录」弹窗的选中任务；与「运行」按钮各自独立的 useJobAction 内部 Modal.confirm
  // 互不相关，两者可以同时存在于组件树里而不冲突。
  const [historyTask, setHistoryTask] = useState<HarnessTaskRow | undefined>(undefined)

  async function handleRun(task: HarnessTaskRow) {
    await start(
      'harness-run',
      { task: task.name },
      { title: `运行治理任务 · ${task.name}`, summary: <RunConfirmContent task={task} /> },
    )
  }

  const columns: ColumnsType<HarnessTaskRow> = [
    // 任务名/技能名与 harness/tasks.md 注册表一一对应，属 07-界面用语对照表 §8 白名单
    // （必须原文保留，改了就对不上账），渲染成 <code> 而非纯文本——语义上更准确（它们是
    // 可原样复制去核对注册表的标识符），也顺带避开相邻单元格文本无分隔符拼接产生的误判
    // （如「ideate」紧邻「douyin-ideate」在 innerText 里连成「ideatedouyin-ideate」）。
    { title: '任务', dataIndex: 'name', key: 'name', className: 'mono', render: (v: string) => <code>{v}</code> },
    {
      title: '执行技能',
      dataIndex: 'skill',
      key: 'skill',
      className: 'mono',
      render: (v: string | null) => (v ? <code>{v}</code> : <span className="nil">—</span>),
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      key: 'enabled',
      render: (v: boolean) =>
        v ? (
          <span className="badge b-success">
            <i />
            已启用
          </span>
        ) : (
          <span className="badge">
            <i />
            已停用
          </span>
        ),
    },
    { title: '触发方式', dataIndex: 'trigger', key: 'trigger', className: 'mono', render: (v: string) => triggerLabel(v) },
    {
      title: '复盘窗口',
      dataIndex: 'windows',
      key: 'windows',
      className: 'mono',
      render: (v: string[] | undefined) => (v && v.length > 0 ? v.join(' / ') : <span className="nil">—</span>),
    },
    {
      title: '距上次运行',
      key: 'lastRun',
      align: 'right',
      className: 'num',
      render: (_: unknown, t: HarnessTaskRow) => {
        const { text, warn } = taskRunText(t, now)
        return <span style={warn ? { color: 'color-mix(in oklab, var(--warn), var(--fg) 40%)' } : undefined}>{text}</span>
      },
    },
    {
      // 「查看记录」用 btn-ghost（描边/文字态），刻意不用「运行」同款实心 btn——点错「运行」会
      // 真的起一个 CC 子进程改仓库文件，误点代价很高，两个按钮必须在视觉上一眼分得开。
      title: '运行记录',
      key: 'history',
      align: 'center',
      render: (_: unknown, t: HarnessTaskRow) => (
        <button type="button" className="btn btn-sm btn-ghost" onClick={() => setHistoryTask(t)}>
          查看记录
        </button>
      ),
    },
    {
      title: '运行',
      key: 'run',
      align: 'center',
      render: (_: unknown, t: HarnessTaskRow) => {
        const state = runButtonState(t)
        const button = (
          <button type="button" className="btn btn-sm" disabled={!state.enabled} onClick={() => void handleRun(t)}>
            运行
          </button>
        )
        return state.tooltip ? (
          <Tooltip title={state.tooltip}>
            <span>{button}</span>
          </Tooltip>
        ) : (
          button
        )
      },
    },
  ]

  return (
    <>
      <Table<HarnessTaskRow>
        className="table"
        columns={columns}
        dataSource={tasks}
        rowKey="name"
        pagination={false}
        size="small"
        locale={{ emptyText: '还没有注册任何养护任务' }}
      />
      {/* 宽度/位置参照本页已有的报告 Modal（pages/harness/index.tsx）：960 宽、body 内部纵向滚，
          不横向滚——JobLogView 的 pre/命令原文要在自己的容器里滚，不能把 Modal body 撑宽
          （实测数字见 TaskRunHistory.tsx 头注释）。 */}
      <Modal
        open={historyTask !== undefined}
        title={`运行记录 · ${historyTask?.name ?? ''}`}
        onCancel={() => setHistoryTask(undefined)}
        footer={null}
        width={960}
        styles={{ body: { maxHeight: '70vh', overflowY: 'auto' } }}
        destroyOnHidden
      >
        {historyTask ? <TaskRunHistory taskName={historyTask.name} /> : null}
      </Modal>
    </>
  )
}
