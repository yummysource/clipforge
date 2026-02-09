/// Watermark overlay command
///
/// Supports image watermarks (overlay filter) and text watermarks.
/// Text watermarks are pre-rendered to PNG images since the bundled ffmpeg
/// lacks the drawtext filter (requires libfreetype).
/// Configurable position, size, and opacity.

use tauri::ipc::Channel;

use crate::engine::builder::build_watermark_command;
use crate::engine::process::{run_ffmpeg, run_ffprobe};
use crate::models::media::FfprobeOutput;
use crate::models::preset::{WatermarkParams, WatermarkType};
use crate::models::task::TaskEvent;
use crate::utils::text_image;

/// Execute watermark overlay
///
/// Places an image or text watermark onto the video.
/// For text watermarks: renders text to a temporary PNG first, then overlays
/// using the same filter chain as image watermarks (overlay filter).
/// Supports 9-grid preset positions and custom offsets.
///
/// @param app - Tauri AppHandle
/// @param params - Watermark parameters (type, position, style, etc.)
/// @param on_progress - Progress push Channel
/// @returns Ok(String) task ID, or Err(String) error description
#[tauri::command]
pub async fn add_watermark(
    app: tauri::AppHandle,
    params: WatermarkParams,
    on_progress: Channel<TaskEvent>,
) -> Result<String, String> {
    let task_id = uuid::Uuid::new_v4().to_string();

    // Get input file duration
    let duration = get_duration(&app, &params.input_path).await?;

    // For text watermarks: render text to a temporary PNG image,
    // then convert to image watermark params for the overlay approach
    let (effective_params, _text_image_path) = prepare_watermark_params(params)?;

    // Build ffmpeg command
    let args = build_watermark_command(&effective_params);

    // Execute ffmpeg
    let result = run_ffmpeg(
        &app,
        &task_id,
        args,
        duration,
        &effective_params.output_path,
        &on_progress,
    )
    .await?;

    // Clean up the temporary text image (if any)
    if let Some(ref path) = _text_image_path {
        text_image::cleanup_text_image(path);
    }

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

/// Prepare effective watermark params
///
/// For image watermarks, returns params unchanged.
/// For text watermarks, renders text to a temporary PNG and converts
/// the params to image watermark type (with image_scale = None to skip scaling).
///
/// @param params - Original watermark parameters from frontend
/// @returns (effective params, optional temp image path for cleanup)
fn prepare_watermark_params(
    params: WatermarkParams,
) -> Result<(WatermarkParams, Option<std::path::PathBuf>), String> {
    match params.watermark_type {
        WatermarkType::Image => Ok((params, None)),
        WatermarkType::Text => {
            let text = params.text.as_deref().unwrap_or("Watermark");
            let font_size = params.font_size.unwrap_or(24);
            let font_color = params.font_color.as_deref().unwrap_or("#FFFFFF");
            let border_width = params.border_width.unwrap_or(2);
            let border_color = params.border_color.as_deref().unwrap_or("#000000");

            // Render text to PNG
            let png_path = text_image::render_text_to_png(
                text,
                font_size,
                font_color,
                border_width,
                border_color,
            )?;

            // Convert to image watermark params (overlay approach)
            let mut img_params = params;
            img_params.watermark_type = WatermarkType::Image;
            img_params.image_path = Some(png_path.to_string_lossy().to_string());
            // Set image_scale to None — text image is pre-rendered at exact pixel size,
            // no scaling via scale2ref needed
            img_params.image_scale = None;

            Ok((img_params, Some(png_path)))
        }
    }
}

/// Get video duration from ffprobe
async fn get_duration(app: &tauri::AppHandle, file_path: &str) -> Result<f64, String> {
    let json_str = run_ffprobe(app, file_path).await?;
    let output: FfprobeOutput = serde_json::from_str(&json_str)
        .map_err(|e| format!("Failed to parse ffprobe output: {}", e))?;
    Ok(output
        .format
        .as_ref()
        .and_then(|f| f.duration.as_ref())
        .and_then(|d| d.parse::<f64>().ok())
        .unwrap_or(0.0))
}
