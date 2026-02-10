/// Subtitle processing command
///
/// Three modes:
/// - Embed: add soft subtitles (switchable in player)
/// - Extract: extract subtitle stream to a standalone file
/// - BurnIn: burn hard subtitles into the video frames

use tauri::ipc::Channel;

use crate::engine::builder::build_subtitle_command;
use crate::engine::process::{run_ffmpeg, run_ffprobe};
use crate::models::media::FfprobeOutput;
use crate::models::preset::{SubtitleMode, SubtitleParams};
use crate::models::task::TaskEvent;

/// Execute subtitle processing
///
/// Selects the processing strategy based on the `mode` field.
/// Embed and BurnIn modes require an external subtitle file path.
/// Extract mode outputs the specified subtitle stream as a standalone file.
///
/// For Extract mode, validates that the input video actually contains
/// subtitle streams before attempting extraction — avoids the confusing
/// "Error opening output files: Invalid argument" from ffmpeg.
///
/// @param app - Tauri AppHandle
/// @param params - Subtitle processing parameters (mode, subtitle path, style, etc.)
/// @param on_progress - Progress push Channel
/// @returns Ok(String) task ID, or Err(String) error description
#[tauri::command]
pub async fn process_subtitle(
    app: tauri::AppHandle,
    params: SubtitleParams,
    on_progress: Channel<TaskEvent>,
) -> Result<String, String> {
    let task_id = uuid::Uuid::new_v4().to_string();

    // For Embed/BurnIn modes: validate that the subtitle file exists and is readable
    if matches!(params.mode, SubtitleMode::Embed | SubtitleMode::BurnIn) {
        match &params.subtitle_path {
            Some(path) if !path.is_empty() => {
                let meta = std::fs::metadata(path);
                match meta {
                    Ok(m) if m.len() == 0 => {
                        return Err(format!("Subtitle file is empty: {}", path));
                    }
                    Err(e) => {
                        return Err(format!(
                            "Cannot read subtitle file '{}': {}",
                            path, e
                        ));
                    }
                    _ => {}
                }
            }
            _ => {
                return Err(
                    "No subtitle file selected. Please choose a subtitle file (.srt, .ass, .vtt)."
                        .to_string(),
                );
            }
        }
    }

    // Probe input file for duration and stream info
    let json_str = run_ffprobe(&app, &params.input_path).await?;
    let probe_output: FfprobeOutput = serde_json::from_str(&json_str)
        .map_err(|e| format!("Failed to parse ffprobe output: {}", e))?;

    let duration = probe_output
        .format
        .as_ref()
        .and_then(|f| f.duration.as_ref())
        .and_then(|d| d.parse::<f64>().ok())
        .unwrap_or(0.0);

    // For Extract mode: verify the video has subtitle streams before proceeding.
    // Without this check, ffmpeg fails with "Error opening output files: Invalid argument"
    // when -map 0:s:0 can't find a subtitle stream.
    if matches!(params.mode, SubtitleMode::Extract) {
        let subtitle_count = probe_output
            .streams
            .as_ref()
            .map(|streams| {
                streams
                    .iter()
                    .filter(|s| s.codec_type.as_deref() == Some("subtitle"))
                    .count()
            })
            .unwrap_or(0);

        if subtitle_count == 0 {
            return Err(
                "No embedded subtitle streams found in this video. Only videos with built-in subtitles can be extracted."
                    .to_string(),
            );
        }

        // Validate the requested subtitle index
        let requested_index = params.subtitle_index.unwrap_or(0) as usize;
        if requested_index >= subtitle_count {
            return Err(format!(
                "Subtitle stream index {} out of range. This video has {} subtitle stream(s).",
                requested_index, subtitle_count
            ));
        }
    }

    // Build ffmpeg command
    let args = build_subtitle_command(&params);

    // Execute ffmpeg
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
        // For Embed mode: verify the output file actually contains subtitle streams.
        // This catches silent failures where ffmpeg exits 0 but drops the subtitle track.
        if matches!(params.mode, SubtitleMode::Embed) {
            let verify_json = run_ffprobe(&app, &params.output_path).await?;
            let verify_output: FfprobeOutput = serde_json::from_str(&verify_json)
                .map_err(|e| format!("Failed to verify output: {}", e))?;

            let sub_count = verify_output
                .streams
                .as_ref()
                .map(|streams| {
                    streams
                        .iter()
                        .filter(|s| s.codec_type.as_deref() == Some("subtitle"))
                        .count()
                })
                .unwrap_or(0);

            if sub_count == 0 {
                return Err(
                    "Subtitle embedding failed: the output file contains no subtitle tracks. Please check the subtitle file format."
                        .to_string(),
                );
            }
        }

        Ok(task_id)
    }
}
