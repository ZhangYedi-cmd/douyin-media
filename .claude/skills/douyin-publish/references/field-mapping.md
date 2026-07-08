# content 条目 → sau 参数 映射

把一条内容（meta.yaml + 4-publish.md + assets/）翻译成 `sau douyin` 命令。

## 通用
| sau 参数 | 来源 | 说明 |
|---|---|---|
| `--account` | 默认 `main`；多账号看 meta | 已登录的账号名 |
| `--title` | 4-publish.md「标题」 | 抖音有字数上限，超了截断并提示 |
| `--tags` | 4-publish.md「话题标签」 | **逗号分隔、不带 #**（sau 自动加#）；如 `AI编程,Claude` |
| `--schedule` | `--when` > 4-publish 建议时段 | 格式 `YYYY-MM-DD HH:MM`；不传=立即发；须在约 2h~14d 内 |

## 视频（type=kouban）→ upload-video
| sau 参数 | 来源 |
|---|---|
| `--file` | `assets/` 里的成片 mp4（绝对路径，仅一个） |
| `--desc` | 4-publish.md「正文/简介」 |
| `--thumbnail` | `assets/` 封面（3:4 竖版）；横版封面用 `--thumbnail-landscape`（4:3） |

示例：
```
cd "$SAU_DIR" && uv run sau douyin upload-video \
  --account main \
  --file /Users/yedi/douyin-media/content/2026-06-16/<slug>/assets/final.mp4 \
  --title "标题" --desc "正文" --tags AI编程,Claude \
  --schedule "2026-06-16 19:30" --headed
```

## 图文（type=tuwen）→ upload-note
| sau 参数 | 来源 |
|---|---|
| `--images` | `assets/` 图片，**按发布顺序**给多个绝对路径（首图=封面） |
| `--note` | 4-publish.md「正文」 |

约束：不支持 GIF；最多 35 张。

示例：
```
cd "$SAU_DIR" && uv run sau douyin upload-note \
  --account main \
  --images /abs/1.jpg /abs/2.jpg /abs/3.jpg \
  --title "标题" --note "正文" --tags AI,工具 --headed
```

## 注意
- 字段缺失：`--title`/`--file`(或 `--images`) 是必填，缺则中止。
- 路径一律绝对路径。
- 立即 vs 定时：dry-run 摘要里必须写清，让人确认是不是马上公开。
