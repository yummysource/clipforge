/// 格式转换 command
///
/// 接收前端传来的转换参数，通过 ffmpeg 引擎执行格式转换，
/// 支持多种目标格式和编码器选择，可选硬件加速

use tauri::ipc::Channel;

use crate::engine::builder::build_convert_command;
use crate::engine::process::{run_ffmpeg, run_ffprobe};
use crate::models::media::FfprobeOutput;
use crate::models::preset::ConvertParams;
use crate::models::task::TaskEvent;

/// 执行视频格式转换
///
/// 构建 ffmpeg 转码命令并异步执行，通过 Channel 实时推送进度。
/// 支持 H.264/H.265/VP9/ProRes 等编码器和直接封装模式
///
/// # 参数
/// - `app` - Tauri AppHandle
/// - `params` - 格式转换参数（输入路径、输出格式、编码器等）
/// - `on_progress` - 进度推送 Channel
///
/// # 返回
/// - `Ok(String)` - 任务 ID（UUID v4 格式）
/// - `Err(String)` - 启动失败的错误描述
#[tauri::command]
pub async fn convert_video(
    app: tauri::AppHandle,
    params: ConvertParams,
    on_progress: Channel<TaskEvent>,
) -> Result<String, String> {
    // 生成唯一任务 ID
    let task_id = uuid::Uuid::new_v4().to_string();

    // 获取输入文件时长（用于进度计算）
    let total_duration = get_duration(&app, &params.input_path).await?;

    // 构建 ffmpeg 命令参数
    let args = build_convert_command(&params);

    // 启动 ffmpeg 进程并等待完成
    let result = run_ffmpeg(
        &app,
        &task_id,
        args,
        total_duration,
        &params.output_path,
        &on_progress,
    )
    .await?;

    // 清理任务队列记录
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

/// 从 ffprobe 输出中获取视频时长
async fn get_duration(app: &tauri::AppHandle, file_path: &str) -> Result<f64, String> {
    let json_str = run_ffprobe(app, file_path).await?;
    let output: FfprobeOutput = serde_json::from_str(&json_str)
        .map_err(|e| format!("解析 ffprobe 输出失败: {}", e))?;
    let duration = output
        .format
        .as_ref()
        .and_then(|f| f.duration.as_ref())
        .and_then(|d| d.parse::<f64>().ok())
        .unwrap_or(0.0);
    Ok(duration)
}
