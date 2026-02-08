/// 视频压缩 command
///
/// 支持三种压缩模式：按目标大小、按压缩比例、按质量等级。
/// 根据模式选择不同的码率/CRF 策略实现视频体积缩减

use tauri::ipc::Channel;

use crate::engine::builder::build_compress_command;
use crate::engine::process::{run_ffmpeg, run_ffprobe};
use crate::models::media::FfprobeOutput;
use crate::models::preset::CompressParams;
use crate::models::task::TaskEvent;

/// 执行视频压缩
///
/// 先通过 ffprobe 获取输入视频的时长和码率信息，
/// 然后根据压缩模式构建 ffmpeg 命令并执行
///
/// # 参数
/// - `app` - Tauri AppHandle
/// - `params` - 视频压缩参数（压缩模式、目标大小/比例/质量等）
/// - `on_progress` - 进度推送 Channel
///
/// # 返回
/// - `Ok(String)` - 任务 ID
/// - `Err(String)` - 错误描述
#[tauri::command]
pub async fn compress_video(
    app: tauri::AppHandle,
    params: CompressParams,
    on_progress: Channel<TaskEvent>,
) -> Result<String, String> {
    let task_id = uuid::Uuid::new_v4().to_string();

    // 获取输入文件的时长和码率（用于压缩计算）
    let (duration, bitrate) = get_media_stats(&app, &params.input_path).await?;

    // 构建压缩命令
    let args = build_compress_command(&params, duration, bitrate);

    // 执行 ffmpeg
    let result = run_ffmpeg(
        &app,
        &task_id,
        args,
        duration,
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

/// 获取视频的时长和总码率
async fn get_media_stats(
    app: &tauri::AppHandle,
    file_path: &str,
) -> Result<(f64, u64), String> {
    let json_str = run_ffprobe(app, file_path).await?;
    let output: FfprobeOutput = serde_json::from_str(&json_str)
        .map_err(|e| format!("解析 ffprobe 输出失败: {}", e))?;

    let format = output.format.as_ref();
    let duration = format
        .and_then(|f| f.duration.as_ref())
        .and_then(|d| d.parse::<f64>().ok())
        .unwrap_or(0.0);
    let bitrate = format
        .and_then(|f| f.bit_rate.as_ref())
        .and_then(|b| b.parse::<u64>().ok())
        .unwrap_or(0);

    Ok((duration, bitrate))
}
