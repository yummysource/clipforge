/// 应用设置数据模型
///
/// 定义 ClipForge 应用的用户可配置项，
/// 持久化存储在 $APPDATA/com.clipforge.app/settings.json

use serde::{Deserialize, Serialize};

/// 应用设置
///
/// 包含所有用户可配置的应用选项，
/// 使用 Default trait 提供合理的默认值
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    /// 默认输出目录路径（空字符串表示与输入文件同目录）
    pub output_directory: String,
    /// 是否优先使用 VideoToolbox 硬件加速（macOS 专用）
    pub hardware_accel: bool,
    /// 最大并发任务数（批量处理时同时运行的 ffmpeg 进程数量）
    pub max_concurrent: u32,
    /// 处理完成后是否发送系统通知
    pub notify_on_complete: bool,
    /// 处理完成后是否自动在 Finder 中打开输出目录
    pub open_on_complete: bool,
    /// 输出文件命名冲突时是否自动添加后缀（false 则覆盖）
    pub auto_rename: bool,
    /// 默认视频编码预设（如 "medium", "slow"）
    pub default_preset: String,
    /// 默认视频质量（CRF 值）
    pub default_quality: u32,
    /// 默认音频码率（kbps）
    pub default_audio_bitrate: u32,
}

impl Default for AppSettings {
    /// 提供合理的默认设置值
    ///
    /// - 输出目录为空（与输入同目录）
    /// - 不启用硬件加速（兼容性优先）
    /// - 单并发（节省系统资源）
    /// - 完成后通知但不自动打开
    /// - 自动重命名避免覆盖
    /// - medium 预设平衡速度和质量
    fn default() -> Self {
        Self {
            output_directory: String::new(),
            hardware_accel: false,
            max_concurrent: 1,
            notify_on_complete: true,
            open_on_complete: false,
            auto_rename: true,
            default_preset: "medium".to_string(),
            default_quality: 23,
            default_audio_bitrate: 128,
        }
    }
}
