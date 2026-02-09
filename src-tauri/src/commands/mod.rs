/// Tauri Commands 模块
///
/// 导出所有前端可调用的 command 函数。
/// 每个 command 对应一个功能模块，处理参数校验、
/// 调用 engine 层执行任务、通过 Channel 推送进度

/// 音频处理（提取、替换、静音、调节）
pub mod audio;
/// 视频下载（YouTube/X/Instagram 等，基于 yt-dlp sidecar）
pub mod download;
/// Finder 操作（在 macOS Finder 中展示文件）
pub mod finder;
/// 视频压缩（按大小、按比例、按质量）
pub mod compress;
/// 格式转换
pub mod convert;
/// GIF 制作
pub mod gif;
/// 媒体信息获取（ffprobe 调用）
pub mod media_info;
/// 视频合并/拼接
pub mod merge;
/// 分辨率/帧率调整
pub mod resize;
/// 设置管理（读写 settings.json）
pub mod settings;
/// 字幕处理（嵌入、提取、烧录）
pub mod subtitle;
/// 任务管理（取消运行中的任务）
pub mod task;
/// 视频裁剪/剪切
pub mod trim;
/// 水印叠加（图片/文字）
pub mod watermark;
