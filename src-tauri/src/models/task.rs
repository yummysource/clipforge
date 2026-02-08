/// 任务状态与事件数据模型
///
/// 定义 ffmpeg 任务执行过程中的状态枚举、进度更新和任务事件结构体，
/// TaskEvent 通过 Tauri Channel 实时推送给前端

use serde::{Deserialize, Serialize};

/// 任务状态枚举
///
/// 表示一个 ffmpeg 任务在其生命周期中的当前状态
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum TaskStatus {
    /// 等待执行（在队列中排队）
    Pending,
    /// 正在执行（ffmpeg 进程运行中）
    Running,
    /// 执行完成（输出文件已生成）
    Completed,
    /// 已取消（用户主动取消或队列清空）
    Cancelled,
    /// 执行失败（ffmpeg 进程出错退出）
    Failed,
}

/// 通过 Tauri Channel 推送的任务事件
///
/// 使用带标签的枚举实现类型安全的事件分发，
/// 前端通过 Channel.onmessage 回调接收这些事件并更新 UI
///
/// JSON 序列化格式为 `{ "event": "started", "data": { ... } }`
#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase", tag = "event", content = "data")]
pub enum TaskEvent {
    /// 任务开始执行事件
    ///
    /// ffmpeg 进程成功启动后发送，前端据此初始化进度条
    #[serde(rename_all = "camelCase")]
    Started {
        /// 任务唯一标识（UUID v4）
        task_id: String,
        /// 视频总时长（秒），用于计算进度百分比
        total_duration: f64,
    },

    /// 进度更新事件
    ///
    /// ffmpeg 处理过程中周期性发送，前端据此更新进度条和状态信息
    Progress(ProgressUpdate),

    /// 任务完成事件
    ///
    /// ffmpeg 进程正常退出后发送，包含输出文件信息
    #[serde(rename_all = "camelCase")]
    Completed {
        /// 任务唯一标识
        task_id: String,
        /// 输出文件的完整路径
        output_path: String,
        /// 输出文件大小（字节）
        output_size: u64,
        /// 任务执行耗时（秒）
        elapsed: f64,
    },

    /// 任务失败事件
    ///
    /// ffmpeg 进程异常退出或内部出错时发送，包含错误描述
    #[serde(rename_all = "camelCase")]
    Failed {
        /// 任务唯一标识
        task_id: String,
        /// 错误描述信息
        error: String,
    },

    /// 任务取消事件
    ///
    /// 用户主动取消任务后发送
    #[serde(rename_all = "camelCase")]
    Cancelled {
        /// 任务唯一标识
        task_id: String,
    },
}

/// 进度更新数据
///
/// 从 ffmpeg `-progress pipe:1` 输出中解析得到的实时进度信息，
/// 前端用于驱动进度条和显示处理统计
#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ProgressUpdate {
    /// 任务唯一标识
    pub task_id: String,
    /// 进度百分比（0.0 - 100.0）
    pub percent: f64,
    /// 处理速度倍率（如 2.5 表示 2.5x 实时速度）
    pub speed: f64,
    /// 已处理的时间位置（秒）
    pub current_time: f64,
    /// 预估剩余时间（秒）
    pub eta: f64,
    /// 当前输出文件大小（字节）
    pub output_size: u64,
    /// 已处理帧数
    pub frame: u64,
    /// 当前处理帧率（fps）
    pub fps: f64,
}

/// 任务执行结果
///
/// 任务完成（无论成功/失败/取消）后的最终状态汇总，
/// 作为 command 函数的返回值传递给前端
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct TaskResult {
    /// 任务唯一标识（UUID v4）
    pub task_id: String,
    /// 最终状态
    pub status: TaskStatus,
    /// 输出文件路径（失败或取消时为 None）
    pub output_path: Option<String>,
    /// 输出文件大小（字节，失败或取消时为 None）
    pub output_size: Option<u64>,
    /// 执行耗时（秒，失败或取消时为 None）
    pub elapsed: Option<f64>,
    /// 错误信息（仅在失败时有值）
    pub error: Option<String>,
}
