/// 应用设置数据模型
///
/// 定义 ClipForge 应用的用户可配置项，
/// 持久化存储在 $APPDATA/com.clipforge.app/settings.json。
/// 字段与前端 TypeScript `AppSettings` 接口完全对齐

use serde::{Deserialize, Serialize};

/// 应用设置
///
/// 包含所有用户可配置的应用选项。
/// 使用 `#[serde(default)]` 确保旧版设置文件中缺失的字段自动填充默认值，
/// 避免反序列化失败
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase", default)]
pub struct AppSettings {
    /// 默认输出目录路径（空字符串表示输出到源文件所在目录）
    pub output_directory: String,
    /// 是否优先使用 VideoToolbox 硬件加速（macOS 专用）
    pub hardware_accel: bool,
    /// 最大并发任务数（批量处理时同时运行的 ffmpeg 进程数量）
    pub max_concurrent: u32,
    /// 处理完成后是否发送系统通知
    pub notify_on_complete: bool,
    /// 处理完成后是否自动在 Finder 中打开输出文件所在目录
    pub open_on_complete: bool,
    /// 输出文件命名后缀（如 "_output"）
    pub output_suffix: String,
    /// 文件已存在时是否自动覆盖（false 则自动添加序号）
    pub overwrite_existing: bool,
    /// 界面语言（"en" = 英文，"zh" = 中文），默认英文
    pub language: String,
}

impl Default for AppSettings {
    /// 提供合理的默认设置值
    ///
    /// - 输出目录为空（与源文件同目录）
    /// - 启用硬件加速
    /// - 单并发
    /// - 完成后通知但不自动打开
    /// - 默认后缀 "_output"
    /// - 不自动覆盖
    fn default() -> Self {
        Self {
            output_directory: String::new(),
            hardware_accel: true,
            max_concurrent: 1,
            notify_on_complete: true,
            open_on_complete: false,
            output_suffix: "_output".to_string(),
            overwrite_existing: false,
            language: "en".to_string(),
        }
    }
}
