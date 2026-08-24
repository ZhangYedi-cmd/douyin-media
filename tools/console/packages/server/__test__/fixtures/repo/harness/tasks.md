# 治理任务注册表 fixture

```yaml
tasks:
  - task: retro
    skill: douyin-retro
    enabled: true
    trigger: post-publish-window
    windows: [24h, 72h, 7d]

  - task: ideate
    skill: douyin-ideate
    enabled: true
    trigger: periodic:2d

  - task: backlog-gardener
    skill: backlog-gardener
    enabled: true
    trigger: periodic:7d

  - task: never-run-task
    skill: nothing
    enabled: true
    trigger: periodic:3d

  - task: disabled-task
    enabled: false
    trigger: periodic:1d
```
