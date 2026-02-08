<p align="center">
  <img src="../src-tauri/icons/icon.png" width="128" height="128" alt="ClipForge Logo">
</p>

<h1 align="center">ClipForge</h1>

<p align="center">
  <strong>专业的桌面视频处理工具箱</strong><br>
  基于 FFmpeg + yt-dlp，提供格式转换、压缩、裁剪、合并、下载等一站式视频处理能力
</p>

<p align="center">
  <a href="https://github.com/yummysource/clipforge/releases"><img src="https://img.shields.io/github/v/release/yummysource/clipforge?color=blue" alt="Release"></a>
  <img src="https://img.shields.io/badge/platform-macOS-lightgrey" alt="Platform">
  <img src="https://img.shields.io/badge/arch-Apple%20Silicon-orange" alt="Architecture">
  <a href="../LICENSE"><img src="https://img.shields.io/github/license/yummysource/clipforge" alt="License"></a>
</p>

<p align="center">
  <a href="../README.md">🇬🇧 English</a>
</p>

---

<p align="center">
  <img src="screenshots/homepage.png" width="800" alt="ClipForge 首页">
</p>

## 功能特性

| 功能 | 说明 |
|------|------|
| **格式转换** | 支持 MP4 / MKV / MOV / WebM / AVI / TS / FLV 等主流格式互转 |
| **视频压缩** | 轻度 / 中度 / 重度三档预设，按质量或目标体积压缩 |
| **裁剪剪切** | 可视化时间轴选择，支持多段截取 |
| **合并拼接** | 多个视频拖拽排序，一键合并 |
| **音频处理** | 提取音频、替换配音、调节音量 |
| **加水印** | 支持文字水印和图片水印，自定义位置与透明度 |
| **分辨率调整** | 4K / 2K / 1080p / 720p 等预设，自定义宽高和缩放算法 |
| **GIF 制作** | 视频片段转 GIF 动图，支持帧率和抖动算法调整 |
| **字幕处理** | 嵌入 SRT/ASS/VTT 字幕、提取字幕、调整时间轴 |
| **视频下载** | 从 YouTube / X (Twitter) / Instagram 等平台下载视频 |

<details>
<summary>更多截图</summary>

**格式转换**

<img src="screenshots/convert.png" width="800" alt="格式转换">

**视频下载**

<img src="screenshots/download.png" width="800" alt="视频下载">

</details>

## 技术栈

- **前端**: React 19 + TypeScript + Tailwind CSS + Radix UI
- **后端**: Rust + Tauri 2
- **核心引擎**: FFmpeg / FFprobe (Sidecar)
- **下载引擎**: yt-dlp (Sidecar)
- **状态管理**: Zustand

## 安装

### 下载安装包

前往 [Releases](https://github.com/yummysource/clipforge/releases) 下载最新版本的 `.dmg` 安装包。

> 当前仅支持 **macOS (Apple Silicon)**。

### macOS 安全提示

首次打开时 macOS 可能提示"无法验证开发者"，请执行：

```bash
xattr -cr /Applications/ClipForge.app
```

## 从源码构建

### 前置条件

- [Node.js](https://nodejs.org/) >= 18
- [Rust](https://rustup.rs/) >= 1.70
- [FFmpeg](https://ffmpeg.org/)（需放置到 `src-tauri/` 目录作为 sidecar）
- [yt-dlp](https://github.com/yt-dlp/yt-dlp)（需放置到 `src-tauri/` 目录作为 sidecar）

### 构建步骤

```bash
# 克隆仓库
git clone https://github.com/yummysource/clipforge.git
cd clipforge

# 安装前端依赖
npm install

# 开发模式
npm run tauri dev

# 构建安装包
npm run tauri build
```

### Sidecar 二进制文件

Tauri sidecar 要求二进制文件按平台命名并放在 `src-tauri/` 目录下：

```
src-tauri/
├── ffmpeg-aarch64-apple-darwin
├── ffprobe-aarch64-apple-darwin
└── yt-dlp-aarch64-apple-darwin
```

> 这些二进制文件体积较大，不包含在 Git 仓库中。构建前请自行下载对应平台的二进制文件。

## 项目结构

```
src/                          # React 前端
├── components/               # 通用组件（DropZone, FileList, VideoPreview ...）
├── pages/                    # 功能页面（10 个功能 + 设置页）
├── hooks/                    # 自定义 Hooks
├── services/                 # Tauri invoke 封装
├── stores/                   # Zustand 状态管理
├── types/                    # TypeScript 类型定义
└── lib/                      # 工具函数与常量

src-tauri/                    # Rust 后端
├── src/commands/             # Tauri IPC 命令
├── src/engine/               # FFmpeg 进程管理与参数构建
├── src/models/               # 数据模型
└── src/utils/                # 工具模块
```

## 常见问题

<details>
<summary><strong>为什么只支持 macOS (Apple Silicon)？</strong></summary>

ClipForge 将 FFmpeg、FFprobe、yt-dlp 作为 Tauri sidecar 打包。当前版本仅包含 `aarch64-apple-darwin` 二进制文件。Windows 和 Linux 支持计划在未来版本中添加。

</details>

<details>
<summary><strong>需要什么版本的 FFmpeg？</strong></summary>

内置的 FFmpeg 为 8.x 版本。如果从源码构建，建议使用 FFmpeg 6.0+，并确保包含 H.264/H.265/VP9/AV1 编码器支持。

</details>

<details>
<summary><strong>会支持 Intel Mac 吗？</strong></summary>

Intel Mac（`x86_64-apple-darwin`）从技术上完全可行，只需提供对应的 sidecar 二进制文件。欢迎社区贡献。

</details>

<details>
<summary><strong>视频下载很慢或者失败？</strong></summary>

视频下载依赖 yt-dlp 和网络连接。请确保网络稳定。部分平台在某些地区可能需要 VPN。

</details>

<details>
<summary><strong>输出文件保存在哪里？</strong></summary>

默认情况下，输出文件保存在源文件同目录，文件名添加 `_output` 后缀。可以在「设置」中修改输出目录和后缀。

</details>

## 参与贡献

欢迎贡献！请阅读 [CONTRIBUTING.md](../CONTRIBUTING.md) 了解贡献指南。

## 更新日志

详见 [CHANGELOG.md](../CHANGELOG.md)。

## 许可证

[MIT License](../LICENSE)
