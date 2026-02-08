# FFmpeg 命令参考手册

> 面向内容创作者的 ffmpeg UI 应用命令模板与参数参考
>
> 基于环境：ffmpeg 8.0.1 / macOS (Apple Silicon) / VideoToolbox 硬件加速
>
> 编写日期：2026-02-08

---

## 目录

1. [通用部分：视频元信息与进度监控](#0-通用部分)
2. [格式转换](#1-格式转换)
3. [视频压缩](#2-视频压缩)
4. [视频裁剪/剪切](#3-视频裁剪剪切)
5. [视频合并/拼接](#4-视频合并拼接)
6. [音频提取/处理](#5-音频提取处理)
7. [加水印/文字](#6-加水印文字)
8. [分辨率/帧率调整](#7-分辨率帧率调整)
9. [GIF 制作](#8-gif-制作)
10. [字幕处理](#9-字幕处理)
11. [预设方案模板](#10-预设方案模板)

---

## 0. 通用部分

### 0.1 ffprobe 获取视频元信息

#### 获取完整 JSON 格式元信息

```bash
ffprobe -v quiet -print_format json -show_format -show_streams "input.mp4"
```

#### 只获取视频流信息

```bash
ffprobe -v quiet -print_format json -show_streams -select_streams v:0 "input.mp4"
```

#### 只获取音频流信息

```bash
ffprobe -v quiet -print_format json -show_streams -select_streams a:0 "input.mp4"
```

#### 获取时长（秒）

```bash
ffprobe -v quiet -show_entries format=duration -of csv=p=0 "input.mp4"
```

#### 获取分辨率

```bash
ffprobe -v quiet -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "input.mp4"
```

#### 获取帧率

```bash
ffprobe -v quiet -select_streams v:0 -show_entries stream=r_frame_rate -of csv=p=0 "input.mp4"
```

#### 获取码率

```bash
ffprobe -v quiet -show_entries format=bit_rate -of csv=p=0 "input.mp4"
```

#### 获取编解码器

```bash
ffprobe -v quiet -select_streams v:0 -show_entries stream=codec_name -of csv=p=0 "input.mp4"
```

#### JSON 输出结构示例

```json
{
  "streams": [
    {
      "index": 0,
      "codec_name": "h264",
      "codec_type": "video",
      "width": 1920,
      "height": 1080,
      "r_frame_rate": "30/1",
      "avg_frame_rate": "30/1",
      "duration": "120.500000",
      "bit_rate": "5000000",
      "pix_fmt": "yuv420p",
      "nb_frames": "3615"
    },
    {
      "index": 1,
      "codec_name": "aac",
      "codec_type": "audio",
      "sample_rate": "44100",
      "channels": 2,
      "bit_rate": "128000"
    }
  ],
  "format": {
    "filename": "input.mp4",
    "format_name": "mov,mp4,m4a,3gp,3g2,mj2",
    "duration": "120.500000",
    "size": "78643200",
    "bit_rate": "5218000"
  }
}
```

#### 关键字段说明（用于 UI 展示）

| 字段 | 说明 | 用途 |
|------|------|------|
| `streams[].codec_name` | 编解码器名称 | 展示编码格式 |
| `streams[].width/height` | 分辨率 | 展示视频尺寸 |
| `streams[].r_frame_rate` | 帧率（分数形式） | 展示帧率（需做除法） |
| `streams[].bit_rate` | 流码率（bps） | 展示码率 |
| `streams[].pix_fmt` | 像素格式 | 判断色彩空间 |
| `streams[].duration` | 流时长（秒） | 展示时长 |
| `format.duration` | 容器时长（秒） | 总时长 |
| `format.size` | 文件大小（字节） | 展示文件大小 |
| `format.bit_rate` | 总码率（bps） | 总码率 |

### 0.2 进度监控

#### 使用 -progress 参数

```bash
ffmpeg -i input.mp4 -progress pipe:1 -nostats output.mp4
```

#### -progress 输出格式

每隔一段时间输出一组 key=value 对，以 `progress=continue` 或 `progress=end` 结尾：

```
frame=150
fps=45.2
stream_0_0_q=28.0
bitrate=4500.0kbits/s
total_size=1048576
out_time_us=5000000
out_time_ms=5000000
out_time=00:00:05.000000
dup_frames=0
drop_frames=0
speed=1.5x
progress=continue
```

#### 关键字段解析

| 字段 | 说明 | 计算进度的方式 |
|------|------|---------------|
| `out_time_us` | 已处理的时间（微秒） | `out_time_us / (total_duration_us) * 100` |
| `out_time` | 已处理的时间（HH:MM:SS.ffffff） | 解析为秒后除以总时长 |
| `frame` | 已处理的帧数 | `frame / total_frames * 100` |
| `speed` | 处理速度 | 用于预估剩余时间 |
| `fps` | 每秒处理帧数 | 展示处理速度 |
| `total_size` | 当前输出大小（字节） | 实时展示输出文件大小 |
| `progress` | 状态标识 | `continue` 或 `end` |

#### 进度计算公式

```
进度百分比 = (out_time_us / total_duration_us) * 100
预估剩余时间 = (total_duration - out_time) / speed
```

#### 使用 -stats_period 控制输出频率

```bash
# 每 0.5 秒输出一次进度（默认约 0.5s）
ffmpeg -i input.mp4 -stats_period 0.5 -progress pipe:1 -nostats output.mp4
```

### 0.3 macOS VideoToolbox 硬件加速

#### 支持的编码器

| 编码器 | ffmpeg 名称 | 说明 |
|--------|------------|------|
| H.264 | `h264_videotoolbox` | 最通用的硬件 H.264 编码 |
| H.265/HEVC | `hevc_videotoolbox` | 高效率硬件编码 |
| ProRes | `prores_videotoolbox` | 专业视频编辑格式 |

#### H.264 VideoToolbox 编码

```bash
ffmpeg -i input.mp4 \
  -c:v h264_videotoolbox \
  -b:v 5M \
  -c:a aac -b:a 128k \
  output.mp4
```

#### HEVC VideoToolbox 编码

```bash
ffmpeg -i input.mp4 \
  -c:v hevc_videotoolbox \
  -b:v 4M \
  -tag:v hvc1 \
  -c:a aac -b:a 128k \
  output.mp4
```

> **注意**：`-tag:v hvc1` 确保 Apple 设备兼容性。

#### VideoToolbox 关键参数

| 参数 | 说明 | 示例值 |
|------|------|--------|
| `-b:v` | 目标码率 | `5M`、`8000k` |
| `-q:v` | 质量参数（VT 专用，0-100） | `65`（越高质量越好） |
| `-profile:v` | 编码 profile | `high`、`main`、`baseline` |
| `-level:v` | 编码 level | `4.1`、`5.1` |
| `-allow_sw 1` | 允许软件回退 | 硬件不支持时用软件编码 |
| `-realtime 1` | 实时编码优先 | 降低延迟 |
| `-prio_speed 1` | 速度优先 | 牺牲质量换速度 |

#### VideoToolbox vs 软件编码对比

| 特性 | VideoToolbox | libx264 |
|------|-------------|---------|
| 编码速度 | 极快（3-10x） | 较慢 |
| 质量/码率效率 | 中等 | 高 |
| 码率控制 | ABR/CBR | CRF/ABR/CBR/CQP |
| CPU 占用 | 极低 | 高 |
| 适用场景 | 快速转码/实时预览 | 最终输出/高质量归档 |

### 0.4 通用参数速查

| 参数 | 说明 | 示例 |
|------|------|------|
| `-y` | 覆盖输出文件（不提示） | `-y` |
| `-n` | 不覆盖输出文件（存在则失败） | `-n` |
| `-hide_banner` | 隐藏版本信息 | `-hide_banner` |
| `-v quiet` | 静默模式 | `-v quiet` |
| `-v error` | 只输出错误 | `-v error` |
| `-threads N` | 线程数 | `-threads 4` |
| `-map` | 流映射 | `-map 0:v:0 -map 0:a:0` |
| `-metadata` | 设置元数据 | `-metadata title="Video"` |
| `-movflags +faststart` | MP4 web 优化 | 将 moov atom 移到文件前部 |

---

## 1. 格式转换

### 1.1 各格式推荐编解码器组合

| 输出格式 | 推荐视频编码 | 推荐音频编码 | 文件扩展名 | 适用场景 |
|----------|-------------|-------------|-----------|---------|
| MP4 | H.264 (libx264) | AAC (aac) | .mp4 | 通用、社交媒体 |
| MP4 (高效) | H.265 (libx265) | AAC (aac) | .mp4 | 高效压缩 |
| MOV | H.264 / ProRes | AAC / PCM | .mov | Apple 生态 |
| MKV | H.264 / H.265 / AV1 | AAC / OPUS / FLAC | .mkv | 万能容器 |
| WebM | VP9 (libvpx-vp9) | Opus (libopus) | .webm | Web 播放 |
| AVI | H.264 / MPEG-4 | MP3 / PCM | .avi | 兼容旧设备 |
| FLV | H.264 | AAC / MP3 | .flv | 直播推流 |
| TS | H.264 | AAC | .ts | 直播/广播 |

### 1.2 基本格式转换命令

#### MP4 → MKV（直接封装，不重新编码）

```bash
ffmpeg -i input.mp4 -c copy output.mkv
```

#### MP4 → WebM

```bash
ffmpeg -i input.mp4 \
  -c:v libvpx-vp9 -crf 30 -b:v 0 \
  -c:a libopus -b:a 128k \
  output.webm
```

#### MOV → MP4

```bash
ffmpeg -i input.mov \
  -c:v libx264 -crf 23 -preset medium \
  -c:a aac -b:a 128k \
  -movflags +faststart \
  output.mp4
```

#### AVI → MP4

```bash
ffmpeg -i input.avi \
  -c:v libx264 -crf 23 -preset medium \
  -c:a aac -b:a 128k \
  -movflags +faststart \
  output.mp4
```

#### MP4 → MOV (ProRes 422)

```bash
ffmpeg -i input.mp4 \
  -c:v prores_ks -profile:v 2 \
  -c:a pcm_s16le \
  output.mov
```

> ProRes profile: 0=Proxy, 1=LT, 2=Standard, 3=HQ, 4=4444, 5=4444XQ

#### 任意格式 → MP4 (H.265)

```bash
ffmpeg -i input.avi \
  -c:v libx265 -crf 28 -preset medium \
  -tag:v hvc1 \
  -c:a aac -b:a 128k \
  -movflags +faststart \
  output.mp4
```

### 1.3 硬件加速转码 (VideoToolbox)

#### 通用 VideoToolbox 转码

```bash
ffmpeg -i input.mov \
  -c:v h264_videotoolbox -b:v 5M \
  -c:a aac -b:a 128k \
  -movflags +faststart \
  output.mp4
```

#### HEVC VideoToolbox 转码

```bash
ffmpeg -i input.mov \
  -c:v hevc_videotoolbox -b:v 4M \
  -tag:v hvc1 \
  -c:a aac -b:a 128k \
  -movflags +faststart \
  output.mp4
```

#### 硬件解码 + 硬件编码

```bash
ffmpeg -hwaccel videotoolbox -i input.mp4 \
  -c:v h264_videotoolbox -b:v 5M \
  -c:a aac -b:a 128k \
  -movflags +faststart \
  output.mp4
```

### 1.4 批量格式转换模板

```bash
# 将目录下所有 MOV 转为 MP4
for f in *.mov; do
  ffmpeg -i "$f" \
    -c:v libx264 -crf 23 -preset medium \
    -c:a aac -b:a 128k \
    -movflags +faststart \
    "${f%.mov}.mp4"
done
```

---

## 2. 视频压缩

### 2.1 CRF 模式（恒定质量）

#### 基本命令

```bash
ffmpeg -i input.mp4 \
  -c:v libx264 -crf <值> -preset <预设> \
  -c:a aac -b:a 128k \
  -movflags +faststart \
  output.mp4
```

#### CRF 值对照表（libx264）

| CRF 值 | 质量描述 | 适用场景 | 相对文件大小 |
|--------|---------|---------|-------------|
| 0 | 无损 | 归档 | 极大 |
| 14-16 | 接近无损 | 专业后期素材 | 很大 |
| 17-18 | 视觉无损 | 高质量归档 | 大 |
| 19-20 | 优秀 | 高品质发布 | 较大 |
| 21-23 | 良好（默认23） | 通用发布 | 中等 |
| 24-26 | 中等 | 社交媒体 | 较小 |
| 27-28 | 一般 | 预览/低带宽 | 小 |
| 29-32 | 较差 | 极端压缩 | 很小 |
| 51 | 最差 | 不推荐 | 最小 |

> **经验法则**：CRF 每增加 6，文件大小约减半，质量有可感知下降。

#### CRF 值对照表（libx265）

| CRF 值 | 等效 x264 CRF | 说明 |
|--------|--------------|------|
| 22 | ~17 | 视觉无损 |
| 24 | ~19 | 优秀 |
| 28 | ~23 | 良好（默认） |
| 32 | ~27 | 中等 |

> libx265 的 CRF 值与 libx264 不直接可比，x265 的同等 CRF 值质量通常更好。

### 2.2 Preset 预设选项

#### x264/x265 Preset 对比

| Preset | 编码速度 | 压缩效率 | 适用场景 |
|--------|---------|---------|---------|
| `ultrafast` | 最快 | 最低 | 实时/快速预览 |
| `superfast` | 极快 | 很低 | 快速转码 |
| `veryfast` | 很快 | 低 | 快速转码 |
| `faster` | 快 | 较低 | 日常使用 |
| `fast` | 较快 | 中低 | 日常使用 |
| `medium` | 中等（默认） | 中等 | 通用推荐 |
| `slow` | 慢 | 较高 | 质量优先 |
| `slower` | 很慢 | 高 | 高质量发布 |
| `veryslow` | 极慢 | 最高 | 最终归档 |

> **推荐默认值**：`medium`。大多数场景下 `medium` 到 `slow` 是最佳平衡点。
>
> **速度差异**：`ultrafast` 比 `veryslow` 快约 5-10 倍，但相同 CRF 下文件大约大 40-50%。

### 2.3 社交媒体平台推荐参数

#### 微信（视频号/朋友圈）

```bash
# 微信对 H.265 支持良好
ffmpeg -i input.mp4 \
  -c:v libx264 -crf 23 -preset medium \
  -profile:v high -level 4.1 \
  -vf "scale='min(1920,iw)':'min(1080,ih)':force_original_aspect_ratio=decrease" \
  -b:v 4M -maxrate 6M -bufsize 8M \
  -c:a aac -b:a 128k -ar 44100 \
  -movflags +faststart \
  -pix_fmt yuv420p \
  output_wechat.mp4
```

**微信限制**：
- 视频号：最大 1080p，最长 30 分钟，H.264/H.265
- 朋友圈：最大 25MB（压缩后），最长 30 秒
- 推荐码率：2-6 Mbps

#### 抖音/TikTok

```bash
# 竖屏 9:16 (1080x1920)
ffmpeg -i input.mp4 \
  -c:v libx264 -crf 20 -preset medium \
  -profile:v high -level 4.2 \
  -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black" \
  -r 30 \
  -b:v 4M -maxrate 6M -bufsize 8M \
  -c:a aac -b:a 128k -ar 44100 \
  -movflags +faststart \
  -pix_fmt yuv420p \
  output_douyin.mp4
```

**抖音限制**：
- 推荐分辨率：1080x1920 (9:16)
- 最大文件：500MB
- 最长时长：15 分钟（普通），60 分钟（创作者）
- 推荐码率：3-6 Mbps

#### B站（Bilibili）

```bash
ffmpeg -i input.mp4 \
  -c:v libx264 -crf 18 -preset slow \
  -profile:v high -level 5.1 \
  -vf "scale='min(3840,iw)':'min(2160,ih)':force_original_aspect_ratio=decrease" \
  -b:v 6M -maxrate 10M -bufsize 15M \
  -c:a aac -b:a 320k -ar 48000 \
  -movflags +faststart \
  -pix_fmt yuv420p \
  output_bilibili.mp4
```

**B站说明**：
- 支持 4K 上传
- 二次编码，建议上传高码率源
- 推荐码率：6-15 Mbps（1080p）
- 音频推荐：AAC 320kbps

#### YouTube

```bash
# YouTube 推荐设置（1080p）
ffmpeg -i input.mp4 \
  -c:v libx264 -crf 16 -preset slow \
  -profile:v high -level 4.2 \
  -bf 2 -g 30 \
  -vf "scale='min(1920,iw)':'min(1080,ih)':force_original_aspect_ratio=decrease" \
  -b:v 8M -maxrate 12M -bufsize 16M \
  -c:a aac -b:a 384k -ar 48000 \
  -movflags +faststart \
  -pix_fmt yuv420p \
  output_youtube.mp4
```

```bash
# YouTube 4K HDR
ffmpeg -i input.mp4 \
  -c:v libx265 -crf 16 -preset slow \
  -tag:v hvc1 \
  -vf "scale='min(3840,iw)':'min(2160,ih)':force_original_aspect_ratio=decrease" \
  -b:v 35M -maxrate 50M -bufsize 70M \
  -c:a aac -b:a 384k -ar 48000 \
  -movflags +faststart \
  output_youtube_4k.mp4
```

**YouTube 推荐码率（SDR）**：
- 4K (2160p): 35-68 Mbps
- 1440p: 16-24 Mbps
- 1080p: 8-12 Mbps
- 720p: 5-7.5 Mbps

### 2.4 智能压缩：根据目标文件大小反算码率

#### 计算公式

```
目标总码率 (kbps) = 目标大小 (KB) * 8 / 时长 (秒)
视频码率 (kbps) = 目标总码率 - 音频码率
```

#### 两遍编码（最精确的大小控制）

```bash
# 获取视频时长
DURATION=$(ffprobe -v quiet -show_entries format=duration -of csv=p=0 "input.mp4")

# 设置目标大小（单位：MB）和音频码率
TARGET_SIZE_MB=50
AUDIO_BITRATE=128  # kbps

# 计算视频码率
VIDEO_BITRATE=$(echo "($TARGET_SIZE_MB * 8192 / $DURATION) - $AUDIO_BITRATE" | bc)

# 第一遍：分析
ffmpeg -i input.mp4 \
  -c:v libx264 -b:v ${VIDEO_BITRATE}k -preset medium \
  -pass 1 -an -f null /dev/null

# 第二遍：编码
ffmpeg -i input.mp4 \
  -c:v libx264 -b:v ${VIDEO_BITRATE}k -preset medium \
  -pass 2 \
  -c:a aac -b:a ${AUDIO_BITRATE}k \
  -movflags +faststart \
  output.mp4
```

#### 单遍编码（快速但不精确）

```bash
# 使用 -maxrate 和 -bufsize 来近似目标大小
ffmpeg -i input.mp4 \
  -c:v libx264 -b:v ${VIDEO_BITRATE}k \
  -maxrate $((VIDEO_BITRATE * 15 / 10))k \
  -bufsize $((VIDEO_BITRATE * 2))k \
  -preset medium \
  -c:a aac -b:a 128k \
  -movflags +faststart \
  output.mp4
```

#### UI 中码率计算的参考代码

```typescript
/**
 * 根据目标文件大小计算视频码率
 * @param targetSizeMB - 目标文件大小（MB）
 * @param durationSeconds - 视频时长（秒）
 * @param audioBitrateKbps - 音频码率（kbps），默认 128
 * @returns 视频码率（kbps），如果计算结果不合理返回 null
 */
function calculateVideoBitrate(
  targetSizeMB: number,
  durationSeconds: number,
  audioBitrateKbps: number = 128
): number | null {
  // 目标总码率 = 目标大小(KB) * 8 / 时长(秒)
  const totalBitrate = (targetSizeMB * 1024 * 8) / durationSeconds;
  const videoBitrate = totalBitrate - audioBitrateKbps;

  // 码率太低则不合理
  if (videoBitrate < 100) return null;
  return Math.floor(videoBitrate);
}
```

---

## 3. 视频裁剪/剪切

### 3.1 基本时间参数

| 参数 | 说明 | 格式 |
|------|------|------|
| `-ss` | 起始时间点 | `HH:MM:SS.xxx` 或秒数 |
| `-to` | 结束时间点 | `HH:MM:SS.xxx` 或秒数 |
| `-t` | 持续时长 | `HH:MM:SS.xxx` 或秒数 |

> **注意**：`-to` 和 `-t` 不能同时使用。`-to` 是绝对时间点，`-t` 是相对于 `-ss` 的持续时长。

### 3.2 快速切割（-c copy，无需重新编码）

```bash
# 使用 -ss 在 -i 之前（输入侧 seek，最快但可能不精确）
ffmpeg -ss 00:01:30 -to 00:03:00 -i input.mp4 -c copy output.mp4

# 使用 -ss 在 -i 之后（输出侧 seek，精确到帧但稍慢）
ffmpeg -i input.mp4 -ss 00:01:30 -to 00:03:00 -c copy output.mp4
```

**快速切割的优缺点**：
- 优点：速度极快，无质量损失
- 缺点：起止点只能落在关键帧上，可能有几秒偏差；开头可能出现花屏

### 3.3 精确切割（重新编码）

```bash
# 最精确的方式：输入侧快速定位到附近关键帧 + 输出侧精确裁剪
ffmpeg -ss 00:01:30 -i input.mp4 \
  -ss 0 -to 00:01:30 \
  -c:v libx264 -crf 18 -preset medium \
  -c:a aac -b:a 128k \
  -movflags +faststart \
  output.mp4
```

```bash
# 简单的精确切割
ffmpeg -i input.mp4 \
  -ss 00:01:30 -to 00:03:00 \
  -c:v libx264 -crf 18 -preset medium \
  -c:a aac -b:a 128k \
  -movflags +faststart \
  output.mp4
```

### 3.4 推荐的精确切割策略（UI 应用推荐）

```bash
# 将 -ss 放在 -i 前面实现快速定位，然后重新编码确保精确
ffmpeg -ss <起始时间> -i input.mp4 \
  -t <持续时长> \
  -c:v libx264 -crf 18 -preset medium \
  -c:a aac -b:a 128k \
  -avoid_negative_ts make_zero \
  -movflags +faststart \
  output.mp4
```

> `-avoid_negative_ts make_zero` 避免时间戳为负数导致的问题。

### 3.5 关键帧对齐

#### 查看关键帧位置

```bash
ffprobe -v quiet -select_streams v:0 \
  -show_entries frame=pts_time,pict_type \
  -of csv=p=0 \
  "input.mp4" | grep ",I" | head -20
```

#### 强制关键帧间隔（编码时）

```bash
ffmpeg -i input.mp4 \
  -c:v libx264 -crf 18 -preset medium \
  -g 30 -keyint_min 30 \
  -c:a aac -b:a 128k \
  output.mp4
```

> `-g 30` 设置 GOP 大小为 30 帧（30fps 视频 = 每秒一个关键帧）。

---

## 4. 视频合并/拼接

### 4.1 concat demuxer 方式（同格式同参数）

这是最推荐的方式，前提是所有视频的编码参数一致。

#### 创建文件列表

```
# filelist.txt
file 'part1.mp4'
file 'part2.mp4'
file 'part3.mp4'
```

#### 执行合并

```bash
# 无需重新编码，速度极快
ffmpeg -f concat -safe 0 -i filelist.txt -c copy output.mp4
```

> `-safe 0` 允许文件路径包含特殊字符。

#### 使用绝对路径

```
# filelist.txt
file '/Users/james/videos/part1.mp4'
file '/Users/james/videos/part2.mp4'
```

### 4.2 concat filter 方式（不同格式/分辨率）

#### 两个视频拼接（统一参数）

```bash
ffmpeg -i input1.mp4 -i input2.mov \
  -filter_complex "\
    [0:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30[v0]; \
    [1:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30[v1]; \
    [0:a]aresample=44100,aformat=sample_fmts=fltp:channel_layouts=stereo[a0]; \
    [1:a]aresample=44100,aformat=sample_fmts=fltp:channel_layouts=stereo[a1]; \
    [v0][a0][v1][a1]concat=n=2:v=1:a=1[v][a]" \
  -map "[v]" -map "[a]" \
  -c:v libx264 -crf 18 -preset medium \
  -c:a aac -b:a 128k \
  -movflags +faststart \
  output.mp4
```

#### 三个视频拼接

```bash
ffmpeg -i input1.mp4 -i input2.mp4 -i input3.mp4 \
  -filter_complex "\
    [0:v]scale=1920:1080,setsar=1,fps=30[v0]; \
    [1:v]scale=1920:1080,setsar=1,fps=30[v1]; \
    [2:v]scale=1920:1080,setsar=1,fps=30[v2]; \
    [0:a]aresample=44100[a0]; \
    [1:a]aresample=44100[a1]; \
    [2:a]aresample=44100[a2]; \
    [v0][a0][v1][a1][v2][a2]concat=n=3:v=1:a=1[v][a]" \
  -map "[v]" -map "[a]" \
  -c:v libx264 -crf 18 -preset medium \
  -c:a aac -b:a 128k \
  output.mp4
```

### 4.3 转场效果

#### 交叉淡入淡出（xfade）

```bash
# 两个 5 秒视频，1 秒交叉淡入淡出
ffmpeg -i input1.mp4 -i input2.mp4 \
  -filter_complex "\
    [0:v][1:v]xfade=transition=fade:duration=1:offset=4[v]; \
    [0:a][1:a]acrossfade=d=1[a]" \
  -map "[v]" -map "[a]" \
  -c:v libx264 -crf 18 -preset medium \
  -c:a aac -b:a 128k \
  output.mp4
```

> `offset` = 第一个视频时长 - 转场时长

#### 支持的转场类型

| 转场名称 | 效果描述 |
|---------|---------|
| `fade` | 淡入淡出（最常用） |
| `wipeleft` | 从右向左擦除 |
| `wiperight` | 从左向右擦除 |
| `wipeup` | 从下向上擦除 |
| `wipedown` | 从上向下擦除 |
| `slideleft` | 向左滑动 |
| `slideright` | 向右滑动 |
| `slideup` | 向上滑动 |
| `slidedown` | 向下滑动 |
| `circlecrop` | 圆形扩展 |
| `circleclose` | 圆形收缩 |
| `circleopen` | 圆形打开 |
| `dissolve` | 溶解 |
| `pixelize` | 像素化 |
| `diagtl` | 对角线（左上） |
| `diagtr` | 对角线（右上） |
| `diagbl` | 对角线（左下） |
| `diagbr` | 对角线（右下） |
| `hlslice` | 水平切片 |
| `hrslice` | 水平反向切片 |
| `vuslice` | 垂直切片 |
| `vdslice` | 垂直反向切片 |
| `hblur` | 水平模糊 |
| `fadegrays` | 灰度淡入淡出 |
| `squeezev` | 垂直挤压 |
| `squeezeh` | 水平挤压 |
| `zoomin` | 放大 |
| `fadeblack` | 经黑色淡入淡出 |
| `fadewhite` | 经白色淡入淡出 |
| `radial` | 径向 |
| `smoothleft` | 平滑向左 |
| `smoothright` | 平滑向右 |
| `smoothup` | 平滑向上 |
| `smoothdown` | 平滑向下 |

#### 多视频带转场拼接

```bash
# 三个视频，每两个之间 1 秒淡入淡出
# 假设 input1=10s, input2=10s, input3=10s
ffmpeg -i input1.mp4 -i input2.mp4 -i input3.mp4 \
  -filter_complex "\
    [0:v][1:v]xfade=transition=fade:duration=1:offset=9[v01]; \
    [v01][2:v]xfade=transition=fade:duration=1:offset=18[v]; \
    [0:a][1:a]acrossfade=d=1[a01]; \
    [a01][2:a]acrossfade=d=1[a]" \
  -map "[v]" -map "[a]" \
  -c:v libx264 -crf 18 -preset medium \
  -c:a aac -b:a 128k \
  output.mp4
```

> **offset 计算**：第一个 offset = video1_duration - transition_duration；第二个 offset = video1_duration + video2_duration - 2 * transition_duration

---

## 5. 音频提取/处理

### 5.1 提取音频

#### 提取为 MP3

```bash
ffmpeg -i input.mp4 -vn -c:a libmp3lame -q:a 2 output.mp3
```

> `-q:a` MP3 质量：0（最好，~245kbps）到 9（最差，~65kbps），推荐 2（~190kbps）

#### 提取为 AAC

```bash
ffmpeg -i input.mp4 -vn -c:a aac -b:a 256k output.m4a
```

#### 提取为 WAV（无损）

```bash
ffmpeg -i input.mp4 -vn -c:a pcm_s16le output.wav
```

#### 提取为 FLAC（无损压缩）

```bash
ffmpeg -i input.mp4 -vn -c:a flac output.flac
```

#### 直接复制音频流（不重新编码）

```bash
ffmpeg -i input.mp4 -vn -c:a copy output.aac
```

### 5.2 替换视频音轨

#### 用新音频替换原音轨

```bash
ffmpeg -i video.mp4 -i new_audio.mp3 \
  -c:v copy \
  -c:a aac -b:a 128k \
  -map 0:v:0 -map 1:a:0 \
  -shortest \
  output.mp4
```

#### 添加音轨（保留原音轨）

```bash
ffmpeg -i video.mp4 -i background_music.mp3 \
  -c:v copy \
  -filter_complex "[0:a][1:a]amix=inputs=2:duration=first:dropout_transition=3[a]" \
  -map 0:v -map "[a]" \
  -c:a aac -b:a 128k \
  output.mp4
```

#### 删除音轨（静音视频）

```bash
ffmpeg -i input.mp4 -c:v copy -an output.mp4
```

### 5.3 音量调节

#### 静态音量调节

```bash
# 音量加倍（2.0x）
ffmpeg -i input.mp4 -c:v copy -af "volume=2.0" -c:a aac -b:a 128k output.mp4

# 音量减半（0.5x）
ffmpeg -i input.mp4 -c:v copy -af "volume=0.5" -c:a aac -b:a 128k output.mp4

# 使用分贝值
ffmpeg -i input.mp4 -c:v copy -af "volume=3dB" -c:a aac -b:a 128k output.mp4
ffmpeg -i input.mp4 -c:v copy -af "volume=-5dB" -c:a aac -b:a 128k output.mp4
```

#### 音量标准化（loudnorm）

```bash
# EBU R128 标准化（推荐用于发布）
ffmpeg -i input.mp4 -c:v copy \
  -af "loudnorm=I=-16:LRA=11:TP=-1.5" \
  -c:a aac -b:a 128k \
  output.mp4
```

> `-I=-16` 目标响度 -16 LUFS（YouTube 推荐），`-LRA=11` 响度范围，`-TP=-1.5` 真峰值限制

### 5.4 音频淡入淡出

#### 淡入

```bash
# 前 3 秒淡入
ffmpeg -i input.mp4 -c:v copy \
  -af "afade=t=in:st=0:d=3" \
  -c:a aac -b:a 128k \
  output.mp4
```

#### 淡出

```bash
# 最后 3 秒淡出（假设音频总时长 120 秒）
ffmpeg -i input.mp4 -c:v copy \
  -af "afade=t=out:st=117:d=3" \
  -c:a aac -b:a 128k \
  output.mp4
```

#### 同时淡入淡出

```bash
ffmpeg -i input.mp4 -c:v copy \
  -af "afade=t=in:st=0:d=2,afade=t=out:st=118:d=2" \
  -c:a aac -b:a 128k \
  output.mp4
```

---

## 6. 加水印/文字

### 6.1 图片水印（overlay 滤镜）

#### 基本图片水印

```bash
ffmpeg -i input.mp4 -i watermark.png \
  -filter_complex "overlay=x=10:y=10" \
  -c:v libx264 -crf 18 -preset medium \
  -c:a copy \
  output.mp4
```

#### 水印位置 9 宫格预设

```
┌─────────────────────────────────┐
│ 左上         居中上        右上  │
│                                 │
│ 居中左        正中        居中右 │
│                                 │
│ 左下         居中下        右下  │
└─────────────────────────────────┘
```

| 位置 | overlay 参数 | 说明 |
|------|-------------|------|
| 左上 | `overlay=10:10` | 左上角，边距 10px |
| 居中上 | `overlay=(W-w)/2:10` | 顶部居中 |
| 右上 | `overlay=W-w-10:10` | 右上角 |
| 居中左 | `overlay=10:(H-h)/2` | 左侧居中 |
| 正中 | `overlay=(W-w)/2:(H-h)/2` | 完全居中 |
| 居中右 | `overlay=W-w-10:(H-h)/2` | 右侧居中 |
| 左下 | `overlay=10:H-h-10` | 左下角 |
| 居中下 | `overlay=(W-w)/2:H-h-10` | 底部居中 |
| 右下 | `overlay=W-w-10:H-h-10` | 右下角 |

> `W`/`H` 是底层视频的宽/高，`w`/`h` 是水印图片的宽/高。

#### 调整水印大小和透明度

```bash
# 缩放水印到 100px 宽（保持比例）+ 50% 透明度
ffmpeg -i input.mp4 -i watermark.png \
  -filter_complex "\
    [1:v]scale=100:-1,format=rgba,colorchannelmixer=aa=0.5[wm]; \
    [0:v][wm]overlay=W-w-10:H-h-10" \
  -c:v libx264 -crf 18 -preset medium \
  -c:a copy \
  output.mp4
```

> `colorchannelmixer=aa=0.5` 设置 alpha 通道为 50%。

#### 水印按视频百分比缩放

```bash
# 水印宽度为视频宽度的 15%
ffmpeg -i input.mp4 -i watermark.png \
  -filter_complex "\
    [1:v]scale=iw*0.15:-1[wm]; \
    [0:v][wm]overlay=W-w-10:H-h-10" \
  -c:v libx264 -crf 18 -preset medium \
  -c:a copy \
  output.mp4
```

### 6.2 文字水印（drawtext 滤镜）

#### 基本文字水印

```bash
ffmpeg -i input.mp4 \
  -vf "drawtext=text='Sample Text':fontsize=24:fontcolor=white:x=10:y=10" \
  -c:v libx264 -crf 18 -preset medium \
  -c:a copy \
  output.mp4
```

#### drawtext 常用参数

| 参数 | 说明 | 示例 |
|------|------|------|
| `text` | 文字内容 | `text='Hello World'` |
| `textfile` | 从文件读取文字 | `textfile=text.txt` |
| `fontfile` | 字体文件路径 | `fontfile=/path/to/font.ttf` |
| `fontsize` | 字体大小 | `fontsize=36` |
| `fontcolor` | 字体颜色 | `fontcolor=white` / `fontcolor=0xFFFFFF` |
| `fontcolor_expr` | 动态颜色 | 可用于颜色变化效果 |
| `x` / `y` | 文字位置 | `x=10:y=10` |
| `alpha` | 透明度（0-1） | `alpha=0.7` |
| `box` | 背景框 | `box=1` |
| `boxcolor` | 背景框颜色 | `boxcolor=black@0.5` |
| `boxborderw` | 背景框边距 | `boxborderw=5` |
| `borderw` | 文字描边宽度 | `borderw=2` |
| `bordercolor` | 文字描边颜色 | `bordercolor=black` |
| `shadowx/shadowy` | 阴影偏移 | `shadowx=2:shadowy=2` |
| `shadowcolor` | 阴影颜色 | `shadowcolor=black@0.5` |
| `line_spacing` | 行间距 | `line_spacing=5` |

#### 带背景框的文字

```bash
ffmpeg -i input.mp4 \
  -vf "drawtext=text='Watermark':fontsize=24:fontcolor=white:\
    box=1:boxcolor=black@0.5:boxborderw=10:\
    x=(w-text_w)/2:y=h-text_h-20" \
  -c:v libx264 -crf 18 -preset medium \
  -c:a copy \
  output.mp4
```

#### 带描边的文字

```bash
ffmpeg -i input.mp4 \
  -vf "drawtext=text='Watermark':fontsize=36:fontcolor=white:\
    borderw=2:bordercolor=black:\
    x=10:y=10" \
  -c:v libx264 -crf 18 -preset medium \
  -c:a copy \
  output.mp4
```

#### 动态文字（显示时间戳）

```bash
ffmpeg -i input.mp4 \
  -vf "drawtext=text='%{pts\\:hms}':fontsize=24:fontcolor=white:\
    box=1:boxcolor=black@0.5:boxborderw=5:\
    x=10:y=10" \
  -c:v libx264 -crf 18 -preset medium \
  -c:a copy \
  output.mp4
```

#### 显示当前日期时间

```bash
ffmpeg -i input.mp4 \
  -vf "drawtext=text='%{localtime\\:%Y-%m-%d %H\\:%M\\:%S}':fontsize=20:\
    fontcolor=white:x=10:y=10" \
  -c:v libx264 -crf 18 -preset medium \
  -c:a copy \
  output.mp4
```

#### 指定中文字体（macOS）

```bash
ffmpeg -i input.mp4 \
  -vf "drawtext=text='中文水印':fontfile=/System/Library/Fonts/PingFang.ttc:\
    fontsize=36:fontcolor=white:x=10:y=10" \
  -c:v libx264 -crf 18 -preset medium \
  -c:a copy \
  output.mp4
```

> macOS 中文字体路径：
> - PingFang: `/System/Library/Fonts/PingFang.ttc`
> - STHeiti: `/System/Library/Fonts/STHeiti Medium.ttc`
> - Songti: `/System/Library/Fonts/Supplemental/Songti.ttc`

### 6.3 文字位置 9 宫格预设（drawtext）

| 位置 | x/y 参数 |
|------|---------|
| 左上 | `x=10:y=10` |
| 居中上 | `x=(w-text_w)/2:y=10` |
| 右上 | `x=w-text_w-10:y=10` |
| 居中左 | `x=10:y=(h-text_h)/2` |
| 正中 | `x=(w-text_w)/2:y=(h-text_h)/2` |
| 居中右 | `x=w-text_w-10:y=(h-text_h)/2` |
| 左下 | `x=10:y=h-text_h-10` |
| 居中下 | `x=(w-text_w)/2:y=h-text_h-10` |
| 右下 | `x=w-text_w-10:y=h-text_h-10` |

> `w`/`h` 是视频宽/高，`text_w`/`text_h` 是文字宽/高。

---

## 7. 分辨率/帧率调整

### 7.1 scale 滤镜基本用法

#### 指定精确分辨率

```bash
ffmpeg -i input.mp4 \
  -vf "scale=1920:1080" \
  -c:v libx264 -crf 18 -preset medium \
  -c:a copy \
  output.mp4
```

#### 保持宽高比（-1 自动计算）

```bash
# 宽度设为 1280，高度自动
ffmpeg -i input.mp4 \
  -vf "scale=1280:-1" \
  -c:v libx264 -crf 18 -preset medium \
  -c:a copy \
  output.mp4
```

> **注意**：使用 `-1` 时可能得到奇数高度值，某些编码器不支持。使用 `-2` 确保为偶数：

```bash
# 确保高度为偶数
ffmpeg -i input.mp4 \
  -vf "scale=1280:-2" \
  -c:v libx264 -crf 18 -preset medium \
  -c:a copy \
  output.mp4
```

#### 使用 force_original_aspect_ratio

```bash
# decrease：缩小到不超过指定尺寸（适合限制最大分辨率）
ffmpeg -i input.mp4 \
  -vf "scale=1920:1080:force_original_aspect_ratio=decrease" \
  -c:v libx264 -crf 18 -preset medium \
  -c:a copy \
  output.mp4

# increase：放大到不小于指定尺寸
ffmpeg -i input.mp4 \
  -vf "scale=1920:1080:force_original_aspect_ratio=increase" \
  -c:v libx264 -crf 18 -preset medium \
  -c:a copy \
  output.mp4
```

#### 缩放并填充黑边（letterbox/pillarbox）

```bash
# 缩放到不超过 1920x1080，然后用黑边填充到精确 1920x1080
ffmpeg -i input.mp4 \
  -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black" \
  -c:v libx264 -crf 18 -preset medium \
  -c:a copy \
  output.mp4
```

#### 按百分比缩放

```bash
# 缩放到原尺寸的 50%
ffmpeg -i input.mp4 \
  -vf "scale=iw/2:ih/2" \
  -c:v libx264 -crf 18 -preset medium \
  -c:a copy \
  output.mp4
```

### 7.2 常用分辨率预设

| 名称 | 分辨率 | 宽高比 | 用途 |
|------|--------|--------|------|
| 4K UHD | 3840x2160 | 16:9 | 超高清 |
| 2K QHD | 2560x1440 | 16:9 | 高清游戏/显示器 |
| 1080p FHD | 1920x1080 | 16:9 | 全高清（最常用） |
| 720p HD | 1280x720 | 16:9 | 高清 |
| 480p SD | 854x480 | 16:9 | 标清 |
| 360p | 640x360 | 16:9 | 低画质预览 |
| 竖屏 1080p | 1080x1920 | 9:16 | 短视频（抖音等） |
| 竖屏 720p | 720x1280 | 9:16 | 短视频 |
| 正方形 1080 | 1080x1080 | 1:1 | Instagram |

#### 各分辨率预设命令

```bash
# 4K
ffmpeg -i input.mp4 -vf "scale=3840:2160:force_original_aspect_ratio=decrease,pad=3840:2160:(ow-iw)/2:(oh-ih)/2" ...

# 1080p
ffmpeg -i input.mp4 -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2" ...

# 720p
ffmpeg -i input.mp4 -vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2" ...

# 480p
ffmpeg -i input.mp4 -vf "scale=854:480:force_original_aspect_ratio=decrease,pad=854:480:(ow-iw)/2:(oh-ih)/2" ...
```

### 7.3 帧率调整

#### 使用 -r 参数

```bash
# 设置输出帧率为 24fps
ffmpeg -i input.mp4 \
  -r 24 \
  -c:v libx264 -crf 18 -preset medium \
  -c:a copy \
  output.mp4
```

#### 使用 fps 滤镜（更精确）

```bash
# 设置帧率为 30fps
ffmpeg -i input.mp4 \
  -vf "fps=30" \
  -c:v libx264 -crf 18 -preset medium \
  -c:a copy \
  output.mp4
```

#### 常见帧率

| 帧率 | 用途 |
|------|------|
| 24 fps | 电影标准 |
| 25 fps | PAL 电视标准 |
| 29.97 fps | NTSC 电视标准 |
| 30 fps | 通用（Web/社交媒体） |
| 50 fps | PAL 高帧率 |
| 59.94 fps | NTSC 高帧率 |
| 60 fps | 游戏/高帧率内容 |

#### 同时调整分辨率和帧率

```bash
ffmpeg -i input.mp4 \
  -vf "scale=1920:1080:force_original_aspect_ratio=decrease,fps=30" \
  -c:v libx264 -crf 18 -preset medium \
  -c:a copy \
  output.mp4
```

---

## 8. GIF 制作

### 8.1 基本 GIF 制作（一步法）

```bash
# 简单但质量一般
ffmpeg -i input.mp4 \
  -vf "fps=15,scale=480:-1" \
  -t 5 \
  output.gif
```

### 8.2 高质量 GIF（两步法，推荐）

#### 第一步：生成调色板

```bash
ffmpeg -i input.mp4 \
  -vf "fps=15,scale=480:-1:flags=lanczos,palettegen=stats_mode=diff" \
  -y palette.png
```

#### 第二步：使用调色板生成 GIF

```bash
ffmpeg -i input.mp4 -i palette.png \
  -lavfi "fps=15,scale=480:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=5" \
  -y output.gif
```

#### 一行命令合并（使用 filter_complex）

```bash
ffmpeg -i input.mp4 \
  -filter_complex "\
    fps=15,scale=480:-1:flags=lanczos,split[s0][s1]; \
    [s0]palettegen=stats_mode=diff[p]; \
    [s1][p]paletteuse=dither=bayer:bayer_scale=5" \
  -y output.gif
```

### 8.3 GIF 参数说明

#### palettegen 参数

| 参数 | 说明 | 推荐值 |
|------|------|--------|
| `max_colors` | 最大颜色数（2-256） | `256`（默认） |
| `stats_mode` | 统计模式 | `diff`（动画优化）/ `full`（全帧） |
| `reserve_transparent` | 保留透明色 | `0`（不需要透明）/ `1` |

#### paletteuse 参数

| 参数 | 说明 | 推荐值 |
|------|------|--------|
| `dither` | 抖动算法 | `bayer`（有图案）/ `sierra2_4a`（平滑） |
| `bayer_scale` | bayer 抖动强度（0-5） | `3`-`5` |
| `diff_mode` | 差异模式 | `rectangle`（可减小文件大小） |
| `new` | 每帧新建调色板 | `0`（默认）/ `1`（更好但更慢） |

### 8.4 控制 GIF 参数

#### 指定时间范围

```bash
# 从第 5 秒开始，截取 3 秒
ffmpeg -ss 5 -t 3 -i input.mp4 \
  -filter_complex "\
    fps=15,scale=480:-1:flags=lanczos,split[s0][s1]; \
    [s0]palettegen[p]; \
    [s1][p]paletteuse" \
  output.gif
```

#### 设置循环次数

```bash
# 0 = 无限循环（默认），1 = 播放一次，-1 = 不循环
ffmpeg -i input.mp4 \
  -filter_complex "fps=15,scale=480:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" \
  -loop 0 \
  output.gif
```

### 8.5 GIF 优化策略

#### 文件大小 vs 质量权衡

| 策略 | 参数调整 | 效果 |
|------|---------|------|
| 降低帧率 | `fps=10` 或 `fps=8` | 显著减小大小，画面略不流畅 |
| 降低分辨率 | `scale=320:-1` | 显著减小大小 |
| 减少颜色 | `palettegen=max_colors=128` | 减小大小，色彩可能偏差 |
| 使用差异模式 | `paletteuse=diff_mode=rectangle` | 稍微减小大小 |
| 缩短时长 | `-t 3` | 直接减小大小 |

#### 推荐的 GIF 尺寸/帧率组合

| 用途 | 分辨率 | 帧率 | 预期大小/秒 |
|------|--------|------|------------|
| 聊天表情 | 320x240 | 10 fps | ~200KB/s |
| 社交分享 | 480x270 | 12 fps | ~500KB/s |
| 教程演示 | 640x360 | 15 fps | ~1MB/s |
| 高质量 | 800x450 | 15 fps | ~2MB/s |

---

## 9. 字幕处理

### 9.1 查看字幕流信息

```bash
# 列出所有流，包括字幕
ffprobe -v quiet -print_format json -show_streams -select_streams s "input.mkv"
```

### 9.2 提取字幕流

#### 提取为 SRT

```bash
ffmpeg -i input.mkv -map 0:s:0 output.srt
```

#### 提取为 ASS/SSA

```bash
ffmpeg -i input.mkv -map 0:s:0 output.ass
```

#### 提取为 WebVTT

```bash
ffmpeg -i input.mkv -map 0:s:0 output.vtt
```

#### 提取指定语言的字幕

```bash
# 提取第 2 条字幕流（索引从 0 开始）
ffmpeg -i input.mkv -map 0:s:1 output.srt
```

### 9.3 添加外挂字幕（软字幕）

#### 添加 SRT 字幕到 MKV

```bash
ffmpeg -i input.mp4 -i subtitle.srt \
  -c:v copy -c:a copy -c:s srt \
  -map 0:v -map 0:a -map 1:s \
  output.mkv
```

#### 添加 ASS 字幕到 MKV

```bash
ffmpeg -i input.mp4 -i subtitle.ass \
  -c:v copy -c:a copy -c:s ass \
  -map 0:v -map 0:a -map 1:s \
  output.mkv
```

#### 添加多语言字幕

```bash
ffmpeg -i input.mp4 -i chinese.srt -i english.srt \
  -c:v copy -c:a copy \
  -c:s:0 srt -c:s:1 srt \
  -map 0:v -map 0:a -map 1:s -map 2:s \
  -metadata:s:s:0 language=chi \
  -metadata:s:s:1 language=eng \
  output.mkv
```

> **注意**：MP4 容器对字幕支持有限，建议使用 MKV。MP4 支持 `mov_text` 格式字幕。

#### 添加字幕到 MP4

```bash
ffmpeg -i input.mp4 -i subtitle.srt \
  -c:v copy -c:a copy -c:s mov_text \
  -map 0:v -map 0:a -map 1:s \
  output.mp4
```

### 9.4 烧录字幕到视频（硬字幕）

#### 烧录 SRT 字幕

```bash
ffmpeg -i input.mp4 \
  -vf "subtitles=subtitle.srt" \
  -c:v libx264 -crf 18 -preset medium \
  -c:a copy \
  output.mp4
```

#### 烧录 ASS 字幕（保留样式）

```bash
ffmpeg -i input.mp4 \
  -vf "ass=subtitle.ass" \
  -c:v libx264 -crf 18 -preset medium \
  -c:a copy \
  output.mp4
```

#### 烧录 MKV 内嵌字幕

```bash
# 使用视频文件内的第一条字幕流
ffmpeg -i input.mkv \
  -vf "subtitles=input.mkv:si=0" \
  -c:v libx264 -crf 18 -preset medium \
  -c:a copy \
  output.mp4
```

> `si=0` 指定字幕流索引。

#### 自定义烧录字幕样式

```bash
ffmpeg -i input.mp4 \
  -vf "subtitles=subtitle.srt:force_style='FontSize=24,FontName=PingFang SC,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,Outline=2,Shadow=1'" \
  -c:v libx264 -crf 18 -preset medium \
  -c:a copy \
  output.mp4
```

#### force_style 常用参数

| 参数 | 说明 | 示例值 |
|------|------|--------|
| `FontName` | 字体名称 | `PingFang SC`、`Arial` |
| `FontSize` | 字体大小 | `24` |
| `PrimaryColour` | 主要颜色（&HAABBGGRR） | `&H00FFFFFF`（白色） |
| `OutlineColour` | 描边颜色 | `&H00000000`（黑色） |
| `BackColour` | 背景颜色 | `&H80000000`（半透明黑） |
| `Outline` | 描边宽度 | `2` |
| `Shadow` | 阴影宽度 | `1` |
| `Bold` | 粗体 | `1`（是）/ `0`（否） |
| `Italic` | 斜体 | `1`（是）/ `0`（否） |
| `Alignment` | 对齐方式 | `2`（底部居中）、`8`（顶部居中） |
| `MarginV` | 垂直边距 | `20` |

> **颜色格式说明**：`&HAABBGGRR`，AA=透明度（00=不透明，FF=全透明），BB/GG/RR=蓝/绿/红。

### 9.5 字幕格式转换

#### SRT → ASS

```bash
ffmpeg -i subtitle.srt subtitle.ass
```

#### SRT → VTT

```bash
ffmpeg -i subtitle.srt subtitle.vtt
```

#### ASS → SRT

```bash
ffmpeg -i subtitle.ass subtitle.srt
```

---

## 10. 预设方案模板

### 10.1 社交媒体优化

```bash
ffmpeg -i input.mp4 \
  -c:v libx264 -crf 23 -preset medium \
  -profile:v high -level 4.1 \
  -vf "scale='min(1920,iw)':'min(1080,ih)':force_original_aspect_ratio=decrease" \
  -b:v 4M -maxrate 6M -bufsize 8M \
  -r 30 \
  -c:a aac -b:a 128k -ar 44100 \
  -movflags +faststart \
  -pix_fmt yuv420p \
  output.mp4
```

**特点**：广泛兼容、适中文件大小、Web 快速加载。

### 10.2 高质量归档

```bash
ffmpeg -i input.mp4 \
  -c:v libx264 -crf 16 -preset slow \
  -profile:v high \
  -g 250 -bf 3 \
  -c:a flac \
  -movflags +faststart \
  output.mkv
```

**特点**：接近无损画质、无损音频、文件较大。

### 10.3 快速预览

```bash
ffmpeg -i input.mp4 \
  -c:v h264_videotoolbox -b:v 2M \
  -vf "scale=854:480:force_original_aspect_ratio=decrease" \
  -r 24 \
  -c:a aac -b:a 96k \
  -movflags +faststart \
  output_preview.mp4
```

**特点**：硬件加速、快速生成、小文件用于预览。

### 10.4 微信朋友圈优化（限制 25MB）

```bash
# 先获取时长，计算码率
DURATION=$(ffprobe -v quiet -show_entries format=duration -of csv=p=0 "input.mp4")
# 目标 20MB（留余量），音频 64kbps
VIDEO_BITRATE=$(echo "(20 * 8192 / $DURATION) - 64" | bc)

ffmpeg -i input.mp4 \
  -c:v libx264 -b:v ${VIDEO_BITRATE}k -preset medium \
  -vf "scale='min(960,iw)':'min(544,ih)':force_original_aspect_ratio=decrease" \
  -r 30 \
  -c:a aac -b:a 64k -ar 44100 \
  -movflags +faststart \
  -pix_fmt yuv420p \
  -t 30 \
  output_moments.mp4
```

### 10.5 音频播客/有声书

```bash
ffmpeg -i input.mp4 \
  -vn \
  -c:a libmp3lame -q:a 4 \
  -af "loudnorm=I=-16:LRA=11:TP=-1.5" \
  -ar 44100 -ac 1 \
  output_podcast.mp3
```

**特点**：单声道、音量标准化、适中码率。

### 10.6 4K 到 1080p 降采样

```bash
ffmpeg -i input_4k.mp4 \
  -vf "scale=1920:1080:flags=lanczos" \
  -c:v libx264 -crf 18 -preset slow \
  -c:a copy \
  -movflags +faststart \
  output_1080p.mp4
```

**特点**：Lanczos 缩放算法、高质量降采样。

### 10.7 竖屏短视频（抖音/快手/Reels）

```bash
ffmpeg -i input.mp4 \
  -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black" \
  -c:v libx264 -crf 20 -preset medium \
  -profile:v high -level 4.2 \
  -r 30 \
  -c:a aac -b:a 128k -ar 44100 \
  -movflags +faststart \
  -pix_fmt yuv420p \
  output_vertical.mp4
```

### 10.8 Web 优化（低带宽）

```bash
ffmpeg -i input.mp4 \
  -c:v libx264 -crf 28 -preset medium \
  -vf "scale='min(1280,iw)':'min(720,ih)':force_original_aspect_ratio=decrease" \
  -b:v 1M -maxrate 1.5M -bufsize 2M \
  -r 24 \
  -c:a aac -b:a 96k -ar 44100 -ac 2 \
  -movflags +faststart \
  -pix_fmt yuv420p \
  output_web.mp4
```

### 10.9 无损裁剪（快速剪切）

```bash
ffmpeg -ss <start> -to <end> -i input.mp4 \
  -c copy \
  -avoid_negative_ts make_zero \
  output_cut.mp4
```

### 10.10 批量缩略图提取

```bash
# 每 10 秒提取一帧作为缩略图
ffmpeg -i input.mp4 \
  -vf "fps=1/10,scale=320:-1" \
  -q:v 2 \
  thumbnail_%03d.jpg
```

```bash
# 提取单帧缩略图（指定时间点）
ffmpeg -ss 00:00:10 -i input.mp4 \
  -vframes 1 -q:v 2 \
  thumbnail.jpg
```

---

## 附录：常见问题与注意事项

### A. 像素格式兼容性

大多数播放器只支持 `yuv420p`。编码时建议始终添加：

```bash
-pix_fmt yuv420p
```

### B. MP4 Web 优化

始终使用 `-movflags +faststart`，将元数据（moov atom）移到文件开头，支持 Web 流式播放。

### C. 避免常见错误

1. **奇数分辨率**：libx264 要求宽高为偶数，使用 `-2` 代替 `-1`
2. **音视频不同步**：使用 `-async 1` 或 `-vsync cfr` 修复
3. **颜色空间问题**：使用 `-colorspace bt709 -color_primaries bt709 -color_trc bt709` 统一色彩空间
4. **编码器不支持的格式**：先用 `-pix_fmt yuv420p` 转换像素格式

### D. 特殊字符转义

在 ffmpeg 滤镜中，特殊字符需要转义：

| 字符 | 转义方式 |
|------|---------|
| `:` | `\\:` |
| `'` | `\\'` 或用双引号包裹 |
| `\` | `\\\\` |
| `%` | `%%` |
| `;` | `\\;` |

### E. HEVC/H.265 Apple 兼容性

在输出 H.265 MP4 时，必须添加 `-tag:v hvc1` 以确保 Apple 设备能正确识别和播放：

```bash
-c:v libx265 -tag:v hvc1
```

### F. 硬件加速决策指南

| 场景 | 推荐方案 | 原因 |
|------|---------|------|
| 快速转码/预览 | VideoToolbox | 速度优先 |
| 最终发布 | libx264 + CRF | 质量优先 |
| 高效率归档 | libx265 + CRF | 压缩比优先 |
| Web 播放 | libvpx-vp9 | 开放格式 |
| 专业编辑 | ProRes (VT) | 编辑友好 |
| 批量处理 | VideoToolbox | CPU 资源节省 |
