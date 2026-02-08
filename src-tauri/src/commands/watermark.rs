/// 水印叠加 command
///
/// 支持图片水印（overlay 滤镜）和文字水印（drawtext 滤镜），
/// 可配置位置、大小、透明度等参数

use tauri::ipc::Channel;

use crate::engine::builder::build_watermark_command;
use crate::engine::process::{run_ffmpeg, run_ffprobe};
use crate::models::media::FfprobeOutput;
use crate::models::preset::WatermarkParams;
use crate::models::task::TaskEvent;

/// 执行水印叠加
///
/// 将图片或文字水印叠加到视频画面上。
/// 支持九宫格预设位置和自定义偏移
///
/// # 参数
/// - `app` - Tauri AppHandle
/// - `params` - 水印参数（水印类型、位置、样式等）
/// - `on_progress` - 进度推送 Channel
///
/// # 返回
/// - `Ok(String)` - 任务 ID
/// - `Err(String)` - 错误描述
#[tauri::command]
pub async fn add_watermark(
    app: tauri::AppHandle,
    params: WatermarkParams,
    on_progress: Channel<TaskEvent>,
) -> Result<String, String> {
    let task_id = uuid::Uuid::new_v4().to_string();

    // 获取输入文件时长
    let duration = get_duration(&app, &params.input_path).await?;

    // 构建水印命令
    let args = build_watermark_command(&params);

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
