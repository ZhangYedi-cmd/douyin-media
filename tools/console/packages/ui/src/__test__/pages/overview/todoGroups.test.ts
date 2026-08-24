import { describe, expect, it } from 'vitest'
import { groupTodos, resolveTodoTarget } from '../../../pages/overview/todoGroups'
import type { Todo } from '@console/server/api-types'

function todo(overrides: Partial<Todo> & Pick<Todo, 'kind' | 'severity' | 'title' | 'to'>): Todo {
  return overrides
}

describe('groupTodos', () => {
  it('同类合并：两条同 kind 的警报衍生待办合并为一行，count=2（S4 验收②构造用例）', () => {
    const todos: Todo[] = [
      todo({ kind: 'CHK-05', severity: 'warn', title: 'published 无作品链接', to: '/api/file?path=a', slug: 'ep-a' }),
      todo({ kind: 'CHK-05', severity: 'warn', title: 'published 无作品链接', to: '/api/file?path=b', slug: 'ep-b' }),
    ]
    const groups = groupTodos(todos)
    expect(groups).toHaveLength(1)
    expect(groups[0]).toMatchObject({ key: 'CHK-05', count: 2, slug: 'ep-a' }) // 代表字段取首条
  })

  it('损失分级排序：error 置顶，不同 severity 各占一行', () => {
    const todos: Todo[] = [
      todo({ kind: 'CHK-05', severity: 'warn', title: 'warn 项', to: '/x' }),
      todo({ kind: 'CHK-01', severity: 'error', title: 'error 项', to: '/y' }),
      todo({ kind: 'CHK-06', severity: 'info' as Todo['severity'], title: 'info 项', to: '/z' }),
    ]
    const groups = groupTodos(todos)
    expect(groups.map((g) => g.severity)).toEqual(['error', 'warn', 'info'])
  })

  it('同 severity 内保持原相对顺序（稳定排序，不引入次级排序键）', () => {
    const todos: Todo[] = [
      todo({ kind: 'CHK-03', severity: 'error', title: '先出现', to: '/x' }),
      todo({ kind: 'CHK-01', severity: 'error', title: '后出现', to: '/y' }),
    ]
    expect(groupTodos(todos).map((g) => g.title)).toEqual(['先出现', '后出现'])
  })

  it('不同 kind 各自成组，不误合并', () => {
    const todos: Todo[] = [
      todo({ kind: 'CHK-04', severity: 'warn', title: 'A', to: '/a' }),
      todo({ kind: 'CHK-05', severity: 'warn', title: 'B', to: '/b' }),
    ]
    expect(groupTodos(todos)).toHaveLength(2)
  })

  it('空数组返回空数组', () => {
    expect(groupTodos([])).toEqual([])
  })
})

describe('resolveTodoTarget', () => {
  it('有 slug 时优先直达 P3 详情（比 to 字面值更有用，03 §2.3「Link 到 P3」意图）', () => {
    expect(resolveTodoTarget({ slug: 'ep-a', to: '/api/file?path=content/x/meta.yaml' })).toEqual({
      kind: 'content',
      slug: 'ep-a',
    })
  })

  it('无 slug、to 是 /api/file?path=… 时解析出文件路径（转 FileDrawer）', () => {
    expect(resolveTodoTarget({ to: '/api/file?path=harness%2Flogs%2Findex.jsonl' })).toEqual({
      kind: 'file',
      path: 'harness/logs/index.jsonl',
    })
  })

  it('无 slug、to=/contents 时归一到 /kanban（server 已知偏差的 ui 侧防御映射）', () => {
    expect(resolveTodoTarget({ to: '/contents' })).toEqual({ kind: 'route', path: '/kanban' })
  })

  it('其余 to 值原样当路由用', () => {
    expect(resolveTodoTarget({ to: '/harness' })).toEqual({ kind: 'route', path: '/harness' })
  })
})
