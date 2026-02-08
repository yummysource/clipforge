# ClipForge — 系统架构设计文档

> 基于 Tauri 2.0 + React 的 macOS ffmpeg UI 应用
>
> 设计日期：2026-02-08
> 版本：v1.0

---

## 目录

1. [整体架构概览](#1-整体架构概览)
2. [项目目录结构](#2-项目目录结构)
3. [Rust 后端架构](#3-rust-后端架构)
4. [React 前端架构](#4-react-前端架构)
5. [数据流设计](#5-数据流设计)
6. [核心模块详细设计](#6-核心模块详细设计)
7. [第三方依赖清单](#7-第三方依赖清单)
8. [开发与构建流程](#8-开发与构建流程)

---

## 1. 整体架构概览

### 1.1 架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        ClipForge 应用                           │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    React 前端 (WebView)                    │  │
│  │                                                           │  │
│  │  ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌───────────┐ │  │
│  │  │  首页    │  │ 功能页面 │  │ 状态管理 │  │  UI 组件  │ │  │
│  │  │ 卡片网格│  │ (9个)    │  │ (Zustand) │  │(shadcn/ui)│ │  │
│  │  └─────────┘  └──────────┘  └──────────┘  └───────────┘ │  │
│  │                      │                                    │  │
│  │              invoke() │ Channel                           │  │
│  └──────────────────────┼────────────────────────────────────┘  │
│                         │                                       │
│  ┌──────────────────────┼────────────────────────────────────┐  │
│  │                 Tauri Rust 后端                             │  │
│  │                      │                                     │  │
│  │  ┌──────────────┐  ┌┴─────────────┐  ┌─────────────────┐ │  │
│  │  │  命令处理器  │  │  事件/Channel │  │   配置管理器    │ │  │
│  │  │  (Commands)  │  │  (Progress)   │  │   (Settings)    │ │  │
│  │  └──────┬───────┘  └──────────────┘  └─────────────────┘ │  │
│  │         │                                                  │  │
│  │  ┌──────┴───────────────────────────────────────────────┐ │  │
│  │  │              ffmpeg 任务引擎                           │ │  │
│  │  │                                                       │ │  │
│  │  │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │ │  │
│  │  │  │ 命令构建 │  │ 进程管理 │  │   任务队列       │   │ │  │
│  │  │  │ (Builder) │  │ (Process)│  │   (Queue)        │   │ │  │
│  │  │  └──────────┘  └──────────┘  └──────────────────┘   │ │  │
│  │  │                                                       │ │  │
│  │  │  ┌──────────┐  ┌──────────┐                          │ │  │
│  │  │  │ 进度解析 │  │ 预设管理 │                          │ │  │
│  │  │  │ (Parser) │  │ (Presets)│                          │ │  │
│  │  │  └──────────┘  └──────────┘                          │ │  │
│  │  └──────────────────────────────────────────────────────┘ │  │
│  │                      │                                     │  │
│  └──────────────────────┼─────────────────────────────────────┘  │
│                         │                                       │
│  ┌──────────────────────┼─────────────────────────────────────┐  │
│  │              Sidecar 二进制文件                              │  │
│  │         ┌────────────┴────────────┐                        │  │
│  │         │   ffmpeg    │  ffprobe  │                        │  │
│  │         └─────────────┴───────────┘                        │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 技术栈总结

| 层级 | 技术选型 | 版本 |
|-----|---------|------|
| 应用框架 | Tauri | 2.10.x |
| 前端框架 | React | 19.x |
| 类型系统 | TypeScript | 5.x |
| 构建工具 | Vite | 6.x |
| UI 组件库 | shadcn/ui + Radix UI | latest |
| CSS 框架 | Tailwind CSS | 4.x |
| 状态管理 | Zustand | 5.x |
| 路由 | React Router | 7.x |
| 后端语言 | Rust | stable |
| 多媒体引擎 | ffmpeg / ffprobe | 7.x+ (静态编译) |

### 1.3 核心设计原则

1. **前端轻量，后端驱动**：ffmpeg 命令构建和进程管理全部在 Rust 后端完成，前端只负责 UI 交互和参数收集
2. **预设优先**：每个功能提供开箱即用的预设方案，降低使用门槛
3. **批量并行**：任务队列支持多文件批量处理，可配置并发数
4. **实时反馈**：通过 Tauri Channel 实现毫秒级进度推送
5. **类型安全**：前后端共享类型定义，Rust 端使用 serde 序列化，前端使用 TypeScript 接口

---

## 2. 项目目录结构

```
clipforge/
├── package.json                    # 前端依赖和脚本
├── tsconfig.json                   # TypeScript 配置
├── vite.config.ts                  # Vite 构建配置
├── tailwind.config.ts              # Tailwind CSS 配置
├── components.json                 # shadcn/ui 配置
├── index.html                      # 前端入口 HTML
│
├── src/                            # ========== React 前端 ==========
│   ├── main.tsx                    # React 应用入口
│   ├── App.tsx                     # 根组件（路由配置）
│   │
│   ├── components/                 # UI 组件
│   │   ├── ui/                     # shadcn/ui 基础组件（button, dialog, slider...）
│   │   ├── layout/                 # 布局组件
│   │   │   ├── AppLayout.tsx       # 应用主布局
│   │   │   ├── PageHeader.tsx      # 页面头部（面包屑+标题）
│   │   │   └── StatusBar.tsx       # 底部状态栏
│   │   ├── shared/                 # 共享业务组件
│   │   │   ├── DropZone.tsx        # 文件拖拽区域
│   │   │   ├── FileList.tsx        # 文件列表
│   │   │   ├── VideoPreview.tsx    # 视频预览播放器
│   │   │   ├── FileInfo.tsx        # 文件信息面板
│   │   │   ├── PresetSelector.tsx  # 预设选择器
│   │   │   ├── ProgressPanel.tsx   # 进度面板（单文件+批量）
│   │   │   └── TimelineSelector.tsx # 时间轴选择器（裁剪/GIF 复用）
│   │   └── features/               # 功能特定组件
│   │       ├── watermark/          # 水印定位器等
│   │       ├── merge/              # 拖拽排序列表等
│   │       └── subtitle/           # 字幕编辑器等
│   │
│   ├── pages/                      # 页面组件
│   │   ├── HomePage.tsx            # 首页（9 宫格卡片）
│   │   ├── ConvertPage.tsx         # 格式转换
│   │   ├── CompressPage.tsx        # 视频压缩
│   │   ├── TrimPage.tsx            # 裁剪剪切
│   │   ├── MergePage.tsx           # 合并拼接
│   │   ├── AudioPage.tsx           # 音频处理
│   │   ├── WatermarkPage.tsx       # 加水印
│   │   ├── ResizePage.tsx          # 分辨率/帧率调整
│   │   ├── GifPage.tsx             # GIF 制作
│   │   ├── SubtitlePage.tsx        # 字幕处理
│   │   └── SettingsPage.tsx        # 设置页面
│   │
│   ├── hooks/                      # 自定义 Hooks
│   │   ├── useFileDrop.ts          # 文件拖拽监听
│   │   ├── useMediaInfo.ts         # 获取媒体信息
│   │   ├── useTask.ts              # 任务执行与进度
│   │   ├── useBatchTask.ts         # 批量任务管理
│   │   ├── useVideoPlayer.ts       # 视频播放器控制
│   │   └── useDarkMode.ts          # 暗色模式检测
│   │
│   ├── stores/                     # Zustand 状态管理
│   │   ├── useAppStore.ts          # 全局应用状态
│   │   ├── useTaskStore.ts         # 任务队列状态
│   │   └── useSettingsStore.ts     # 用户设置状态
│   │
│   ├── services/                   # Tauri 后端调用封装
│   │   ├── ffmpeg.ts               # ffmpeg 操作（转码、压缩、裁剪...）
│   │   ├── ffprobe.ts              # 媒体信息获取
│   │   ├── files.ts                # 文件操作（对话框、路径处理）
│   │   └── settings.ts             # 设置读写
│   │
│   ├── types/                      # TypeScript 类型定义
│   │   ├── media.ts                # 媒体信息类型
│   │   ├── task.ts                 # 任务类型
│   │   ├── presets.ts              # 预设类型
│   │   └── settings.ts             # 设置类型
│   │
│   ├── lib/                        # 工具函数
│   │   ├── format.ts               # 格式化工具（时间、文件大小...）
│   │   ├── validators.ts           # 参数验证
│   │   └── constants.ts            # 常量定义（预设列表、格式列表...）
│   │
│   └── styles/                     # 全局样式
│       ├── globals.css             # 全局样式 + CSS 变量（主题）
│       └── animations.css          # 动画定义
│
├── src-tauri/                      # ========== Tauri Rust 后端 ==========
│   ├── Cargo.toml                  # Rust 依赖
│   ├── Cargo.lock                  # 依赖锁定
│   ├── build.rs                    # 构建脚本
│   ├── tauri.conf.json             # Tauri 主配置
│   │
│   ├── src/
│   │   ├── main.rs                 # 应用入口
│   │   ├── lib.rs                  # 核心库（注册 commands、plugins）
│   │   │
│   │   ├── commands/               # Tauri Commands（前端可调用的接口）
│   │   │   ├── mod.rs              # 导出所有 commands
│   │   │   ├── media_info.rs       # 获取媒体信息 command
│   │   │   ├── convert.rs          # 格式转换 command
│   │   │   ├── compress.rs         # 视频压缩 command
│   │   │   ├── trim.rs             # 裁剪剪切 command
│   │   │   ├── merge.rs            # 合并拼接 command
│   │   │   ├── audio.rs            # 音频处理 command
│   │   │   ├── watermark.rs        # 加水印 command
│   │   │   ├── resize.rs           # 分辨率帧率 command
│   │   │   ├── gif.rs              # GIF 制作 command
│   │   │   ├── subtitle.rs         # 字幕处理 command
│   │   │   ├── task.rs             # 任务管理 command（取消、暂停）
│   │   │   └── settings.rs         # 设置管理 command
│   │   │
│   │   ├── engine/                 # ffmpeg 任务引擎
│   │   │   ├── mod.rs              # 引擎模块导出
│   │   │   ├── builder.rs          # ffmpeg 命令构建器
│   │   │   ├── process.rs          # ffmpeg 进程管理（启动、监控、终止）
│   │   │   ├── progress.rs         # 进度解析器（解析 -progress 输出）
│   │   │   ├── queue.rs            # 任务队列（批量处理调度）
│   │   │   └── presets.rs          # 预设方案管理
│   │   │
│   │   ├── models/                 # 数据模型
│   │   │   ├── mod.rs
│   │   │   ├── media.rs            # 媒体信息结构体
│   │   │   ├── task.rs             # 任务状态结构体
│   │   │   ├── preset.rs           # 预设结构体
│   │   │   └── settings.rs         # 设置结构体
│   │   │
│   │   └── utils/                  # 工具函数
│   │       ├── mod.rs
│   │       ├── path.rs             # 路径处理
│   │       └── time.rs             # 时间格式解析
│   │
│   ├── binaries/                   # ffmpeg/ffprobe 静态二进制文件
│   │   ├── ffmpeg-aarch64-apple-darwin
│   │   ├── ffmpeg-x86_64-apple-darwin
│   │   ├── ffprobe-aarch64-apple-darwin
│   │   └── ffprobe-x86_64-apple-darwin
│   │
│   ├── icons/                      # 应用图标
│   │   ├── icon.icns               # macOS 图标
│   │   ├── icon.png
│   │   ├── 32x32.png
│   │   ├── 128x128.png
│   │   └── 128x128@2x.png
│   │
│   └── capabilities/               # Tauri 权限配置
│       └── default.json
│
├── docs/                           # 文档
│   ├── research/                   # 调研文档
│   │   ├── tauri-tech-research.md
│   │   ├── ffmpeg-commands-reference.md
│   │   └── ui-design-proposal.md
│   └── design/                     # 设计文档
│       └── system-architecture.md  # 本文档
│
└── scripts/                        # 构建脚本
    └── download-ffmpeg.sh          # 下载 ffmpeg 静态二进制文件
```

---

## 3. Rust 后端架构

### 3.1 模块职责划分

```
lib.rs（入口）
  ├── commands/         → 接收前端调用，参数校验，调用 engine
  ├── engine/           → 核心业务逻辑，ffmpeg 命令构建和进程管理
  ├── models/           → 数据结构定义，serde 序列化/反序列化
  └── utils/            → 通用工具函数
```

### 3.2 Commands 层设计

每个功能对应一个 command 文件，遵循统一模式：

```rust
/// 格式转换 command 示例
///
/// 接收前端传来的转换参数，构建 ffmpeg 命令并执行
/// 通过 Channel 实时推送转码进度
#[tauri::command]
async fn convert_video(
    app: tauri::AppHandle,
    params: ConvertParams,          // 转换参数（输入路径、输出格式、编码器等）
    on_progress: Channel<TaskEvent>, // 进度回调通道
) -> Result<TaskResult, String> {
    // 1. 验证参数
    // 2. 通过 engine::builder 构建 ffmpeg 命令
    // 3. 通过 engine::process 启动进程
    // 4. 通过 engine::progress 解析进度并推送到 Channel
    // 5. 返回执行结果
}
```

### 3.3 Engine 层设计

#### 3.3.1 命令构建器 (builder.rs)

```rust
/// ffmpeg 命令构建器
///
/// 使用 Builder 模式构建 ffmpeg 命令行参数
/// 每个功能对应一组预定义的参数模板
pub struct FfmpegCommand {
    /// ffmpeg 二进制路径（sidecar 路径）
    binary: String,
    /// 输入文件列表
    inputs: Vec<InputFile>,
    /// 输出文件路径
    output: String,
    /// 视频编码参数
    video_codec: Option<VideoCodecConfig>,
    /// 音频编码参数
    audio_codec: Option<AudioCodecConfig>,
    /// 滤镜链
    filters: Vec<String>,
    /// 额外参数
    extra_args: Vec<String>,
}

impl FfmpegCommand {
    /// 创建新的命令构建器
    pub fn new() -> Self { ... }

    /// 添加输入文件
    pub fn input(mut self, path: &str) -> Self { ... }

    /// 设置视频编码器
    pub fn video_codec(mut self, config: VideoCodecConfig) -> Self { ... }

    /// 设置音频编码器
    pub fn audio_codec(mut self, config: AudioCodecConfig) -> Self { ... }

    /// 添加视频滤镜
    pub fn video_filter(mut self, filter: &str) -> Self { ... }

    /// 设置输出路径
    pub fn output(mut self, path: &str) -> Self { ... }

    /// 构建为参数数组
    pub fn build(self) -> Vec<String> { ... }
}
```

为每个功能提供便捷构建函数：

```rust
/// 构建格式转换命令
pub fn build_convert_command(params: &ConvertParams) -> Vec<String> { ... }

/// 构建视频压缩命令
pub fn build_compress_command(params: &CompressParams) -> Vec<String> { ... }

/// 构建视频裁剪命令
pub fn build_trim_command(params: &TrimParams) -> Vec<String> { ... }

/// 构建视频合并命令（自动选择 concat demuxer 或 filter）
pub fn build_merge_command(params: &MergeParams) -> Vec<String> { ... }

// ... 其余功能类似
```

#### 3.3.2 进程管理器 (process.rs)

```rust
/// ffmpeg 进程管理器
///
/// 负责启动、监控和终止 ffmpeg 子进程
/// 支持通过 Channel 实时推送进度事件
pub struct FfmpegProcess {
    /// Tauri app handle（用于获取 sidecar 路径）
    app: AppHandle,
    /// 子进程 handle（用于终止进程）
    child: Option<CommandChild>,
    /// 任务唯一标识
    task_id: String,
}

impl FfmpegProcess {
    /// 启动 ffmpeg 进程并监听输出
    ///
    /// 使用 Tauri shell 插件的 sidecar 模式启动 ffmpeg
    /// 通过 spawn 获取 stdout/stderr 事件流
    pub async fn start(
        &mut self,
        args: Vec<String>,
        total_duration: f64,
        on_progress: Channel<TaskEvent>,
    ) -> Result<(), String> { ... }

    /// 终止 ffmpeg 进程
    pub fn cancel(&mut self) -> Result<(), String> { ... }
}
```

#### 3.3.3 进度解析器 (progress.rs)

```rust
/// 解析 ffmpeg -progress pipe:1 的输出
///
/// ffmpeg 以 key=value 格式输出进度信息
/// 每组以 progress=continue 或 progress=end 结尾
pub struct ProgressParser {
    /// 视频总时长（微秒），用于计算百分比
    total_duration_us: i64,
    /// 上次推送时间（避免过于频繁推送）
    last_emit_time: Instant,
}

impl ProgressParser {
    /// 解析一行 progress 输出
    ///
    /// 从 out_time_us 和 speed 字段计算进度百分比和预估剩余时间
    pub fn parse_line(&mut self, line: &str) -> Option<ProgressUpdate> { ... }
}

/// 进度更新数据
#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ProgressUpdate {
    /// 进度百分比 (0.0 - 100.0)
    pub percent: f64,
    /// 处理速度 (如 2.5x)
    pub speed: f64,
    /// 已处理时间（秒）
    pub current_time: f64,
    /// 预估剩余时间（秒）
    pub eta: f64,
    /// 当前输出文件大小（字节）
    pub output_size: u64,
    /// 当前帧数
    pub frame: u64,
    /// 当前 fps
    pub fps: f64,
}
```

#### 3.3.4 任务队列 (queue.rs)

```rust
/// 批量处理任务队列
///
/// 管理多个 ffmpeg 任务的排队和并发执行
/// 支持暂停、取消、重试操作
pub struct TaskQueue {
    /// 最大并发数（默认 1，可配置）
    max_concurrent: usize,
    /// 等待中的任务
    pending: VecDeque<Task>,
    /// 执行中的任务（task_id → FfmpegProcess）
    running: HashMap<String, FfmpegProcess>,
    /// 已完成的任务
    completed: Vec<TaskResult>,
}

impl TaskQueue {
    /// 添加任务到队列
    pub fn enqueue(&mut self, task: Task) -> String { ... }

    /// 取消指定任务
    pub fn cancel_task(&mut self, task_id: &str) -> Result<(), String> { ... }

    /// 取消所有任务
    pub fn cancel_all(&mut self) -> Result<(), String> { ... }

    /// 调度下一个待执行任务
    async fn schedule_next(&mut self) { ... }
}
```

### 3.4 数据模型设计 (models/)

```rust
// ===== media.rs =====

/// 媒体文件完整信息（从 ffprobe 解析）
#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct MediaInfo {
    /// 文件路径
    pub file_path: String,
    /// 文件名
    pub file_name: String,
    /// 文件大小（字节）
    pub file_size: u64,
    /// 容器格式名称
    pub format_name: String,
    /// 总时长（秒）
    pub duration: f64,
    /// 总码率（bps）
    pub bitrate: u64,
    /// 视频流信息列表
    pub video_streams: Vec<VideoStream>,
    /// 音频流信息列表
    pub audio_streams: Vec<AudioStream>,
    /// 字幕流信息列表
    pub subtitle_streams: Vec<SubtitleStream>,
}

/// 视频流信息
#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct VideoStream {
    /// 流索引
    pub index: u32,
    /// 编解码器名称（如 h264, hevc）
    pub codec_name: String,
    /// 宽度（像素）
    pub width: u32,
    /// 高度（像素）
    pub height: u32,
    /// 帧率（浮点数）
    pub frame_rate: f64,
    /// 码率（bps）
    pub bitrate: Option<u64>,
    /// 像素格式
    pub pix_fmt: String,
}

/// 音频流信息
#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AudioStream {
    /// 流索引
    pub index: u32,
    /// 编解码器名称（如 aac, mp3）
    pub codec_name: String,
    /// 采样率（Hz）
    pub sample_rate: u32,
    /// 声道数
    pub channels: u32,
    /// 码率（bps）
    pub bitrate: Option<u64>,
}

/// 字幕流信息
#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SubtitleStream {
    /// 流索引
    pub index: u32,
    /// 编解码器名称（如 srt, ass）
    pub codec_name: String,
    /// 语言标签
    pub language: Option<String>,
}

// ===== task.rs =====

/// 任务状态枚举
#[derive(Serialize, Deserialize, Clone, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum TaskStatus {
    /// 等待中
    Pending,
    /// 执行中
    Running,
    /// 已完成
    Completed,
    /// 已取消
    Cancelled,
    /// 失败
    Failed,
}

/// 通过 Channel 推送的任务事件
#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase", tag = "event", content = "data")]
pub enum TaskEvent {
    /// 任务开始
    #[serde(rename_all = "camelCase")]
    Started {
        task_id: String,
        total_duration: f64,
    },
    /// 进度更新
    Progress(ProgressUpdate),
    /// 任务完成
    #[serde(rename_all = "camelCase")]
    Completed {
        task_id: String,
        output_path: String,
        output_size: u64,
        elapsed: f64,
    },
    /// 任务失败
    #[serde(rename_all = "camelCase")]
    Failed {
        task_id: String,
        error: String,
    },
    /// 任务取消
    #[serde(rename_all = "camelCase")]
    Cancelled {
        task_id: String,
    },
}

/// 任务执行结果
#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TaskResult {
    /// 任务 ID
    pub task_id: String,
    /// 最终状态
    pub status: TaskStatus,
    /// 输出文件路径
    pub output_path: Option<String>,
    /// 输出文件大小（字节）
    pub output_size: Option<u64>,
    /// 执行耗时（秒）
    pub elapsed: Option<f64>,
    /// 错误信息
    pub error: Option<String>,
}
```

### 3.5 各功能 Command 参数类型

```rust
/// 格式转换参数
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConvertParams {
    pub input_path: String,
    pub output_path: String,
    pub output_format: String,          // mp4, mkv, mov, webm...
    pub video_codec: String,            // libx264, libx265, copy...
    pub audio_codec: String,            // aac, copy, libmp3lame...
    pub quality: Option<u32>,           // CRF 值
    pub preset: Option<String>,         // medium, slow...
    pub hardware_accel: Option<bool>,   // 是否使用 VideoToolbox
    pub extra_args: Option<Vec<String>>,
}

/// 视频压缩参数
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CompressParams {
    pub input_path: String,
    pub output_path: String,
    pub mode: CompressMode,             // BySize, ByRatio, ByQuality
    pub target_size_mb: Option<f64>,    // 目标大小（MB）
    pub compress_ratio: Option<f64>,    // 压缩比 0.0-1.0
    pub quality_level: Option<u32>,     // 质量等级 1-10
    pub preset: Option<String>,
    pub hardware_accel: Option<bool>,
}

/// 视频裁剪参数
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TrimParams {
    pub input_path: String,
    pub output_path: String,
    pub segments: Vec<TimeSegment>,     // 裁剪片段列表
    pub precise_cut: bool,              // 精确切割（重编码）vs 快速切割（copy）
    pub merge_segments: bool,           // 多片段是否合并为一个文件
}

/// 时间片段
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TimeSegment {
    pub start: f64,                     // 起始时间（秒）
    pub end: f64,                       // 结束时间（秒）
}

/// 视频合并参数
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MergeParams {
    pub input_paths: Vec<String>,       // 输入文件列表（已排序）
    pub output_path: String,
    pub transition: Option<TransitionConfig>,  // 转场设置
    pub normalize: bool,                // 是否统一分辨率/帧率
    pub target_resolution: Option<String>,
    pub target_fps: Option<f64>,
}

/// 转场配置
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TransitionConfig {
    pub transition_type: String,        // fade, wipeleft, dissolve...
    pub duration: f64,                  // 转场时长（秒）
}

/// 音频处理参数
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AudioParams {
    pub input_path: String,
    pub output_path: String,
    pub mode: AudioMode,                // Extract, Replace, Mute, Adjust
    pub output_format: Option<String>,  // mp3, aac, wav, flac（提取模式）
    pub replace_audio_path: Option<String>,  // 替换音轨路径
    pub volume: Option<f64>,            // 音量倍数
    pub volume_db: Option<f64>,         // 音量 dB
    pub normalize: Option<bool>,        // 响度标准化
    pub fade_in: Option<f64>,           // 淡入时长（秒）
    pub fade_out: Option<f64>,          // 淡出时长（秒）
}

/// 水印参数
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WatermarkParams {
    pub input_path: String,
    pub output_path: String,
    pub watermark_type: WatermarkType,  // Image, Text
    // 图片水印
    pub image_path: Option<String>,
    pub image_scale: Option<f64>,       // 缩放比例 0.0-1.0
    pub opacity: Option<f64>,           // 透明度 0.0-1.0
    // 文字水印
    pub text: Option<String>,
    pub font_path: Option<String>,
    pub font_size: Option<u32>,
    pub font_color: Option<String>,
    pub border_width: Option<u32>,
    pub border_color: Option<String>,
    // 通用
    pub position: WatermarkPosition,    // TopLeft, Center, BottomRight...
    pub offset_x: Option<i32>,          // X 偏移（像素）
    pub offset_y: Option<i32>,          // Y 偏移（像素）
}

/// 分辨率/帧率参数
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResizeParams {
    pub input_path: String,
    pub output_path: String,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub keep_aspect_ratio: bool,
    pub scale_algorithm: Option<String>,    // lanczos, bilinear, bicubic
    pub fps: Option<f64>,
    pub aspect_mode: Option<String>,        // crop, pad, stretch
}

/// GIF 制作参数
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GifParams {
    pub input_path: String,
    pub output_path: String,
    pub start_time: f64,
    pub duration: f64,
    pub width: u32,
    pub fps: u32,
    pub loop_count: i32,                    // 0=无限, -1=不循环
    pub max_colors: Option<u32>,            // 调色板最大颜色数
    pub dither: Option<String>,             // bayer, sierra2_4a
    pub quality: Option<String>,            // low, medium, high
}

/// 字幕处理参数
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SubtitleParams {
    pub input_path: String,
    pub output_path: String,
    pub mode: SubtitleMode,             // Embed, Extract, BurnIn
    pub subtitle_path: Option<String>,  // 外部字幕文件路径
    pub subtitle_index: Option<u32>,    // 字幕流索引
    pub output_format: Option<String>,  // srt, ass, vtt（提取模式）
    // 烧录样式
    pub font_name: Option<String>,
    pub font_size: Option<u32>,
    pub primary_color: Option<String>,
    pub outline_width: Option<u32>,
    pub margin_v: Option<u32>,
}
```

---

## 4. React 前端架构

### 4.1 路由设计

```tsx
// App.tsx — 路由配置
const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "convert", element: <ConvertPage /> },
      { path: "compress", element: <CompressPage /> },
      { path: "trim", element: <TrimPage /> },
      { path: "merge", element: <MergePage /> },
      { path: "audio", element: <AudioPage /> },
      { path: "watermark", element: <WatermarkPage /> },
      { path: "resize", element: <ResizePage /> },
      { path: "gif", element: <GifPage /> },
      { path: "subtitle", element: <SubtitlePage /> },
      { path: "settings", element: <SettingsPage /> },
    ],
  },
]);
```

### 4.2 状态管理设计 (Zustand)

```typescript
// stores/useTaskStore.ts — 任务队列状态

interface TaskState {
  /** 当前活跃的任务列表 */
  tasks: Map<string, TaskInfo>;
  /** 添加任务 */
  addTask: (task: TaskInfo) => void;
  /** 更新任务进度 */
  updateProgress: (taskId: string, progress: ProgressUpdate) => void;
  /** 标记任务完成 */
  completeTask: (taskId: string, result: TaskResult) => void;
  /** 取消任务 */
  cancelTask: (taskId: string) => void;
  /** 获取所有任务的总进度 */
  getTotalProgress: () => number;
}

// stores/useSettingsStore.ts — 用户设置

interface SettingsState {
  /** 默认输出目录 */
  outputDirectory: string;
  /** 是否使用硬件加速 */
  hardwareAccel: boolean;
  /** 最大并发任务数 */
  maxConcurrent: number;
  /** 处理完成后通知 */
  notifyOnComplete: boolean;
  /** 处理完成后自动打开输出目录 */
  openOnComplete: boolean;
}
```

### 4.3 Services 层设计（Tauri 调用封装）

```typescript
// services/ffprobe.ts — 媒体信息获取

import { invoke } from '@tauri-apps/api/core';
import type { MediaInfo } from '../types/media';

/**
 * 获取视频文件的媒体信息
 * @param filePath - 本地视频文件路径
 * @returns 解析后的媒体信息对象
 * @throws {Error} ffprobe 执行失败
 */
export async function getMediaInfo(filePath: string): Promise<MediaInfo> {
  return invoke<MediaInfo>('get_media_info', { filePath });
}

// services/ffmpeg.ts — ffmpeg 操作封装

import { invoke, Channel } from '@tauri-apps/api/core';
import type { TaskEvent, ConvertParams, CompressParams /* ... */ } from '../types';

/**
 * 执行格式转换
 * @param params - 转换参数
 * @param onEvent - 进度事件回调
 * @returns 任务 ID
 */
export async function convertVideo(
  params: ConvertParams,
  onEvent: (event: TaskEvent) => void,
): Promise<string> {
  const channel = new Channel<TaskEvent>();
  channel.onmessage = onEvent;
  return invoke<string>('convert_video', { params, onProgress: channel });
}

/**
 * 取消指定任务
 * @param taskId - 任务 ID
 */
export async function cancelTask(taskId: string): Promise<void> {
  return invoke('cancel_task', { taskId });
}
```

### 4.4 核心 Hooks 设计

```typescript
// hooks/useTask.ts — 单文件任务 Hook

/**
 * 管理单个 ffmpeg 任务的执行和进度
 * @returns 任务状态和控制函数
 */
function useTask() {
  const [status, setStatus] = useState<TaskStatus>('idle');
  const [progress, setProgress] = useState<ProgressUpdate | null>(null);
  const [result, setResult] = useState<TaskResult | null>(null);
  const taskIdRef = useRef<string | null>(null);

  /** 执行任务 */
  const execute = useCallback(async (
    serviceFn: (params: any, onEvent: (e: TaskEvent) => void) => Promise<string>,
    params: any,
  ) => {
    setStatus('running');
    const taskId = await serviceFn(params, (event) => {
      switch (event.event) {
        case 'progress': setProgress(event.data); break;
        case 'completed': setStatus('completed'); setResult(event.data); break;
        case 'failed': setStatus('failed'); break;
        case 'cancelled': setStatus('cancelled'); break;
      }
    });
    taskIdRef.current = taskId;
  }, []);

  /** 取消任务 */
  const cancel = useCallback(async () => {
    if (taskIdRef.current) await cancelTask(taskIdRef.current);
  }, []);

  return { status, progress, result, execute, cancel };
}
```

---

## 5. 数据流设计

### 5.1 完整数据流（以格式转换为例）

```
用户操作流程：
─────────────────────────────────────────────────────────────

1. 用户拖入文件
   │
   ├─→ useFileDrop hook 监听 DragDropEvent
   ├─→ 调用 ffprobe.getMediaInfo(filePath)
   │      │
   │      └─→ Rust: get_media_info command
   │           │
   │           └─→ 调用 ffprobe sidecar → 解析 JSON → 返回 MediaInfo
   │
   ├─→ MediaInfo 显示在 FileInfo 面板
   └─→ VideoPreview 加载视频（convertFileSrc）

2. 用户选择预设/调整参数
   │
   ├─→ PresetSelector 选择预设 → 自动填充参数
   └─→ 参数变化 → 实时计算预估输出大小

3. 用户点击"开始处理"
   │
   ├─→ 收集参数构建 ConvertParams
   ├─→ 调用 ffmpeg.convertVideo(params, onEvent)
   │      │
   │      └─→ Rust: convert_video command
   │           │
   │           ├─→ engine::builder 构建 ffmpeg 参数
   │           ├─→ engine::process 启动 ffmpeg sidecar
   │           └─→ engine::progress 解析进度
   │                │
   │                └─→ Channel 推送 TaskEvent
   │
   ├─→ onEvent 回调更新 UI
   │      ├─→ TaskEvent::Progress → 更新进度条
   │      ├─→ TaskEvent::Completed → 显示完成提示
   │      └─→ TaskEvent::Failed → 显示错误信息
   │
   └─→ 处理完成 → 可选打开输出目录

4. 批量处理（多文件）
   │
   ├─→ 每个文件生成一个 Task
   ├─→ TaskQueue 按并发数调度执行
   ├─→ 每个 Task 独立推送进度
   └─→ 前端 useBatchTask 汇总展示总进度
```

### 5.2 前后端通信协议总结

| 操作 | 通信方式 | 方向 | 说明 |
|------|---------|------|------|
| 获取媒体信息 | invoke (command) | 前端 → Rust → 前端 | 请求-响应 |
| 启动处理任务 | invoke + Channel | 前端 → Rust，Rust → 前端 | 启动后持续推送进度 |
| 取消任务 | invoke (command) | 前端 → Rust | 终止 ffmpeg 进程 |
| 打开文件对话框 | Dialog 插件 | 前端 → 系统 → 前端 | Tauri 插件 |
| 文件拖拽 | WebView Event | 系统 → 前端 | Tauri 原生事件 |
| 读写设置 | invoke (command) | 前端 ↔ Rust | JSON 文件存储 |

---

## 6. 核心模块详细设计

### 6.1 视频预览模块

```
VideoPreview 组件
├── 使用原生 <video> 标签
├── 使用 convertFileSrc() 转换本地路径为 asset:// URL
├── 自定义播放控制栏（shadcn/ui Slider 组件）
├── 支持功能：
│   ├── 播放/暂停
│   ├── 进度条拖拽跳转
│   ├── 音量控制
│   ├── 逐帧前进/后退（video.currentTime += 1/fps）
│   ├── 当前帧截图（canvas.drawImage）
│   └── 全屏预览
└── 特殊场景：
    ├── 裁剪页：显示入点/出点标记
    ├── 水印页：叠加水印预览层（CSS overlay）
    └── 字幕页：叠加字幕文字预览
```

### 6.2 时间轴选择器模块

```
TimelineSelector 组件
├── 缩略图生成：Rust 端调用 ffmpeg 提取关键帧缩略图
│   └── ffmpeg -i input.mp4 -vf "fps=1/interval,scale=160:-1" -q:v 5 thumb_%03d.jpg
├── 缩略图条：水平排列，可滚动缩放
├── 入点/出点：可拖拽的竖线 handle
├── 选区：入出点之间的强调色半透明区域
├── 播放指示器：当前播放位置的三角形指示器
├── 精确时间输入框：HH:MM:SS.mmm 格式
├── 多片段支持：每个片段独立入出点
└── 复用场景：裁剪页、GIF 页
```

### 6.3 设置持久化

```
设置存储方案：
├── 存储位置：$APPDATA/com.clipforge.app/settings.json
├── 使用 Tauri FS 插件读写
├── 默认值在 Rust 端定义
├── 启动时加载到前端 Zustand store
└── 修改时即时保存
```

---

## 7. 第三方依赖清单

### 7.1 前端依赖

| 包名 | 用途 | 分类 |
|------|------|------|
| react, react-dom | UI 框架 | 核心 |
| typescript | 类型系统 | 核心 |
| vite | 构建工具 | 核心 |
| @tauri-apps/api | Tauri 前端 API | 核心 |
| @tauri-apps/plugin-shell | Shell 插件（调用 ffmpeg） | 核心 |
| @tauri-apps/plugin-dialog | 文件对话框 | 核心 |
| @tauri-apps/plugin-fs | 文件系统操作 | 核心 |
| @tauri-apps/plugin-notification | macOS 通知 | 功能 |
| react-router-dom | 前端路由 | 核心 |
| zustand | 状态管理 | 核心 |
| tailwindcss | CSS 框架 | UI |
| @radix-ui/* | 无障碍基础组件 | UI |
| lucide-react | 图标库 | UI |
| @dnd-kit/core, @dnd-kit/sortable | 拖拽排序（合并页） | 功能 |
| clsx, tailwind-merge | CSS class 工具 | 工具 |

### 7.2 Rust 依赖

| crate | 用途 | 分类 |
|-------|------|------|
| tauri | 应用框架 | 核心 |
| tauri-plugin-shell | Shell/Sidecar 插件 | 核心 |
| tauri-plugin-dialog | 文件对话框插件 | 核心 |
| tauri-plugin-fs | 文件系统插件 | 核心 |
| tauri-plugin-notification | 通知插件 | 功能 |
| serde, serde_json | 序列化/反序列化 | 核心 |
| tokio | 异步运行时（Tauri 内置） | 核心 |
| uuid | 任务 ID 生成 | 工具 |
| log, env_logger | 日志 | 工具 |

### 7.3 外部二进制

| 文件 | 来源 | 说明 |
|------|------|------|
| ffmpeg (静态编译) | evermeet.cx 或自行编译 | aarch64 + x86_64 两个架构 |
| ffprobe (静态编译) | 同上 | aarch64 + x86_64 两个架构 |

---

## 8. 开发与构建流程

### 8.1 环境准备

```bash
# 安装 Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 安装 Node.js (推荐 v20+)
# 使用 nvm 或 fnm 管理 Node 版本

# 安装 Tauri CLI
cargo install tauri-cli

# 克隆项目
git clone <repo-url>
cd clipforge

# 安装前端依赖
npm install

# 下载 ffmpeg 静态二进制
bash scripts/download-ffmpeg.sh
```

### 8.2 开发流程

```bash
# 启动开发服务器（前端 + Tauri 窗口）
npm run tauri dev

# 仅启动前端（用于纯 UI 开发）
npm run dev

# 类型检查
npm run typecheck

# 代码格式化
npm run format
```

### 8.3 构建发布

```bash
# 构建 Apple Silicon 版本
npm run tauri build -- --target aarch64-apple-darwin

# 构建 Intel 版本
npm run tauri build -- --target x86_64-apple-darwin

# 构建 Universal Binary（同时支持两种架构）
npm run tauri build -- --target universal-apple-darwin
```

构建产物位于 `src-tauri/target/release/bundle/`：
- `dmg/ClipForge_x.x.x_universal.dmg` — DMG 安装器
- `macos/ClipForge.app` — 应用包

### 8.4 开发阶段里程碑规划

| 阶段 | 内容 | 预期产出 |
|------|------|---------|
| **M1: 基础框架** | 项目搭建、ffmpeg sidecar 集成、首页卡片 | 可运行的空壳应用 |
| **M2: 核心引擎** | ffprobe 集成、进程管理、进度解析、任务队列 | 后端引擎可独立测试 |
| **M3: 格式转换** | 完成第一个完整功能页面（端到端） | 可用的格式转换功能 |
| **M4: 视频压缩+裁剪** | 压缩三种模式、时间轴选择器 | 3 个可用功能 |
| **M5: 合并+音频+水印** | 拖拽排序、音频四种模式、水印定位器 | 6 个可用功能 |
| **M6: 分辨率+GIF+字幕** | 预设分辨率、GIF 两步法、字幕三种模式 | 全部 9 个功能可用 |
| **M7: 批量处理+打磨** | 批量任务队列、进度展示、通知、设置持久化 | 功能完整 |
| **M8: 打包发布** | 代码签名、公证、DMG 打包、README | 可分发的 v1.0 |

---

## 附录：关键设计决策记录

| 决策 | 选择 | 备选 | 理由 |
|------|------|------|------|
| 应用框架 | Tauri 2.0 | Electron, Swift | 打包小、跨平台、Rust 性能 |
| 前端框架 | React 19 | Vue, Svelte | 生态最丰富、shadcn/ui 支持 |
| 状态管理 | Zustand | Redux, Jotai | 轻量、简单、TypeScript 友好 |
| UI 组件 | shadcn/ui | Ant Design, MUI | 零运行时、完全可控、桌面友好 |
| 图标库 | Lucide | Heroicons, Phosphor | 风格统一、React 组件化好 |
| ffmpeg 集成 | Sidecar | libav FFI | 简单可靠、Tauri 原生支持 |
| 进度推送 | Channel | Events | 高性能、有序、类型安全 |
| 视频预览 | 原生 video + asset | react-player | 零依赖、WKWebView 原生支持 |
| 主题 | CSS prefers-color-scheme | Tauri API | 零 JS 开销、自动跟随系统 |
| 拖拽排序 | @dnd-kit | react-beautiful-dnd | 活跃维护、无障碍支持好 |
| 应用名称 | ClipForge | FrameCut, VidKit | 独特、易记、体现视频加工概念 |

---

*文档版本：v1.0*
*设计日期：2026-02-08*
