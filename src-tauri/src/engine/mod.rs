/// ffmpeg 任务引擎模块
///
/// 导出核心引擎子模块：命令构建、进程管理、进度解析、任务队列和预设管理

/// ffmpeg 命令构建器（将参数结构体转换为命令行参数数组）
pub mod builder;
/// 内置预设方案管理
pub mod presets;
/// ffmpeg 进程管理（启动、监控、终止 sidecar 进程）
pub mod process;
/// ffmpeg -progress 输出解析器
pub mod progress;
/// 任务队列（子进程注册与取消管理）
pub mod queue;
