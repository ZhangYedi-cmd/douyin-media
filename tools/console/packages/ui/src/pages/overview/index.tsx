// P1 总览（`#/`）——03 §2.3 全文。晨检页，10 秒回答「今天正常吗 / 有几条在制 / 有什么要我处理」。
// 本页零写动作（全部是跳转与看文件），数据源单一：usePageData<OverviewData>('/api/overview')。
import { useState } from 'react'
import { Alert as AntAlert, Skeleton, Spin } from 'antd'
import type { OverviewData } from '@console/server/api-types'
import { usePageData } from '../../lib/store'
import { FileDrawer } from '../../components/FileDrawer'
import { DailyRunCard } from './DailyRunCard'
import { AlertSection } from './AlertSection'
import { WipStats } from './WipStats'
import { TodoList } from './TodoList'
import { HeartbeatBars } from './HeartbeatBars'
import { BacklogWaterCard } from './BacklogWaterCard'
import styles from './overview.module.css'

export default function OverviewPage() {
  const { data, error, stale } = usePageData<OverviewData>('/api/overview')
  const [drawerPath, setDrawerPath] = useState<string | undefined>(undefined)

  return (
    <div className="page">
      <div className="page-head">
        <h1>总览</h1>
        <span className="sub mono">今天正常吗 · 有几条在制 · 有什么要我处理</span>
        {stale ? <Spin size="small" /> : null}
      </div>

      {error ? (
        <AntAlert
          type="error"
          showIcon
          message="总览数据加载失败"
          description={error.message}
          style={{ marginBottom: 'var(--space-4)' }}
        />
      ) : null}

      {!data ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : (
        <div className={styles.layout}>
          <div className={styles.col}>
            <DailyRunCard dailyRun={data.dailyRun} onOpenFile={setDrawerPath} />
            <AlertSection alerts={data.alerts} onOpenFile={setDrawerPath} />
            <WipStats wip={data.wip} />
          </div>
          <div className={styles.col}>
            <TodoList todos={data.todos} onOpenFile={setDrawerPath} />
            <HeartbeatBars heartbeat={data.heartbeat} />
            <BacklogWaterCard backlogWater={data.backlogWater} />
          </div>
        </div>
      )}

      <FileDrawer path={drawerPath} onClose={() => setDrawerPath(undefined)} mono />
    </div>
  )
}
