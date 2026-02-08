/// 数据模型模块
///
/// 导出所有数据结构定义，包括媒体信息、任务状态、
/// 功能参数预设和应用设置

/// 媒体文件信息（ffprobe 解析结果）
pub mod media;
/// 预设参数结构体（各功能的 command 参数类型）
pub mod preset;
/// 应用设置
pub mod settings;
/// 任务状态与事件
pub mod task;
