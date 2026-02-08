/// 视频合并 command
///
/// 将多个视频文件合并为一个，支持直接拼接（concat demuxer）
/// 和带转场效果的合并（filter_complex）两种模式

use tauri::ipc::Channel;

use crate::engine::builder::build_merge_command;
use crate::engine::process::{run_ffmpeg, run_ffprobe};
use crate::models::media::FfprobeOutput;
use crate::models::preset::MergeParams;
use crate::models::task::TaskEvent;
use crate::utils::path::{cleanup_temp_file, temp_file_path};

/// 执行视频合并
///
/// 根据参数决定使用 concat demuxer（同格式快速拼接）
/// 或 filter_complex（不同格式归一化 + 可选转场）。
/// concat demuxer 模式需要创建临时的文件列表
///
/// # 参数
/// - `app` - Tauri AppHandle
/// - `params` - 合并参数（输入文件列表、转场设置等）
/// - `on_progress` - 进度推送 Channel
///
/// # 返回
/// - `Ok(String)` - 任务 ID
/// - `Err(String)` - 错误描述
#[tauri::command]
pub async fn merge_videos(
    app: tauri::AppHandle,
    params: MergeParams,
    on_progress: Channel<TaskEvent>,
) -> Result<String, String> {
    // 验证至少有两个输入文件
    if params.input_paths.len() < 2 {
        return Err("至少需要两个视频文件才能合并".to_string());
    }

    let task_id = uuid::Uuid::new_v4().to_string();

    // 计算所有输入文件的总时长
    let mut total_duration = 0.0;
    for path in &params.input_paths {
        total_duration += get_duration(&app, path).await.unwrap_or(0.0);
    }

    // 为 concat demuxer 创建临时文件列表
    let concat_file = temp_file_path("concat", "txt")?;
    let concat_content = params
        .input_paths
        .iter()
        .map(|p| format!("file '{}'", p.replace('\'', "'\\''")))
        .collect::<Vec<_>>()
        .join("\n");
    std::fs::write(&concat_file, &concat_content)
        .map_err(|e| format!("创建合并文件列表失败: {}", e))?;

    // 构建合并命令
    let args = build_merge_command(&params, &concat_file);

    // 执行 ffmpeg
    let result = run_ffmpeg(
        &app,
        &task_id,
        args,
        total_duration,
        &params.output_path,
        &on_progress,
    )
    .await;

    // 清理临时文件
    cleanup_temp_file(&concat_file);

    {
        let mut queue = crate::engine::queue::TASK_QUEUE.lock().await;
        queue.cleanup(&task_id);
    }

    let result = result?;
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
