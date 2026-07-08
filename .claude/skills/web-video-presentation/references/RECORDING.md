# 录制与后期合成

网页做完 + 音频合成完之后，**首选 `npm run record` 无人出片**——
headless 浏览器确定性渲染 + ffmpeg 自动配音，全程零点击、零录屏软件、零后期对轨。
适合无人流水线（创作阶段 `pipeline/2-create.md` 默认走这条）。

退而求其次：人盯着的 Auto 模式 + 屏幕录制一镜到底（中段）；
完全不打音频时走手动点击 + 后期配（文末）。

---

## 推荐流程：`npm run record` 无人出片

### 前置
- 章节代码做完，每章 `narrations.ts` **每个 step 都有口播**（空串=静音步会让时间线错位）
- 已跑 `npm run extract-narrations` + `npm run synthesize-audio`，`public/audio/<id>/<step>.mp3` 全就位
- 已装 `playwright` + chromium（scaffold 已自动装；手动补：`npm i -D playwright && npx playwright install chromium`）

### 出片
```bash
npm run build
npm run record -- --serve --out final.mp4
```
`--serve` 让脚本自起 `vite preview`、录完自动关；不加则需先 `npm run dev` 并用 `--url` 指向它。
常用参数：`--out <路径>`、`--buffer <秒>`（步间留白，默认 0.2）、`--port <端口>`。

### 原理（为什么能无人且音画同步）
1. 读 `audio-segments.json`，`ffprobe` 拿每段音频时长。
2. headless 开 **Manual 模式**，逐 step 用方向键推进，每步停留 = 该段时长 + buffer；
   `record_video` 录 1920×1080 webm（纯画面，**不依赖 headless 放音**）。
3. ffmpeg 把各段 mp3 + buffer 静音拼成总音轨，与画面 mux → mp4。
4. 画面与音频共用同一条 per-step 时间线 → 天然同步。

### 收尾必做
脚本跑完**抽看几帧**：动画有没有被切半、首尾干不干净、音画对齐。
若某步动画长于口播被切 → 回章节代码改（写更长口播 / 拆 step / 调动画速度），与 Auto 模式同理。
有静音步导致错位 → 给该步补口播，或退回下面的手动录屏。

---

## 备选流程：Auto 模式一镜到底（需人盯）

### 前置

- 章节代码做完，每章都有 `narrations.ts`
- 已经跑过 `npm run extract-narrations` + `npm run synthesize-audio`，
  `public/audio/<id>/<step>.mp3` 全部就位
- `npm run dev` 跑着，浏览器能打开页面

### 录制步骤

1. **浏览器全屏**（F11 / Ctrl+Cmd+F），URL 改成
   `http://localhost:5173/?auto=1`
2. 看到 "Press SPACE to start" 蒙层 = Auto 模式就绪
3. **打开屏幕录制**（QuickTime / OBS / Cmd+Shift+5），开始录
4. **按一次 Space** → 蒙层消失 → step 0 出现，1.mp3 自动播 →
   播完自动推进到 step 1 → 2.mp3 → … → 最后一个 step 播完 → 停在终态
5. **停止录制** → 后期裁掉头尾（Space 那一下、最后停在终态的尾巴）就是
   成品

整个过程**完全不用点鼠标**。音视频天然同步，不需要后期对轨。

> **Auto 模式严格按音频结束推进**（+ 200ms 缓冲），没有"等动画跑完"
> 的兜底。如果你看到某步动画被切了一半 → 说明该 step 动画长于口播，
> 回章节代码改：写更长口播 / 拆 step / 调动画速度。

### 录屏工具

| 平台 | 工具 | 设置 |
|---|---|---|
| macOS | Cmd+Shift+5 → 录制选定窗口 | 选浏览器窗口；浏览器全屏后输出就是 1920×1080 |
| macOS | QuickTime → 文件 → 新建屏幕录制 | 同上 |
| 跨平台 | OBS Studio | 窗口捕获，Canvas 1920×1080，60fps |

### 模式速查

| URL / 快捷键 | 行为 |
|---|---|
| 直接打开（默认） | Manual：点击 / ←→ 推进，不播音频 |
| `?audio=1` 或按 `M` | Audio：进入 step 自动播音频，但**手动点鼠标推进** |
| `?audio=1` + 再按 `M` | Auto：进入 step 自动播 + 自动推进（录制用） |
| Auto 模式下首次按 `Space` | 启动 Auto 播放（绕过浏览器自动播放限制） |

也可以鼠标移到右上角，会出现一个隐藏的模式切换按钮。

---

## 备用流程：没合成音频时手动录屏

如果你跳过了音频合成（`Checkpoint Audio` 选了"不合成"），按老方法：

1. 浏览器全屏 → 打开 `localhost:5173`（默认 Manual 模式）
2. **刷新一次**清空历史 step
3. 开始录屏 → 按口播节奏点击空白推进 step
4. 后期用任何剪辑软件配音 + 调时间线

### 后期工具

| 工具 | 适合 |
|---|---|
| **DaVinci Resolve** | 跨平台免费、能处理多段音频拼接 |
| **iMovie** | macOS 简单场景 |
| **CapCut / 剪映** | B 站 / 抖音风加字幕 |

---

> agent 在 Checkpoint Audio 后**主动告诉用户**怎么把网页变成 mp4：
> 无人流水线 → `npm run record -- --serve`（首选）；人在场调试 → Auto 模式录屏。
