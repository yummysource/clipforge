/// GIF 制作 command
///
/// 使用 ffmpeg 高质量两步法（palettegen + paletteuse）
/// 将视频片段转换为色彩还原度高的 GIF 动图

use tauri::ipc::Channel;

use crate::engine::builder::build_gif_command;
use crate::engine::process::run_ffmpeg;
use crate::models::preset::GifParams;
use crate::models::task::TaskEvent;

/// 执行 GIF 制作
///
/// 从视频中截取指定时间范围的片段，
/// 通过调色板优化算法生成高质量 GIF。
/// 支持自定义帧率、尺寸、颜色数和抖动算法
///
/// # 参数
/// - `app` - Tauri AppHandle
/// - `params` - GIF 制作参数（时间范围、尺寸、帧率等）
/// - `on_progress` - 进度推送 Channel
///
/// # 返回
/// - `Ok(String)` - 任务 ID
/// - `Err(String)` - 错误描述
#[tauri::command]
pub async fn create_gif(
    app: tauri::AppHandle,
    params: GifParams,
    on_progress: Channel<TaskEvent>,
) -> Result<String, String> {
    let task_id = uuid::Uuid::new_v4().to_string();

    // GIF 的进度基准为截取片段的时长
    let total_duration = params.duration;

    // 构建 GIF 制作命令
    let args = build_gif_command(&params);

    // 执行 ffmpeg
    let result = run_ffmpeg(
        &app,
        &task_id,
        args,
        total_duration,
        &params.output_path,
        &on_progress,
    )
    .await?;

    {
        let mut queue = crate::engine::queue::TASK_QUEUE.lock().await;
        queue.cleanup(&task_id);
    }

    if result.error.is_some() {
        Err(result.error.unwrap())
    } else {
        Ok(task_id)
    }
}
