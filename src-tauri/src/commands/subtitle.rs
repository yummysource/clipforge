/// 字幕处理 command
///
/// 支持三种模式：
/// - Embed: 嵌入软字幕（可切换显示）
/// - Extract: 提取字幕流为独立文件
/// - BurnIn: 烧录硬字幕（不可关闭）

use tauri::ipc::Channel;

use crate::engine::builder::build_subtitle_command;
use crate::engine::process::{run_ffmpeg, run_ffprobe};
use crate::models::media::FfprobeOutput;
use crate::models::preset::SubtitleParams;
use crate::models::task::TaskEvent;

/// 执行字幕处理
///
/// 根据 mode 字段选择字幕处理策略。
/// 嵌入和烧录模式需要提供外部字幕文件路径或指定内嵌字幕流索引。
/// 提取模式将指定的字幕流输出为独立文件
///
/// # 参数
/// - `app` - Tauri AppHandle
/// - `params` - 字幕处理参数（模式、字幕路径、样式等）
/// - `on_progress` - 进度推送 Channel
///
/// # 返回
/// - `Ok(String)` - 任务 ID
/// - `Err(String)` - 错误描述
#[tauri::command]
pub async fn process_subtitle(
    app: tauri::AppHandle,
    params: SubtitleParams,
    on_progress: Channel<TaskEvent>,
) -> Result<String, String> {
    let task_id = uuid::Uuid::new_v4().to_string();

    // 获取输入文件时长
    let duration = get_duration(&app, &params.input_path).await?;

    // 构建字幕处理命令
    let args = build_subtitle_command(&params);

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
