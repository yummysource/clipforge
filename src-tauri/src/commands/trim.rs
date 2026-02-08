/// 视频裁剪 command
///
/// 支持单片段和多片段裁剪，可选精确切割（重编码）或快速切割（流复制）。
/// 多片段裁剪时先分别切割各片段到临时文件，再合并为最终输出

use std::time::Instant;

use tauri::ipc::Channel;

use crate::engine::builder::{build_trim_command, build_trim_segment_command, FfmpegCommand};
use crate::engine::process::{run_ffmpeg, run_ffmpeg_quiet, run_ffprobe};
use crate::models::media::FfprobeOutput;
use crate::models::preset::TrimParams;
use crate::models::task::{ProgressUpdate, TaskEvent};
use crate::utils::path::{cleanup_temp_file, file_extension, get_file_size, temp_file_path};

/// 执行视频裁剪
///
/// 根据参数中的时间片段列表裁剪视频：
/// - 单片段：直接裁剪到输出文件，带实时进度
/// - 多片段 + 合并：各片段切割到临时文件，再用 concat demuxer 合并
/// - 多片段 + 不合并：各片段分别输出为独立文件（带序号后缀）
///
/// # 参数
/// - `app` - Tauri AppHandle
/// - `params` - 裁剪参数（时间片段、精确切割开关、合并开关等）
/// - `on_progress` - 进度推送 Channel
///
/// # 返回
/// - `Ok(String)` - 任务 ID
/// - `Err(String)` - 错误描述
#[tauri::command]
pub async fn trim_video(
    app: tauri::AppHandle,
    params: TrimParams,
    on_progress: Channel<TaskEvent>,
) -> Result<String, String> {
    // 验证至少有一个裁剪片段
    if params.segments.is_empty() {
        return Err("至少需要一个裁剪片段".to_string());
    }

    let task_id = uuid::Uuid::new_v4().to_string();

    // === 单片段：直接裁剪，带实时进度 ===
    if params.segments.len() == 1 {
        let segment = &params.segments[0];
        let segment_duration = segment.end - segment.start;

        // 精确切割用片段时长做进度基准；快速切割用整个视频时长（copy 进度不太准）
        let total_duration = if params.precise_cut {
            segment_duration
        } else {
            get_duration(&app, &params.input_path)
                .await
                .unwrap_or(segment_duration)
        };

        let args = build_trim_command(&params);

        let result = run_ffmpeg(
            &app,
            &task_id,
            args,
            total_duration,
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
    } else if params.merge_segments {
        // === 多片段 + 合并：先分别切割，再 concat 合并 ===
        trim_multi_merge(&app, &task_id, &params, &on_progress).await
    } else {
        // === 多片段 + 不合并：各片段输出为独立文件 ===
        trim_multi_separate(&app, &task_id, &params, &on_progress).await
    }
}

/// 多片段裁剪 + 合并为一个文件
///
/// 工作流程：
/// 1. 逐个片段裁剪到临时文件（使用 run_ffmpeg_quiet，不推送单步事件）
/// 2. 创建 concat demuxer 文件列表
/// 3. 使用 ffmpeg concat demuxer 合并所有临时文件（-c copy 极快）
/// 4. 清理所有临时文件
/// 5. 手动推送 Completed 事件
async fn trim_multi_merge(
    app: &tauri::AppHandle,
    task_id: &str,
    params: &TrimParams,
    on_progress: &Channel<TaskEvent>,
) -> Result<String, String> {
    let start_time = Instant::now();
    let total_segments_duration: f64 = params.segments.iter().map(|s| s.end - s.start).sum();
    let ext = file_extension(&params.output_path);

    // 通知前端任务开始
    let _ = on_progress.send(TaskEvent::Started {
        task_id: task_id.to_string(),
        total_duration: total_segments_duration,
    });

    let mut temp_files: Vec<String> = Vec::new();
    let mut processed_duration: f64 = 0.0;

    // 步骤 1：逐个片段裁剪到临时文件
    for (i, segment) in params.segments.iter().enumerate() {
        let temp_path = temp_file_path(&format!("trim_seg_{}", i), &ext)?;
        let segment_duration = segment.end - segment.start;

        let args = build_trim_segment_command(
            &params.input_path,
            &temp_path,
            segment.start,
            segment.end,
            params.precise_cut,
            false, // 中间步骤不需要 -progress
        );

        run_ffmpeg_quiet(app, args).await.map_err(|e| {
            // 出错时清理已生成的临时文件
            for temp in &temp_files {
                cleanup_temp_file(temp);
            }
            format!("裁剪第 {} 段失败: {}", i + 1, e)
        })?;

        temp_files.push(temp_path);
        processed_duration += segment_duration;

        // 推送整体进度（片段切割占 0-90%，合并占 90-100%）
        let percent = (processed_duration / total_segments_duration * 90.0).min(90.0);
        let _ = on_progress.send(TaskEvent::Progress(ProgressUpdate {
            task_id: task_id.to_string(),
            percent,
            speed: 0.0,
            current_time: processed_duration,
            eta: 0.0,
            output_size: 0,
            frame: 0,
            fps: 0.0,
        }));
    }

    // 步骤 2：创建 concat demuxer 文件列表
    let concat_file = temp_file_path("concat_trim", "txt")?;
    let concat_content = temp_files
        .iter()
        .map(|p| format!("file '{}'", p.replace('\'', "'\\''")))
        .collect::<Vec<_>>()
        .join("\n");
    std::fs::write(&concat_file, &concat_content)
        .map_err(|e| format!("创建合并文件列表失败: {}", e))?;

    // 步骤 3：使用 concat demuxer 合并（-c copy，极快）
    // -f concat 和 -safe 0 必须在 -i 之前，告诉 ffmpeg 输入格式为 concat demuxer
    let concat_args = FfmpegCommand::new()
        .pre_args_pair("-f", "concat")
        .pre_args_pair("-safe", "0")
        .input(&concat_file)
        .video_codec("copy")
        .audio_codec("copy")
        .output(&params.output_path)
        .build();

    let concat_result = run_ffmpeg_quiet(app, concat_args).await;

    // 步骤 4：清理临时文件（无论成功失败都清理）
    cleanup_temp_file(&concat_file);
    for temp in &temp_files {
        cleanup_temp_file(temp);
    }

    // 检查合并结果
    concat_result.map_err(|e| format!("合并片段失败: {}", e))?;

    let elapsed = start_time.elapsed().as_secs_f64();
    let output_size = get_file_size(&params.output_path);

    // 推送完成事件
    let _ = on_progress.send(TaskEvent::Completed {
        task_id: task_id.to_string(),
        output_path: params.output_path.clone(),
        output_size,
        elapsed,
    });

    {
        let mut queue = crate::engine::queue::TASK_QUEUE.lock().await;
        queue.cleanup(task_id);
    }

    Ok(task_id.to_string())
}

/// 多片段裁剪 + 分别输出为独立文件
///
/// 每个片段输出为带序号后缀的独立文件，如 video_1.mp4、video_2.mp4。
/// 各步骤使用 run_ffmpeg_quiet 执行，由本函数统一管理进度事件
async fn trim_multi_separate(
    app: &tauri::AppHandle,
    task_id: &str,
    params: &TrimParams,
    on_progress: &Channel<TaskEvent>,
) -> Result<String, String> {
    let start_time = Instant::now();
    let total_segments_duration: f64 = params.segments.iter().map(|s| s.end - s.start).sum();

    // 通知前端任务开始
    let _ = on_progress.send(TaskEvent::Started {
        task_id: task_id.to_string(),
        total_duration: total_segments_duration,
    });

    let mut processed_duration: f64 = 0.0;
    let mut last_output_path = String::new();

    for (i, segment) in params.segments.iter().enumerate() {
        let output_path = generate_indexed_output(&params.output_path, i + 1);
        let segment_duration = segment.end - segment.start;

        let args = build_trim_segment_command(
            &params.input_path,
            &output_path,
            segment.start,
            segment.end,
            params.precise_cut,
            false, // 中间步骤不需要 -progress
        );

        run_ffmpeg_quiet(app, args)
            .await
            .map_err(|e| format!("裁剪第 {} 段失败: {}", i + 1, e))?;

        processed_duration += segment_duration;
        let percent = (processed_duration / total_segments_duration * 100.0).min(100.0);
        let _ = on_progress.send(TaskEvent::Progress(ProgressUpdate {
            task_id: task_id.to_string(),
            percent,
            speed: 0.0,
            current_time: processed_duration,
            eta: 0.0,
            output_size: 0,
            frame: 0,
            fps: 0.0,
        }));

        last_output_path = output_path;
    }

    let elapsed = start_time.elapsed().as_secs_f64();
    let output_size = get_file_size(&last_output_path);

    // 推送完成事件（以最后一个输出文件为主）
    let _ = on_progress.send(TaskEvent::Completed {
        task_id: task_id.to_string(),
        output_path: last_output_path,
        output_size,
        elapsed,
    });

    {
        let mut queue = crate::engine::queue::TASK_QUEUE.lock().await;
        queue.cleanup(task_id);
    }

    Ok(task_id.to_string())
}

/// 生成带序号后缀的输出文件路径
///
/// 例如：`/path/video_output.mp4` + index 1 → `/path/video_output_1.mp4`
///
/// # 参数
/// - `output_path` - 原始输出路径
/// - `index` - 片段序号（从 1 开始）
///
/// # 返回
/// 带序号的输出路径
fn generate_indexed_output(output_path: &str, index: usize) -> String {
    let path = std::path::Path::new(output_path);
    let stem = path
        .file_stem()
        .unwrap_or_default()
        .to_string_lossy();
    let ext = path
        .extension()
        .unwrap_or_default()
        .to_string_lossy();
    let parent = path.parent().unwrap_or(std::path::Path::new(""));
    parent
        .join(format!("{}_{}.{}", stem, index, ext))
        .to_string_lossy()
        .to_string()
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
