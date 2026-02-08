/// 媒体信息获取 command
///
/// 调用 ffprobe sidecar 获取视频文件的完整元信息，
/// 包括视频/音频/字幕流的编码器、分辨率、帧率、码率等

use crate::engine::process::run_ffprobe;
use crate::models::media::{FfprobeOutput, MediaInfo};

/// 获取媒体文件信息
///
/// 前端拖入文件后调用此 command 获取文件详情，
/// 用于展示文件信息和为后续操作提供参数依据
///
/// # 参数
/// - `app` - Tauri AppHandle，用于调用 ffprobe sidecar
/// - `file_path` - 媒体文件完整路径
///
/// # 返回
/// - `Ok(MediaInfo)` - 解析后的媒体信息
/// - `Err(String)` - ffprobe 执行失败或 JSON 解析失败
#[tauri::command]
pub async fn get_media_info(
    app: tauri::AppHandle,
    file_path: String,
) -> Result<MediaInfo, String> {
    // 调用 ffprobe 获取 JSON 输出
    let json_str = run_ffprobe(&app, &file_path).await?;

    // 解析 JSON 为内部结构体
    let ffprobe_output: FfprobeOutput = serde_json::from_str(&json_str)
        .map_err(|e| format!("解析 ffprobe JSON 输出失败: {}", e))?;

    // 转换为应用内部使用的 MediaInfo
    Ok(ffprobe_output.to_media_info(&file_path))
}
