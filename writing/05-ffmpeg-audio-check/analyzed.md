# 第 05 课：ffmpeg 音频体检脚本 材料盘点与技术拆解

## 1. 核心问题与痛点
- 痛点：使用 TTS 批量生成几十段口播切片后，如果依靠人工逐段佩戴耳机试听，每条视频耗费 20 到 30 分钟，无法实现无人值守流水线。
- 根本原因：大语言模型（LLM）擅长处理文本 Token 概率分布与逻辑推理，但在物理世界没有耳朵与时钟，无法直接感知音频文件的时域波形、静音分贝、采样率以及起止毫秒数。直接在提示词中询问大模型这段音频有没有停顿过长或音画脱节，模型必然会基于文本产生主观幻觉。
- 解决路径：让底层确定性工具（ffmpeg / ffprobe）担任物理度量仪器，充当大模型的眼睛和耳朵；脚本负责精准测量并将物理数据打包为结构化信封（JSON / YAML）；大模型接收结构化事实后负责诊断、归因并自动生成修复参数。

## 2. 核心技术点与命令清单
1. 静音探测：
   `ffmpeg -i input.mp3 -af silencedetect=noise=-30dB:d=0.45 -f null -`
   - noise=-30dB：静音门限，低于 -30dB 视为静音背景底噪。
   - d=0.45：持续时间阈值，持续超过 0.45 秒才触发报警（短视频完播率生死线）。
   - 解析 stderr 中的 silence_start 与 silence_end 计算真实内部停顿。
2. 音频物理时长与基础属性探测：
   `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 input.mp3`
   `ffprobe -v error -select_streams a:0 -show_entries stream=sample_rate,channels -of json input.mp3`
3. 音量与峰值检测：
   `ffmpeg -i input.mp3 -af volumedetect -f null -`
   - 解析 max_volume, mean_volume，防止爆音（> -0.5dB）或音量过小（< -25dB）。
4. 结构化信封设计：
   - 严禁输出非结构化散文日志。
   - YAML / JSON 信封规范：包含 run_id, check_time, summary, segments 列表（每个包含 segment_id, file_path, duration_ms, expected_duration_ms, diff_ms, errors 数组）。
5. 静音压平工具（depause.mjs）：
   - silenceremove 滤镜或切片拼接逻辑，将大于 0.45s 的内部死气压缩至 0.20~0.25s 自然气口。
   - 踩坑防坑：ffmpeg 输入输出同名会导致原地写入静默截断为 0 字节且 exit code 返回 0；必须写入临时文件再原子重命名，跑完强制复扫。
6. HOW 提示词引导三步法：
   - 步骤 1：提示词引导 AI 封装底层度量工具（调用 ffmpeg / ffprobe 并产出结构化对象）。
   - 步骤 2：将客观测试数据封装为结构化信封喂给 AI（注入问题切片、时间戳、偏差毫秒）。
   - 步骤 3：提示词引导 AI 质检裁判自动生成修复参数（修剪命令、音量增益、注音覆盖字典补丁）。

## 3. 篇幅与结构规划
- 目标字数：6500~7500 字，硬禁令 0 命中。
- 结构：
  1. 为什么大模型需要物理世界的度量工具（模型盲区、0.45 秒生死线、分工原则）。
  2. 实战拆解：用 silencedetect 与 ffprobe 捕获声学异常（核心参数解析、批量扫描脚本实现、音量与采样率检测）。
  3. 架构设计：结构化体检信封与去停顿工具（散文日志弊端、信封契约设计、depause.mjs 原理与原地写入 0 字节防坑）。
  4. 提示词引导三步法：指挥 AI 搭建质检闭环（步骤 1 封装测量工具、步骤 2 组装体检信封、步骤 3 引导 AI 生成修复参数）。
  5. 验收标准、卡点排查与实战作业（验收清单、常见报错拦截、课后练习）。
