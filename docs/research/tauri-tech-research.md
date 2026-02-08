# Tauri 2.0 + React 技术栈调研报告

> 调研日期：2026-02-08
> 目标：为 macOS ffmpeg UI 应用选型提供技术依据
> 技术栈：Tauri 2.0 + React + TypeScript

---

## 目录

1. [Tauri 2.0 项目结构和配置](#1-tauri-20-项目结构和配置)
2. [Sidecar 机制（内嵌外部二进制）](#2-sidecar-机制内嵌外部二进制)
3. [前后端通信机制](#3-前后端通信机制)
4. [文件系统和拖拽](#4-文件系统和拖拽)
5. [macOS 打包](#5-macos-打包)
6. [主题自适应](#6-主题自适应)
7. [视频预览](#7-视频预览)
8. [推荐技术选型总结](#8-推荐技术选型总结)

---

## 1. Tauri 2.0 项目结构和配置

### 1.1 最新版本信息

| 包名 | 最新版本 | 发布日期 |
|------|---------|---------|
| tauri (核心) | **2.10.2** | 2026-02-04 |
| tauri-bundler | 2.8.0 | 近期 |
| wry (WebView) | 0.54.1 | 近期 |
| tao (窗口管理) | 0.34.5 | 近期 |

Tauri 2.0 于 2024 年 10 月 2 日正式发布稳定版，此后持续迭代至今。

### 1.2 重要特性

- **跨平台支持**：macOS、Linux、Windows 桌面端 + iOS、Android 移动端
- **极小包体积**：使用系统 WebView，不捆绑 Chromium
- **Rust 后端**：高性能、内存安全
- **插件化架构**：Tauri 2.0 将 fs、dialog、shell 等 API 拆分为独立插件
- **Capabilities 权限系统**：细粒度安全权限控制
- **Channel 通信**：高性能实时数据流传输

### 1.3 项目目录结构

```
ffmpeg-ui/
├── package.json                  # 前端依赖管理
├── tsconfig.json                 # TypeScript 配置
├── vite.config.ts                # Vite 构建配置
├── index.html                    # 前端入口 HTML
├── src/                          # React 前端代码
│   ├── main.tsx                  # React 入口
│   ├── App.tsx                   # 根组件
│   ├── components/               # UI 组件
│   ├── hooks/                    # 自定义 Hooks
│   ├── stores/                   # 状态管理
│   └── styles/                   # 样式文件
├── src-tauri/                    # Tauri Rust 后端
│   ├── Cargo.toml                # Rust 依赖
│   ├── Cargo.lock                # Rust 依赖锁定
│   ├── build.rs                  # 构建脚本
│   ├── tauri.conf.json           # Tauri 主配置
│   ├── tauri.macos.conf.json     # macOS 平台特定配置（可选）
│   ├── src/
│   │   ├── main.rs               # 桌面端入口
│   │   └── lib.rs                # 核心逻辑 + 移动端入口
│   ├── binaries/                 # Sidecar 二进制文件（ffmpeg/ffprobe）
│   ├── icons/                    # 应用图标
│   │   ├── icon.png
│   │   ├── icon.icns             # macOS 图标
│   │   └── icon.ico              # Windows 图标
│   └── capabilities/             # 权限配置
│       └── default.json          # 默认权限
```

### 1.4 tauri.conf.json 关键配置

```jsonc
{
  // 应用唯一标识符（反向域名格式）
  "identifier": "com.example.ffmpeg-ui",

  // 应用显示名称
  "productName": "FFmpeg UI",

  // 版本号
  "version": "0.1.0",

  // 应用配置
  "app": {
    // 窗口配置
    "windows": [
      {
        "title": "FFmpeg UI",
        "width": 1200,
        "height": 800,
        "minWidth": 900,
        "minHeight": 600,
        "resizable": true,
        "fullscreen": false,
        "decorations": true,     // 使用系统标题栏
        "transparent": false,
        "dragDropEnabled": true  // 启用拖拽（Tauri 2.0 重命名）
      }
    ],
    // 安全配置
    "security": {
      // CSP 策略（需要包含 asset 协议以支持本地视频播放）
      "csp": "default-src 'self'; img-src 'self' asset: http://asset.localhost; media-src 'self' asset: http://asset.localhost",
      // 资源协议配置
      "assetProtocol": {
        "enable": true,
        "scope": ["**"]
      }
    },
    // macOS 私有 API（可选，用于透明背景等）
    "macOSPrivateApi": false
  },

  // 构建配置
  "build": {
    "devUrl": "http://localhost:5173",          // 开发服务器地址
    "frontendDist": "../dist",                  // 构建产物目录
    "beforeDevCommand": "npm run dev",          // 开发前置命令
    "beforeBuildCommand": "npm run build"       // 构建前置命令
  },

  // 打包配置
  "bundle": {
    "active": true,
    "targets": "all",           // 或指定 ["dmg", "app"]
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ],
    // Sidecar 外部二进制文件
    "externalBin": [
      "binaries/ffmpeg",
      "binaries/ffprobe"
    ],
    // macOS 特定配置
    "macOS": {
      "minimumSystemVersion": "10.15",   // 最低支持 macOS 版本
      "frameworks": [],
      "entitlements": null
    }
  }
}
```

### 1.5 项目创建命令

```bash
# 使用 create-tauri-app 快速创建
npm create tauri-app@latest ffmpeg-ui -- --template react-ts

# 进入项目目录
cd ffmpeg-ui

# 安装依赖
npm install

# 启动开发服务器
npm run tauri dev
```

---

## 2. Sidecar 机制（内嵌外部二进制）

### 2.1 概述

Tauri 的 Sidecar 机制允许将外部二进制文件（如 ffmpeg、ffprobe）嵌入到应用包中，并在运行时调用。这是本项目的核心依赖能力。

### 2.2 二进制文件命名规则

Sidecar 二进制文件必须携带目标平台三元组后缀。获取当前平台三元组：

```bash
rustc --print host-tuple
```

常见 macOS 三元组：

| 架构 | 三元组 |
|-----|-------|
| Apple Silicon (M1/M2/M3/M4) | `aarch64-apple-darwin` |
| Intel | `x86_64-apple-darwin` |

文件放置示例：

```
src-tauri/binaries/
├── ffmpeg-aarch64-apple-darwin        # Apple Silicon 版 ffmpeg
├── ffmpeg-x86_64-apple-darwin         # Intel 版 ffmpeg
├── ffprobe-aarch64-apple-darwin       # Apple Silicon 版 ffprobe
└── ffprobe-x86_64-apple-darwin        # Intel 版 ffprobe
```

> **重要**：文件名格式为 `{配置中的名称}-{target-triple}`，不需要扩展名。

### 2.3 配置步骤

#### 步骤 1：tauri.conf.json 中声明外部二进制

```json
{
  "bundle": {
    "externalBin": [
      "binaries/ffmpeg",
      "binaries/ffprobe"
    ]
  }
}
```

#### 步骤 2：配置权限（capabilities/default.json）

```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "默认权限集",
  "windows": ["main"],
  "permissions": [
    "core:default",
    {
      "identifier": "shell:allow-execute",
      "allow": [
        {
          "name": "binaries/ffmpeg",
          "sidecar": true,
          "args": true
        },
        {
          "name": "binaries/ffprobe",
          "sidecar": true,
          "args": true
        }
      ]
    },
    {
      "identifier": "shell:allow-spawn",
      "allow": [
        {
          "name": "binaries/ffmpeg",
          "sidecar": true,
          "args": true
        },
        {
          "name": "binaries/ffprobe",
          "sidecar": true,
          "args": true
        }
      ]
    }
  ]
}
```

> **注意**：`args: true` 表示允许传递任意参数。生产环境中建议使用正则表达式限制参数范围以增强安全性。

#### 步骤 3：安装 shell 插件

```bash
# 添加 shell 插件
npm run tauri add shell
```

### 2.4 Rust 端调用 Sidecar

```rust
use tauri::Manager;
use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::CommandEvent;

/// 使用 ffprobe 获取视频文件的媒体信息
///
/// 通过 sidecar 机制调用内嵌的 ffprobe 二进制文件，
/// 以 JSON 格式输出视频的详细元数据
#[tauri::command]
async fn get_media_info(app: tauri::AppHandle, file_path: String) -> Result<String, String> {
    // 创建 sidecar 命令，注意只传文件名不传完整路径
    let command = app
        .shell()
        .sidecar("ffprobe")
        .map_err(|e| e.to_string())?
        .args([
            "-v", "quiet",
            "-print_format", "json",
            "-show_format",
            "-show_streams",
            &file_path,
        ]);

    // 执行命令并等待输出
    let output = command.output().await.map_err(|e| e.to_string())?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

/// 执行 ffmpeg 转码任务（带实时进度推送）
///
/// 使用 spawn 模式启动 ffmpeg 进程，通过事件接收器
/// 监听 stdout/stderr 输出，解析进度并推送到前端
#[tauri::command]
async fn transcode_video(
    app: tauri::AppHandle,
    input: String,
    output: String,
    args: Vec<String>,
    on_event: tauri::ipc::Channel,
) -> Result<(), String> {
    // 构建完整参数列表
    let mut full_args = vec!["-i".to_string(), input, "-progress".to_string(), "pipe:1".to_string()];
    full_args.extend(args);
    full_args.push("-y".to_string()); // 覆盖输出文件
    full_args.push(output);

    // 使用 spawn 模式以接收实时输出
    let (mut rx, child) = app
        .shell()
        .sidecar("ffmpeg")
        .map_err(|e| e.to_string())?
        .args(&full_args)
        .spawn()
        .map_err(|e| e.to_string())?;

    // 在异步任务中处理输出事件
    tauri::async_runtime::spawn(async move {
        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Stdout(line) => {
                    // 解析 ffmpeg 进度输出
                    let line_str = String::from_utf8_lossy(&line);
                    let _ = on_event.send(serde_json::json!({
                        "type": "progress",
                        "data": line_str.to_string()
                    }));
                }
                CommandEvent::Stderr(line) => {
                    let line_str = String::from_utf8_lossy(&line);
                    let _ = on_event.send(serde_json::json!({
                        "type": "log",
                        "data": line_str.to_string()
                    }));
                }
                CommandEvent::Terminated(status) => {
                    let _ = on_event.send(serde_json::json!({
                        "type": "finished",
                        "code": status.code
                    }));
                }
                _ => {}
            }
        }
    });

    Ok(())
}
```

### 2.5 前端调用 Sidecar

```typescript
import { Command } from '@tauri-apps/plugin-shell';

/**
 * 直接从前端调用 ffprobe 获取媒体信息
 * @param filePath - 本地视频文件路径
 * @returns ffprobe 输出的 JSON 字符串
 */
async function getMediaInfo(filePath: string): Promise<string> {
  const command = Command.sidecar('binaries/ffprobe', [
    '-v', 'quiet',
    '-print_format', 'json',
    '-show_format',
    '-show_streams',
    filePath,
  ]);

  const output = await command.execute();

  if (output.code === 0) {
    return output.stdout;
  } else {
    throw new Error(output.stderr);
  }
}
```

### 2.6 获取 ffmpeg 静态二进制文件

推荐来源：

| 来源 | 说明 |
|-----|------|
| [ffmpeg.org/download](https://ffmpeg.org/download.html) | 官方下载页 |
| [evermeet.cx/ffmpeg](https://evermeet.cx/ffmpeg/) | macOS 静态编译版本 |
| 自行编译 | 使用 Homebrew 或从源码编译 |

下载后需要重命名为符合 Tauri 命名规则的文件名，并放置到 `src-tauri/binaries/` 目录。

---

## 3. 前后端通信机制

### 3.1 通信方式概览

Tauri 2.0 提供三种前后端通信方式：

| 方式 | 适用场景 | 特点 |
|-----|---------|------|
| **Commands (invoke)** | 请求-响应模式 | 类型安全、支持参数和返回值 |
| **Events (emit/listen)** | 简单通知、广播 | 双向、全局可用、异步 |
| **Channels** | 实时数据流、进度推送 | 高性能、有序传输、单向（Rust→前端） |

### 3.2 Commands（invoke）

**核心机制**：前端通过 `invoke()` 调用 Rust 端标注了 `#[tauri::command]` 的函数。

#### Rust 端定义 Command

```rust
use serde::{Deserialize, Serialize};

/// 视频转码参数
#[derive(Deserialize)]
struct TranscodeOptions {
    /// 输入文件路径
    input_path: String,
    /// 输出文件路径
    output_path: String,
    /// 视频编码器（如 libx264、libx265）
    codec: String,
    /// 视频码率（如 "5M"）
    bitrate: Option<String>,
    /// 分辨率（如 "1920x1080"）
    resolution: Option<String>,
}

/// 转码结果
#[derive(Serialize)]
struct TranscodeResult {
    /// 是否成功
    success: bool,
    /// 输出文件路径
    output_path: String,
    /// 输出文件大小（字节）
    file_size: u64,
}

/// 启动视频转码任务
///
/// 接收转码参数，调用 ffmpeg 执行转码
#[tauri::command]
async fn start_transcode(
    app: tauri::AppHandle,
    options: TranscodeOptions,
) -> Result<TranscodeResult, String> {
    // 具体实现...
    Ok(TranscodeResult {
        success: true,
        output_path: options.output_path,
        file_size: 0,
    })
}

// 注册 Command
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            start_transcode,
            get_media_info,
            transcode_video,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

#### 前端调用 Command

```typescript
import { invoke } from '@tauri-apps/api/core';

interface TranscodeOptions {
  inputPath: string;   // 注意：前端使用 camelCase
  outputPath: string;
  codec: string;
  bitrate?: string;
  resolution?: string;
}

interface TranscodeResult {
  success: boolean;
  outputPath: string;
  fileSize: number;
}

/**
 * 调用后端启动转码任务
 * @param options - 转码选项
 * @returns 转码结果
 */
async function startTranscode(options: TranscodeOptions): Promise<TranscodeResult> {
  return await invoke<TranscodeResult>('start_transcode', { options });
}
```

> **参数命名约定**：Rust 端使用 `snake_case`，前端使用 `camelCase`，Tauri 自动转换。可通过 `#[tauri::command(rename_all = "snake_case")]` 修改此行为。

### 3.3 Events（事件系统）

**适用场景**：全局通知、状态变更广播。

#### Rust 端发送事件

```rust
use tauri::{AppHandle, Emitter};

/// 在后台任务中发送进度事件
fn emit_progress(app: &AppHandle, task_id: &str, progress: f64) {
    app.emit("transcode-progress", serde_json::json!({
        "taskId": task_id,
        "progress": progress,   // 0.0 ~ 1.0
    })).unwrap();
}

/// 发送转码完成事件
fn emit_completed(app: &AppHandle, task_id: &str, output_path: &str) {
    app.emit("transcode-completed", serde_json::json!({
        "taskId": task_id,
        "outputPath": output_path,
    })).unwrap();
}
```

#### 前端监听事件

```typescript
import { listen } from '@tauri-apps/api/event';

interface ProgressPayload {
  taskId: string;
  progress: number;
}

// 监听转码进度事件
const unlisten = await listen<ProgressPayload>('transcode-progress', (event) => {
  console.log(`任务 ${event.payload.taskId} 进度: ${event.payload.progress * 100}%`);
  // 更新 UI 进度条
});

// 取消监听
unlisten();
```

### 3.4 Channels（高性能数据流）

**适用场景**：ffmpeg 转码进度的实时推送。这是**推荐的进度推送方案**。

#### Rust 端使用 Channel

```rust
use tauri::ipc::Channel;
use serde::Serialize;

/// 转码事件类型
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase", tag = "event", content = "data")]
enum TranscodeEvent {
    /// 转码开始
    #[serde(rename_all = "camelCase")]
    Started { total_duration: f64 },
    /// 进度更新
    #[serde(rename_all = "camelCase")]
    Progress {
        /// 当前处理的时间点（秒）
        current_time: f64,
        /// 进度百分比 0-100
        percent: f64,
        /// 处理速度（如 2.5x）
        speed: f64,
    },
    /// 转码完成
    #[serde(rename_all = "camelCase")]
    Finished { output_path: String, file_size: u64 },
    /// 转码出错
    Error { message: String },
}

/// 启动带进度推送的转码任务
#[tauri::command]
async fn transcode_with_progress(
    app: tauri::AppHandle,
    input: String,
    output: String,
    on_event: Channel<TranscodeEvent>,
) -> Result<(), String> {
    // 发送开始事件
    on_event.send(TranscodeEvent::Started { total_duration: 120.0 })
        .map_err(|e| e.to_string())?;

    // ... 启动 ffmpeg 进程并解析进度 ...

    // 发送进度事件
    on_event.send(TranscodeEvent::Progress {
        current_time: 60.0,
        percent: 50.0,
        speed: 2.5,
    }).map_err(|e| e.to_string())?;

    // 发送完成事件
    on_event.send(TranscodeEvent::Finished {
        output_path: output,
        file_size: 1024 * 1024 * 50,
    }).map_err(|e| e.to_string())?;

    Ok(())
}
```

#### 前端使用 Channel

```typescript
import { invoke, Channel } from '@tauri-apps/api/core';

interface TranscodeStarted {
  event: 'started';
  data: { totalDuration: number };
}

interface TranscodeProgress {
  event: 'progress';
  data: { currentTime: number; percent: number; speed: number };
}

interface TranscodeFinished {
  event: 'finished';
  data: { outputPath: string; fileSize: number };
}

interface TranscodeError {
  event: 'error';
  data: { message: string };
}

type TranscodeEvent = TranscodeStarted | TranscodeProgress | TranscodeFinished | TranscodeError;

/**
 * 启动转码任务并监听进度
 * @param input - 输入文件路径
 * @param output - 输出文件路径
 * @param onProgress - 进度回调
 */
async function transcodeWithProgress(
  input: string,
  output: string,
  onProgress: (percent: number, speed: number) => void,
): Promise<void> {
  const onEvent = new Channel<TranscodeEvent>();

  onEvent.onmessage = (message) => {
    switch (message.event) {
      case 'started':
        console.log(`开始转码，总时长: ${message.data.totalDuration}s`);
        break;
      case 'progress':
        onProgress(message.data.percent, message.data.speed);
        break;
      case 'finished':
        console.log(`转码完成: ${message.data.outputPath}`);
        break;
      case 'error':
        console.error(`转码出错: ${message.data.message}`);
        break;
    }
  };

  await invoke('transcode_with_progress', {
    input,
    output,
    onEvent,
  });
}
```

### 3.5 通信方式选择建议

| 场景 | 推荐方式 | 理由 |
|-----|---------|------|
| 获取媒体信息 | Commands (invoke) | 请求-响应模式，类型安全 |
| 转码进度推送 | Channels | 高性能流式传输，有序 |
| 任务状态变更通知 | Events | 全局广播，多窗口同步 |
| 取消转码任务 | Commands (invoke) | 单次操作 |

---

## 4. 文件系统和拖拽

### 4.1 文件系统插件

Tauri 2.0 将文件系统 API 拆分为独立的 `@tauri-apps/plugin-fs` 插件。

#### 安装

```bash
npm run tauri add fs
```

#### 使用示例

```typescript
import { readTextFile, writeTextFile, exists, mkdir } from '@tauri-apps/plugin-fs';
import { appDataDir, join } from '@tauri-apps/api/path';

/**
 * 读取应用配置文件
 * @returns 配置对象
 */
async function readConfig(): Promise<Record<string, unknown>> {
  const appDir = await appDataDir();
  const configPath = await join(appDir, 'config.json');

  if (await exists(configPath)) {
    const content = await readTextFile(configPath);
    return JSON.parse(content);
  }

  return {};
}
```

#### 权限配置

在 `capabilities/default.json` 中配置文件系统访问范围：

```json
{
  "permissions": [
    {
      "identifier": "fs:allow-read",
      "allow": [
        { "path": "$APPDATA/**" },
        { "path": "$HOME/Movies/**" },
        { "path": "$HOME/Desktop/**" },
        { "path": "$HOME/Downloads/**" }
      ]
    },
    {
      "identifier": "fs:allow-write",
      "allow": [
        { "path": "$APPDATA/**" }
      ]
    }
  ]
}
```

> **安全提示**：使用 `$APPDATA`、`$HOME` 等内置变量限制访问范围，避免使用 `**` 全局通配。

### 4.2 文件对话框（打开/保存）

使用 `@tauri-apps/plugin-dialog` 插件。

#### 安装

```bash
npm run tauri add dialog
```

#### 使用示例

```typescript
import { open, save } from '@tauri-apps/plugin-dialog';

/**
 * 打开文件选择对话框，选择视频文件
 * @returns 选中的文件路径，取消返回 null
 */
async function selectVideoFile(): Promise<string | null> {
  const selected = await open({
    multiple: false,
    directory: false,
    filters: [
      {
        name: '视频文件',
        extensions: ['mp4', 'mkv', 'avi', 'mov', 'wmv', 'flv', 'webm', 'ts', 'm4v'],
      },
      {
        name: '所有文件',
        extensions: ['*'],
      },
    ],
  });

  return selected as string | null;
}

/**
 * 选择多个视频文件
 * @returns 选中的文件路径数组
 */
async function selectMultipleFiles(): Promise<string[]> {
  const selected = await open({
    multiple: true,
    filters: [
      {
        name: '视频文件',
        extensions: ['mp4', 'mkv', 'avi', 'mov', 'webm'],
      },
    ],
  });

  return (selected as string[] | null) ?? [];
}

/**
 * 选择输出文件保存路径
 * @param defaultName - 默认文件名
 * @returns 保存路径
 */
async function selectOutputPath(defaultName: string): Promise<string | null> {
  const path = await save({
    defaultPath: defaultName,
    filters: [
      {
        name: 'MP4 视频',
        extensions: ['mp4'],
      },
      {
        name: 'MKV 视频',
        extensions: ['mkv'],
      },
    ],
  });

  return path;
}
```

### 4.3 拖拽文件到窗口

Tauri 2.0 提供原生拖拽支持，通过 `onDragDropEvent` 监听拖拽事件。

#### 配置

确保窗口配置中 `dragDropEnabled` 为 `true`（默认启用）：

```json
{
  "app": {
    "windows": [
      {
        "dragDropEnabled": true
      }
    ]
  }
}
```

#### React 实现

```tsx
import { useEffect, useState } from 'react';
import { getCurrentWebview } from '@tauri-apps/api/webview';

/**
 * 自定义 Hook：监听文件拖拽事件
 * @returns 拖拽状态和文件路径
 */
function useFileDrop() {
  // 是否正在拖拽中
  const [isDragging, setIsDragging] = useState(false);
  // 拖拽放下的文件路径列表
  const [droppedFiles, setDroppedFiles] = useState<string[]>([]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    const setupListener = async () => {
      const webview = getCurrentWebview();
      const unlistenFn = await webview.onDragDropEvent((event) => {
        switch (event.payload.type) {
          case 'enter':
            // 文件进入窗口区域
            setIsDragging(true);
            break;
          case 'over':
            // 文件在窗口上方移动（可获取位置信息）
            break;
          case 'drop':
            // 文件放下
            setIsDragging(false);
            setDroppedFiles(event.payload.paths);
            break;
          case 'leave':
            // 文件离开窗口区域
            setIsDragging(false);
            break;
        }
      });
      unlisten = unlistenFn;
    };

    setupListener();

    return () => {
      unlisten?.();
    };
  }, []);

  return { isDragging, droppedFiles, clearFiles: () => setDroppedFiles([]) };
}

/**
 * 拖拽区域组件
 */
function DropZone() {
  const { isDragging, droppedFiles } = useFileDrop();

  return (
    <div className={`drop-zone ${isDragging ? 'dragging' : ''}`}>
      {isDragging ? (
        <p>释放文件以添加</p>
      ) : droppedFiles.length > 0 ? (
        <ul>
          {droppedFiles.map((file) => (
            <li key={file}>{file}</li>
          ))}
        </ul>
      ) : (
        <p>拖拽视频文件到此处</p>
      )}
    </div>
  );
}
```

#### 拖拽事件类型

| 事件类型 | 触发时机 | payload 内容 |
|---------|---------|-------------|
| `enter` | 文件进入窗口 | `paths`: 文件路径数组, `position`: 坐标 |
| `over` | 文件在窗口上移动 | `position`: 坐标 |
| `drop` | 文件释放（放下） | `paths`: 文件路径数组, `position`: 坐标 |
| `leave` | 文件离开窗口 | 无 |

---

## 5. macOS 打包

### 5.1 打包格式

Tauri 支持两种 macOS 分发方式：

| 格式 | 说明 | 适用场景 |
|-----|------|---------|
| `.app` Bundle | macOS 应用包 | 直接分发 |
| `.dmg` 磁盘映像 | 包含 .app 的安装器 | 网站下载分发 |

### 5.2 构建命令

```bash
# 构建当前平台的安装包
npm run tauri build

# 构建特定目标
npm run tauri build -- --target aarch64-apple-darwin     # Apple Silicon
npm run tauri build -- --target x86_64-apple-darwin       # Intel
npm run tauri build -- --target universal-apple-darwin    # Universal Binary
```

构建产物位于 `src-tauri/target/release/bundle/`：

```
target/release/bundle/
├── dmg/
│   └── FFmpeg UI_0.1.0_aarch64.dmg
└── macos/
    └── FFmpeg UI.app/
```

### 5.3 Universal Binary

Universal Binary 同时包含 Apple Silicon (aarch64) 和 Intel (x86_64) 架构的代码，用户无需选择下载版本。

```bash
# 构建 Universal Binary
npm run tauri build -- --target universal-apple-darwin
```

> **注意**：构建 Universal Binary 需要同时安装两个架构的 Rust 工具链：
> ```bash
> rustup target add x86_64-apple-darwin
> rustup target add aarch64-apple-darwin
> ```
>
> 同时 Sidecar 二进制文件（ffmpeg/ffprobe）也需要提供两个架构的版本，或者使用 lipo 合并为 Universal Binary。

### 5.4 代码签名

macOS 代码签名需要 Apple Developer 账号（$99/年）。

#### 本地签名配置

```bash
# 查看可用的签名证书
security find-identity -v -p codesigning

# 设置环境变量
export APPLE_SIGNING_IDENTITY="Developer ID Application: Your Name (TEAM_ID)"
```

或在 `tauri.conf.json` 中配置：

```json
{
  "bundle": {
    "macOS": {
      "signingIdentity": "Developer ID Application: Your Name (TEAM_ID)"
    }
  }
}
```

#### 开发阶段（Ad-hoc 签名）

不需要 Developer 账号，但无法分发给其他用户：

```json
{
  "bundle": {
    "macOS": {
      "signingIdentity": "-"
    }
  }
}
```

### 5.5 公证（Notarization）

公证是苹果的安全审核流程，确保应用不含恶意软件。通过 Developer ID 分发时必须公证。

#### 使用 App Store Connect API（推荐）

```bash
# 设置环境变量
export APPLE_API_ISSUER="issuer-uuid"
export APPLE_API_KEY="key-id"
export APPLE_API_KEY_PATH="/path/to/AuthKey_XXXX.p8"
```

#### 使用 Apple ID

```bash
export APPLE_ID="your@email.com"
export APPLE_PASSWORD="app-specific-password"
export APPLE_TEAM_ID="TEAM_ID"
```

> **最佳实践**：使用 App Store Connect API 方式更安全，不需要暴露 Apple ID 密码。

### 5.6 CI/CD 集成

在 GitHub Actions 中自动构建和签名：

```yaml
env:
  APPLE_CERTIFICATE: ${{ secrets.APPLE_CERTIFICATE }}
  APPLE_CERTIFICATE_PASSWORD: ${{ secrets.APPLE_CERTIFICATE_PASSWORD }}
  APPLE_SIGNING_IDENTITY: ${{ secrets.APPLE_SIGNING_IDENTITY }}
  APPLE_API_ISSUER: ${{ secrets.APPLE_API_ISSUER }}
  APPLE_API_KEY: ${{ secrets.APPLE_API_KEY }}
  APPLE_API_KEY_PATH: ${{ secrets.APPLE_API_KEY_PATH }}
```

---

## 6. 主题自适应

### 6.1 系统主题检测

#### 方式一：CSS 媒体查询（推荐，零 JS 开销）

```css
/* 亮色模式（默认） */
:root {
  --bg-primary: #ffffff;
  --bg-secondary: #f5f5f7;
  --text-primary: #1d1d1f;
  --text-secondary: #6e6e73;
  --border-color: #d2d2d7;
  --accent-color: #007aff;
  --surface-color: #ffffff;
  --hover-color: #f0f0f0;
}

/* 暗色模式 */
@media (prefers-color-scheme: dark) {
  :root {
    --bg-primary: #1c1c1e;
    --bg-secondary: #2c2c2e;
    --text-primary: #f5f5f7;
    --text-secondary: #98989d;
    --border-color: #38383a;
    --accent-color: #0a84ff;
    --surface-color: #2c2c2e;
    --hover-color: #3a3a3c;
  }
}
```

#### 方式二：Tauri Window API

```typescript
import { getCurrentWindow } from '@tauri-apps/api/window';

/**
 * 获取当前系统主题
 * @returns 'light' | 'dark' | null
 */
async function getSystemTheme(): Promise<string | null> {
  const window = getCurrentWindow();
  return await window.theme();
}

/**
 * 监听系统主题变化
 * @param callback - 主题变化回调
 * @returns 取消监听函数
 */
async function onThemeChange(callback: (theme: string) => void): Promise<() => void> {
  const window = getCurrentWindow();
  return await window.onThemeChanged(({ payload: theme }) => {
    callback(theme);
  });
}
```

#### 方式三：React Hook 封装

```typescript
import { useEffect, useState } from 'react';

/**
 * 自定义 Hook：监听系统暗色模式
 * @returns 当前是否为暗色模式
 */
function useDarkMode(): boolean {
  const [isDark, setIsDark] = useState(() =>
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return isDark;
}
```

### 6.2 推荐 React UI 组件库

#### 首选方案：shadcn/ui + Tailwind CSS

| 特性 | 说明 |
|-----|------|
| **暗色模式** | 原生支持，通过 CSS 变量自动切换 |
| **体积** | 按需复制组件代码，零额外运行时 |
| **定制性** | 100% 代码可控，可完全定制 |
| **可访问性** | 基于 Radix UI 原语，完整 ARIA 支持 |
| **风格** | 多种预设风格（Vega/Nova/Maia/Lyra/Mira） |

安装方式：

```bash
# 初始化 shadcn/ui
npx shadcn@latest init

# 按需添加组件
npx shadcn@latest add button
npx shadcn@latest add dialog
npx shadcn@latest add progress
npx shadcn@latest add slider
npx shadcn@latest add select
npx shadcn@latest add tabs
```

Tailwind CSS 暗色模式配置：

```javascript
// tailwind.config.js
module.exports = {
  darkMode: 'media',  // 使用系统偏好自动切换
  // 或使用 'class' 模式手动控制
  // ...
};
```

#### 备选方案对比

| 组件库 | 暗色模式 | 包大小 | 桌面端适合度 | 定制性 |
|-------|---------|--------|------------|-------|
| **shadcn/ui** | 原生支持 | 极小（按需） | 高 | 极高 |
| **Radix Themes** | 原生支持 | 较小 | 中高 | 高 |
| **Ant Design** | 支持 | 较大 | 高 | 中 |
| **Mantine** | 原生支持 | 中等 | 中高 | 高 |
| **MUI (Material)** | 支持 | 较大 | 中 | 中高 |

> **推荐理由**：shadcn/ui 非常适合桌面应用场景，因为它不是一个传统的 npm 库，而是直接将组件代码复制到项目中。这意味着零运行时依赖、完全的代码控制权，且可以深度定制以匹配 macOS 的视觉风格。

### 6.3 macOS 原生风格建议

- 使用系统字体 `-apple-system, BlinkMacSystemFont, 'SF Pro'`
- 圆角使用 `8px~12px`（匹配 macOS 窗口风格）
- 使用半透明背景模拟毛玻璃效果（vibrancy）
- 边栏宽度推荐 200-260px
- 工具栏高度推荐 38-44px

```css
/* macOS 风格基础样式 */
body {
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display',
    'Helvetica Neue', sans-serif;
  -webkit-font-smoothing: antialiased;
  user-select: none; /* 桌面应用通常禁用文本选择 */
}

/* 毛玻璃效果侧边栏 */
.sidebar {
  background-color: rgba(246, 246, 246, 0.8);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

@media (prefers-color-scheme: dark) {
  .sidebar {
    background-color: rgba(30, 30, 30, 0.8);
  }
}
```

---

## 7. 视频预览

### 7.1 HTML5 Video 在 Tauri WebView 中的支持

Tauri 使用系统 WebView（macOS 上为 WKWebView），完整支持 HTML5 `<video>` 标签。

macOS WKWebView 支持的视频格式：

| 格式 | 编码 | 支持情况 |
|-----|------|---------|
| MP4 | H.264 | 完全支持 |
| MP4 | H.265/HEVC | 支持（macOS 10.13+） |
| WebM | VP8/VP9 | macOS 14+ 支持 |
| MOV | ProRes | 完全支持 |
| MP4 | AV1 | macOS 13+ 部分支持 |

### 7.2 本地视频播放方案

#### 方案一：Asset Protocol（推荐）

使用 Tauri 内置的 `asset://` 协议将本地文件路径转换为 WebView 可加载的 URL。

**配置 tauri.conf.json：**

```json
{
  "app": {
    "security": {
      "csp": "default-src 'self'; media-src 'self' asset: http://asset.localhost; img-src 'self' asset: http://asset.localhost",
      "assetProtocol": {
        "enable": true,
        "scope": ["**"]
      }
    }
  }
}
```

**前端使用：**

```typescript
import { convertFileSrc } from '@tauri-apps/api/core';

/**
 * 将本地文件路径转换为可在 WebView 中加载的 URL
 * @param filePath - 本地文件绝对路径
 * @returns asset 协议 URL
 */
function getVideoUrl(filePath: string): string {
  return convertFileSrc(filePath);
  // 返回类似：asset://localhost/path/to/video.mp4
  // 或：http://asset.localhost/path/to/video.mp4
}
```

#### 方案二：Rust 端提供 HTTP 流式服务（备选）

对于需要更多控制的场景（如范围请求、自定义 MIME 类型），可以在 Rust 端启动一个小型 HTTP 服务器来提供视频流。这种方式更复杂，一般不需要。

### 7.3 React 视频预览组件

#### 方案一：原生 HTML5 Video（推荐，最轻量）

```tsx
import { convertFileSrc } from '@tauri-apps/api/core';
import { useState, useRef } from 'react';

interface VideoPreviewProps {
  /** 本地视频文件路径 */
  filePath: string;
  /** 视频宽度 */
  width?: number;
  /** 视频高度 */
  height?: number;
}

/**
 * 视频预览播放器组件
 *
 * 使用 Tauri asset 协议将本地视频文件
 * 转换为 WebView 可加载的 URL 进行播放
 */
function VideoPreview({ filePath, width = 640, height = 360 }: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // 将本地路径转换为 asset 协议 URL
  const videoSrc = convertFileSrc(filePath);

  return (
    <div className="video-preview">
      <video
        ref={videoRef}
        src={videoSrc}
        width={width}
        height={height}
        controls
        preload="metadata"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        style={{ borderRadius: '8px', objectFit: 'contain' }}
      />
    </div>
  );
}
```

#### 方案二：使用 React Player 库

如果需要更丰富的播放器功能：

```bash
npm install react-player
```

```tsx
import ReactPlayer from 'react-player';
import { convertFileSrc } from '@tauri-apps/api/core';

/**
 * 使用 ReactPlayer 的视频预览组件
 */
function VideoPreviewAdvanced({ filePath }: { filePath: string }) {
  const videoUrl = convertFileSrc(filePath);

  return (
    <ReactPlayer
      url={videoUrl}
      controls
      width="100%"
      height="auto"
      config={{
        file: {
          attributes: {
            preload: 'metadata',
          },
        },
      }}
    />
  );
}
```

### 7.4 推荐的 React 视频播放器组件库

| 库名 | 特点 | 推荐场景 |
|-----|------|---------|
| **原生 \<video\>** | 零依赖、最轻量、完全控制 | 简单预览，本项目首选 |
| **react-player** | 多源支持、功能丰富 | 需要多格式支持时 |
| **video-react** | 类似 video.js 的 React 组件 | 需要自定义 UI 时 |
| **Vidstack** | 现代化、高性能、可访问性好 | 需要专业播放器体验时 |

> **本项目推荐**：使用原生 `<video>` 标签 + `convertFileSrc`。理由：
> 1. 我们只需要预览功能，不需要复杂的播放器控制
> 2. 零额外依赖，包体积最小
> 3. WKWebView 原生支持主流视频格式
> 4. 完全可控，方便定制 UI 风格

### 7.5 已知限制和注意事项

1. **Range Request 支持**：Asset 协议支持 HTTP Range 请求（视频拖动进度条依赖此功能），但早期版本存在小文件播放异常的 bug，最新版已修复。
2. **大文件内存**：使用 `asset://` 协议加载超大视频文件时需注意内存占用，建议添加 `preload="metadata"` 仅预加载元数据。
3. **格式兼容**：某些非标准编码（如 MPEG-TS、FLV）可能无法在 WKWebView 中直接播放，需要先用 ffmpeg 转封装为 MP4。
4. **CSP 配置**：必须在 CSP 中添加 `media-src asset: http://asset.localhost`，否则视频无法加载。

---

## 8. 推荐技术选型总结

### 8.1 核心技术栈

| 层级 | 技术 | 版本 | 用途 |
|-----|------|-----|------|
| 框架 | Tauri | 2.10.x | 桌面应用框架 |
| 前端框架 | React | 19.x | UI 开发 |
| 类型系统 | TypeScript | 5.x | 类型安全 |
| 构建工具 | Vite | 6.x | 前端构建 |
| UI 组件 | shadcn/ui | latest | 组件库 |
| CSS 框架 | Tailwind CSS | 4.x | 样式系统 |
| 后端语言 | Rust | stable | 系统交互 |

### 8.2 Tauri 插件

| 插件 | npm 包名 | 用途 |
|-----|---------|------|
| Shell | @tauri-apps/plugin-shell | 调用 ffmpeg/ffprobe sidecar |
| Dialog | @tauri-apps/plugin-dialog | 文件打开/保存对话框 |
| File System | @tauri-apps/plugin-fs | 文件读写操作 |

### 8.3 关键设计决策

| 决策点 | 选择 | 理由 |
|-------|------|------|
| ffmpeg 集成方式 | Sidecar | Tauri 原生支持，简单可靠 |
| 进度推送 | Channel | 高性能、有序、类型安全 |
| 文件选择 | Dialog 插件 + 拖拽 | 双重入口，提升易用性 |
| 视频预览 | 原生 \<video\> + asset 协议 | 零依赖，WKWebView 原生支持 |
| 暗色模式 | CSS prefers-color-scheme | 零 JS 开销，系统自动跟随 |
| 组件库 | shadcn/ui | 桌面端友好，完全可控 |
| 打包分发 | DMG + 代码签名 + 公证 | macOS 标准分发流程 |

### 8.4 项目创建快速参考

```bash
# 1. 创建项目
npm create tauri-app@latest ffmpeg-ui -- --template react-ts

# 2. 进入项目
cd ffmpeg-ui

# 3. 安装 Tauri 插件
npm run tauri add shell
npm run tauri add dialog
npm run tauri add fs

# 4. 安装前端依赖
npm install -D tailwindcss @tailwindcss/vite
npx shadcn@latest init

# 5. 准备 ffmpeg 二进制文件
mkdir -p src-tauri/binaries
# 下载并放置 ffmpeg-aarch64-apple-darwin 和 ffprobe-aarch64-apple-darwin

# 6. 启动开发
npm run tauri dev

# 7. 构建
npm run tauri build
```

---

## 参考资料

- [Tauri 2.0 官方文档](https://v2.tauri.app/)
- [Tauri 项目结构](https://v2.tauri.app/start/project-structure/)
- [Tauri 配置参考](https://v2.tauri.app/reference/config/)
- [Sidecar 文档](https://v2.tauri.app/develop/sidecar/)
- [前后端通信 - 调用 Rust](https://v2.tauri.app/develop/calling-rust/)
- [前后端通信 - 调用前端](https://v2.tauri.app/develop/calling-frontend/)
- [Dialog 插件](https://v2.tauri.app/plugin/dialog/)
- [File System 插件](https://v2.tauri.app/plugin/file-system/)
- [macOS 代码签名](https://v2.tauri.app/distribute/sign/macos/)
- [Tauri GitHub Releases](https://github.com/tauri-apps/tauri/releases)
- [shadcn/ui 官网](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)
