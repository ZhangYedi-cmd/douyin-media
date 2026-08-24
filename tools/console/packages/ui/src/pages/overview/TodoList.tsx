import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { Todo } from '@console/server/api-types'
import { DeadlineBadge } from '../../components/DeadlineBadge'
import { resolveAlertHeadline } from '../../components/AlertCard/ruleTitles'
import { groupTodos, resolveTodoTarget } from './todoGroups'

// 03 §2.3 ④：待我处理——损失分级置顶 + 死线倒计时 + 同类合并（groupTodos/resolveTodoTarget，
// 见 todoGroups.ts 的单测覆盖）。
//
// 主行文案与左侧警报区共用同一张 rule → 人话映射（components/AlertCard/ruleTitles.ts）：
// server 的 alertsToTodos() 里 `kind = a.rule`、`title = a.message`，groupTodos 又以 kind 作
// 分组键（TodoGroup.key），所以这里的 g.key 就是 CHK-0x，能直接查表。不共用的话同一页会出现
// 两种口径——左边「已发布但没回填作品链接」、右边「published 无作品链接」（2026-08-19 走查
// 修复后实测到的镜像不一致，收尾时补齐）。未登记的 rule 由 resolveAlertHeadline 回退成原
// message，不丢信息。
export interface TodoListProps {
  todos: Todo[]
  onOpenFile(path: string): void
}

const SEVERITY_BADGE: Record<Todo['severity'], string> = { error: 'b-danger', warn: 'b-warn', info: 'b-accent' }
const SEVERITY_LABEL: Record<Todo['severity'], string> = { error: '阻塞', warn: '关注', info: '提示' }

export function TodoList({ todos, onOpenFile }: TodoListProps) {
  const groups = groupTodos(todos)

  return (
    <section className="card" data-testid="todo-list">
      <header>
        <h2>待我处理</h2>
        <span className="right">{groups.length > 0 ? `${groups.length} 项` : '—'}</span>
      </header>
      {groups.length === 0 ? (
        <p className="muted" style={{ fontSize: 'var(--text-xs)' }}>
          暂无待办，一切正常。
        </p>
      ) : (
        <div className="todo-list">
          {groups.map((g) => {
            const target = resolveTodoTarget(g)
            const title: ReactNode = (
              <>
                <span className={`badge ${SEVERITY_BADGE[g.severity]}`}>
                  <i />
                  {SEVERITY_LABEL[g.severity]}
                </span>{' '}
                {resolveAlertHeadline(g.key, g.title).title}
                {g.count > 1 ? ` ×${g.count}` : ''}
              </>
            )
            const go: ReactNode = (
              <span className="go">
                {g.since ? <DeadlineBadge since={g.since} /> : g.deadline ? <DeadlineBadge deadline={g.deadline} /> : '→'}
              </span>
            )
            if (target.kind === 'content') {
              return (
                <Link key={g.key} to={`/content/${target.slug}`}>
                  {title}
                  {go}
                </Link>
              )
            }
            if (target.kind === 'file') {
              return (
                <a
                  key={g.key}
                  href="#"
                  onClick={(e) => {
                    e.preventDefault()
                    onOpenFile(target.path)
                  }}
                >
                  {title}
                  {go}
                </a>
              )
            }
            return (
              <Link key={g.key} to={target.path}>
                {title}
                {go}
              </Link>
            )
          })}
        </div>
      )}
    </section>
  )
}
