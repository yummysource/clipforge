/// 分辨率/帧率调整 command
///
/// 调整视频的分辨率和/或帧率，支持保持宽高比、
/// 填充黑边、裁切等多种宽高比处理模式

use tauri::ipc::Channel;

use crate::engine::builder::build_resize_command;
use crate::engine::process::{run_ffmpeg, run_ffprobe};
use crate::models::media::FfprobeOutput;
use crate::models::preset::ResizeParams;
use crate::models::task::TaskEvent;

/// 执行分辨率/帧率调整
///
/// 使用 scale/fps 滤镜调整视频参数，
/// 支持多种缩放算法（lanczos/bilinear/bicubic）
///
/// # 参数
/// - `app` - Tauri AppHandle
/// - `params` - 调整参数（目标分辨率、帧率、缩放模式等）
/// - `on_progress` - 进度推送 Channel
///
/// # 返回
/// - `Ok(String)` - 任务 ID
/// - `Err(String)` - 错误描述
#[tauri::command]
pub async fn resize_video(
    app: tauri::AppHandle,
    params: ResizeParams,
    on_progress: Channel<TaskEvent>,
) -> Result<String, String> {
    let task_id = uuid::Uuid::new_v4().to_string();

    // 获取输入文件时长
    let duration = get_duration(&app, &params.input_path).await?;

    // 构建分辨率/帧率调整命令
    let args = build_resize_command(&params);

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

/// 从 ffprobe 获取视频时长
async fn get_duration(app: &tauri::AppHandle, file_path: &str) -> Result<f64, String> {
    let json_str = run_ffprobe(app, file_path).await?;
    let output: FfprobeOutput = serde_json::from_str(&json_str)
        .map_err(|e| format!("解析 ffprobe 输出失败: {}", e))?;
    Ok(output
        .format
        .as_ref()
        .and_then(|f| f.duration.as_ref())
        .and_then(|d| d.parse::<f64>().ok())
        .unwrap_or(0.0))
}
