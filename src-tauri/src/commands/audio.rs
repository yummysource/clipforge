/// 音频处理 command
///
/// 支持四种模式：提取音频、替换音轨、静音、音量调节，
/// 每种模式对应不同的 ffmpeg 命令构建逻辑

use tauri::ipc::Channel;

use crate::engine::builder::build_audio_command;
use crate::engine::process::{run_ffmpeg, run_ffprobe};
use crate::models::media::FfprobeOutput;
use crate::models::preset::AudioParams;
use crate::models::task::TaskEvent;

/// 执行音频处理
///
/// 根据 mode 字段选择音频处理策略：
/// - Extract: 从视频中提取纯音频文件
/// - Replace: 用外部音频替换视频原有音轨
/// - Mute: 删除音轨（输出静音视频）
/// - Adjust: 音量调节/标准化/淡入淡出
///
/// # 参数
/// - `app` - Tauri AppHandle
/// - `params` - 音频处理参数
/// - `on_progress` - 进度推送 Channel
///
/// # 返回
/// - `Ok(String)` - 任务 ID
/// - `Err(String)` - 错误描述
#[tauri::command]
pub async fn process_audio(
    app: tauri::AppHandle,
    params: AudioParams,
    on_progress: Channel<TaskEvent>,
) -> Result<String, String> {
    let task_id = uuid::Uuid::new_v4().to_string();

    // 获取输入文件时长
    let duration = get_duration(&app, &params.input_path).await?;

    // 构建音频处理命令
    let args = build_audio_command(&params, duration);

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
