# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-02-08

### Added

- **格式转换** — 支持 MP4 / MKV / MOV / WebM / AVI / TS / FLV 互转，内置社交媒体、网页优化、高质量存档等预设
- **视频压缩** — 轻度 / 中度 / 重度三档预设，支持按质量等级压缩
- **裁剪剪切** — 可视化时间轴选择器，支持多段截取
- **合并拼接** — 拖拽排序多个视频，一键合并
- **音频处理** — 提取音频（MP3/AAC/WAV/FLAC/OGG）、替换配音、调节音量
- **加水印** — 文字水印 & 图片水印，自定义位置、大小、透明度
- **分辨率调整** — 4K/2K/1080p/720p/480p/360p 预设，支持 Lanczos/Bicubic/Bilinear 缩放算法
- **GIF 制作** — 视频片段转 GIF，支持帧率、宽度、抖动算法调整
- **字幕处理** — 嵌入 SRT/ASS/VTT 字幕、提取字幕、调整时间轴偏移
- **视频下载** — 从 YouTube / X (Twitter) / Instagram 等平台下载视频，自动合并最佳音视频流
- **设置系统** — 自定义输出目录、FFmpeg 路径、主题切换
- **暗色模式** — 支持浅色 / 深色主题切换

### Technical

- 基于 Tauri 2 + React 19 + TypeScript 构建
- FFmpeg / FFprobe / yt-dlp 作为 Sidecar 二进制文件打包
- Zustand 状态管理
- Tailwind CSS + Radix UI 组件库
- 支持 macOS (Apple Silicon)

[0.1.0]: https://github.com/yummysource/clipforge/releases/tag/v0.1.0
