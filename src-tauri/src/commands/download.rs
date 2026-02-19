/// 视频下载 command
///
/// 通过 yt-dlp sidecar 解析视频 URL 并下载。
/// 支持 YouTube、X（Twitter）、Instagram 等上千个站点。
///
/// 提供两个 command：
/// - `parse_video_url`：解析 URL 获取视频信息和可用格式列表
/// - `download_video`：按指定格式下载视频，实时推送进度

use std::time::Instant;

use tauri::ipc::Channel;
use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::CommandEvent;

use crate::models::preset::{DownloadParams, FormatInfo, VideoInfo};
use crate::models::task::{ProgressUpdate, TaskEvent};
use crate::utils::path::get_file_size;

/// 解析视频 URL，获取视频信息和可用格式列表
///
/// 调用 yt-dlp --dump-json 获取 JSON 格式的视频元数据，
/// 解析后返回标题、时长、缩略图和格式列表。
///
/// # 参数
/// - `app` - Tauri AppHandle
/// - `url` - 视频页面 URL
///
/// # 返回
/// - `Ok(VideoInfo)` - 解析成功的视频信息
/// - `Err(String)` - 错误描述
#[tauri::command]
pub async fn parse_video_url(
    app: tauri::AppHandle,
    url: String,
) -> Result<VideoInfo, String> {
    let output = app
        .shell()
        .sidecar("yt-dlp")
        .map_err(|e| format!("创建 yt-dlp sidecar 失败: {}", e))?
        .args(&[
            "--dump-json",
            "--no-download",
            "--no-warnings",
            "--no-playlist",
            &url,
        ])
        .output()
        .await
        .map_err(|e| format!("执行 yt-dlp 失败: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("解析失败: {}", extract_ytdlp_error(&stderr)));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let json: serde_json::Value = serde_json::from_str(&stdout)
        .map_err(|e| format!("解析 yt-dlp JSON 失败: {}", e))?;

    // 提取视频基本信息
    let title = json["title"].as_str().unwrap_or("未知标题").to_string();
    let duration = json["duration"].as_f64().unwrap_or(0.0);
    let thumbnail = json["thumbnail"].as_str().unwrap_or("").to_string();
    let uploader = json["uploader"].as_str()
        .or_else(|| json["channel"].as_str())
        .unwrap_or("未知")
        .to_string();

    // 识别平台
    let extractor = json["extractor_key"].as_str().unwrap_or("").to_lowercase();
    let platform = if extractor.contains("youtube") {
        "youtube"
    } else if extractor.contains("twitter") || extractor.contains("x") {
        "twitter"
    } else if extractor.contains("instagram") {
        "instagram"
    } else {
        &extractor
    }
    .to_string();

    // 解析格式列表，筛选出有意义的格式
    let formats = parse_formats(&json["formats"]);

    Ok(VideoInfo {
        title,
        duration,
        thumbnail,
        uploader,
        platform,
        formats,
    })
}

/// 下载视频到指定路径
///
/// 调用 yt-dlp 下载指定格式的视频，解析 stderr 中的进度信息
/// 并通过 Channel 推送给前端。
///
/// yt-dlp 的进度输出格式为：
/// `[download]  45.2% of ~50.00MiB at 2.50MiB/s ETA 00:11`
///
/// # 参数
/// - `app` - Tauri AppHandle
/// - `params` - 下载参数（URL、格式ID、输出路径）
/// - `on_progress` - 进度推送 Channel
///
/// # 返回
/// - `Ok(String)` - 任务 ID
/// - `Err(String)` - 错误描述
#[tauri::command]
pub async fn download_video(
    app: tauri::AppHandle,
    params: DownloadParams,
    on_progress: Channel<TaskEvent>,
) -> Result<String, String> {
    let task_id = uuid::Uuid::new_v4().to_string();
    let start_time = Instant::now();

    // 通知前端任务开始（时长设为 0，下载任务用百分比进度）
    let _ = on_progress.send(TaskEvent::Started {
        task_id: task_id.clone(),
        total_duration: 0.0,
    });

    // 构建 yt-dlp 下载参数
    // --newline: 每行输出一条进度（而非覆盖同一行），方便解析
    // --no-part: 不使用 .part 临时文件
    // --ffmpeg-location: 指定 ffmpeg 路径（用于合并音视频流）
    let ffmpeg_dir = get_sidecar_dir()?;

    let (mut rx, child) = app
        .shell()
        .sidecar("yt-dlp")
        .map_err(|e| format!("创建 yt-dlp sidecar 失败: {}", e))?
        .args(&[
            "-f", &params.format_id,
            "-o", &params.output_path,
            "--newline",
            "--no-part",
            "--no-continue",    // 禁止断点续传：避免遗留文件触发 Range 请求返回 HTTP 416
            "--no-playlist",
            "--ffmpeg-location", &ffmpeg_dir,
            &params.url,
        ])
        .spawn()
        .map_err(|e| format!("启动 yt-dlp 进程失败: {}", e))?;

    // 注册子进程到任务队列（用于取消功能）
    {
        let mut queue = crate::engine::queue::TASK_QUEUE.lock().await;
        queue.register_child(&task_id, child);
    }

    let mut stderr_buffer = String::new();

    // 监听子进程事件
    while let Some(event) = rx.recv().await {
        match event {
            // yt-dlp 的进度信息输出到 stderr
            CommandEvent::Stderr(line) => {
                let line_str = String::from_utf8_lossy(&line);
                stderr_buffer.push_str(&line_str);

                // 限制 buffer 大小
                if stderr_buffer.len() > 10000 {
                    let truncated = stderr_buffer.split_off(stderr_buffer.len() - 5000);
                    stderr_buffer = truncated;
                }

                // 尝试解析下载进度
                for single_line in line_str.lines() {
                    if let Some(percent) = parse_download_progress(single_line) {
                        let _ = on_progress.send(TaskEvent::Progress(ProgressUpdate {
                            task_id: task_id.clone(),
                            percent,
                            speed: 0.0,
                            current_time: 0.0,
                            eta: 0.0,
                            output_size: 0,
                            frame: 0,
                            fps: 0.0,
                        }));
                    }
                }
            }
            // yt-dlp 的一些信息也会输出到 stdout
            CommandEvent::Stdout(line) => {
                let line_str = String::from_utf8_lossy(&line);
                for single_line in line_str.lines() {
                    if let Some(percent) = parse_download_progress(single_line) {
                        let _ = on_progress.send(TaskEvent::Progress(ProgressUpdate {
                            task_id: task_id.clone(),
                            percent,
                            speed: 0.0,
                            current_time: 0.0,
                            eta: 0.0,
                            output_size: 0,
                            frame: 0,
                            fps: 0.0,
                        }));
                    }
                }
            }
            CommandEvent::Terminated(payload) => {
                let elapsed = start_time.elapsed().as_secs_f64();

                // 检查是否被取消
                let is_cancelled = {
                    let queue = crate::engine::queue::TASK_QUEUE.lock().await;
                    queue.is_cancelled(&task_id)
                };

                // 从任务队列清理
                {
                    let mut queue = crate::engine::queue::TASK_QUEUE.lock().await;
                    queue.cleanup(&task_id);
                }

                if is_cancelled {
                    let _ = on_progress.send(TaskEvent::Cancelled {
                        task_id: task_id.clone(),
                    });
                    return Ok(task_id);
                }

                let exit_code = payload.code.unwrap_or(-1);
                if exit_code == 0 {
                    let output_size = get_file_size(&params.output_path);
                    let _ = on_progress.send(TaskEvent::Completed {
                        task_id: task_id.clone(),
                        output_path: params.output_path.clone(),
                        output_size,
                        elapsed,
                    });
                    return Ok(task_id);
                } else {
                    let error_msg = extract_ytdlp_error(&stderr_buffer);
                    let _ = on_progress.send(TaskEvent::Failed {
                        task_id: task_id.clone(),
                        error: error_msg.clone(),
                    });
                    return Err(error_msg);
                }
            }
            _ => {}
        }
    }

    Err("yt-dlp 进程事件流意外关闭".to_string())
}

/// 解析 yt-dlp JSON 中的格式列表
///
/// 从 formats 数组中筛选出有意义的格式：
/// - 跳过 storyboard/mhtml 等非媒体格式
/// - 分离"视频+音频"、"仅视频"、"仅音频"三种类型
/// - 按分辨率降序排列
fn parse_formats(formats_json: &serde_json::Value) -> Vec<FormatInfo> {
    let Some(formats) = formats_json.as_array() else {
        return Vec::new();
    };

    let mut result: Vec<FormatInfo> = Vec::new();

    for f in formats {
        let format_id = f["format_id"].as_str().unwrap_or("").to_string();
        let ext = f["ext"].as_str().unwrap_or("").to_string();
        let vcodec = f["vcodec"].as_str().unwrap_or("none").to_string();
        let acodec = f["acodec"].as_str().unwrap_or("none").to_string();

        // 跳过明确无用的格式（缩略图/故事板）
        if ext == "mhtml" || vcodec == "images" {
            continue;
        }

        let width = f["width"].as_u64().unwrap_or(0) as u32;
        let height = f["height"].as_u64().unwrap_or(0) as u32;

        let format_note = f["format_note"]
            .as_str()
            .unwrap_or("")
            .to_string();

        let filesize = f["filesize"]
            .as_u64()
            .or_else(|| f["filesize_approx"].as_u64())
            .unwrap_or(0);

        // 传输协议：区分原生 HTTP 下载（https）和 HLS 流（m3u8/m3u8_native）
        // Twitter/X 等平台同时提供两种协议，优先选 https 以保证音视频完整性
        let protocol = f["protocol"].as_str().unwrap_or("https").to_string();

        // Twitter/X 等平台的 HTTP 渐进式下载格式：
        // yt-dlp 无法从清单中解析编解码器，将 vcodec/acodec 都报告为 "none"，
        // 但实际文件是完整的视频+音频 MP4。
        // 判断依据：vcodec/acodec 均为 "none"，协议是 https/http，且有分辨率高度
        let is_opaque_http_video = vcodec == "none"
            && acodec == "none"
            && (protocol == "https" || protocol == "http")
            && height > 0;

        // 判断 has_video / has_audio（注意顺序：先算 is_opaque_http_video）：
        // - 普通格式：直接用 codec 是否为 "none" 判断
        // - is_opaque_http_video：视为完整视频+音频（Twitter/X HTTP 格式）
        // - height==0 && vcodec=="none"：视为纯音频流（HLS audio 流 / 独立音轨）
        let has_video = vcodec != "none" || is_opaque_http_video;
        let has_audio = acodec != "none"
            || is_opaque_http_video
            || (height == 0 && vcodec == "none"); // HLS 音频流（height=0）

        // 跳过既没有视频也没有音频的格式
        if !has_video && !has_audio {
            continue;
        }

        result.push(FormatInfo {
            format_id,
            format_note,
            ext,
            width,
            height,
            filesize,
            has_video,
            has_audio,
            vcodec: vcodec.replace("none", ""),
            acodec: acodec.replace("none", ""),
            protocol,
        });
    }

    // 按高度降序排列（最高分辨率在前）
    result.sort_by(|a, b| b.height.cmp(&a.height));

    result
}

/// 解析 yt-dlp 下载进度行
///
/// yt-dlp 进度格式示例：
/// `[download]  45.2% of ~50.00MiB at 2.50MiB/s ETA 00:11`
/// `[download] 100% of 50.00MiB in 00:20`
///
/// # 返回
/// 解析出的进度百分比（0.0 - 100.0），解析失败返回 None
fn parse_download_progress(line: &str) -> Option<f64> {
    let line = line.trim();
    if !line.starts_with("[download]") {
        return None;
    }

    // 查找百分号位置
    let percent_pos = line.find('%')?;
    // 从 [download] 后开始，到 % 前的内容应该是数字
    let after_tag = &line["[download]".len()..percent_pos];
    let num_str = after_tag.trim();
    num_str.parse::<f64>().ok()
}

/// 从 yt-dlp stderr 中提取有意义的错误信息
fn extract_ytdlp_error(stderr: &str) -> String {
    // 优先查找 ERROR: 开头的行
    for line in stderr.lines().rev() {
        let trimmed = line.trim();
        if trimmed.starts_with("ERROR:") {
            return trimmed.to_string();
        }
    }

    // 其次查找包含 error 关键词的行
    for line in stderr.lines().rev().take(20) {
        let lower = line.to_lowercase();
        if lower.contains("error") || lower.contains("unable") || lower.contains("not found") {
            return line.trim().to_string();
        }
    }

    // 返回最后一行非空内容
    stderr
        .lines()
        .rev()
        .find(|l| !l.trim().is_empty())
        .unwrap_or("yt-dlp 执行失败")
        .trim()
        .to_string()
}

/// 获取 sidecar 二进制所在目录的路径
///
/// yt-dlp 的 --ffmpeg-location 参数需要 ffmpeg 所在的目录路径。
/// Tauri sidecar 二进制的路径规则：exe 所在目录同级。
/// 开发时在 target/debug/，打包后在 app bundle 的 Resources/ 目录
fn get_sidecar_dir() -> Result<String, String> {
    let exe_path = std::env::current_exe()
        .map_err(|e| format!("获取当前可执行文件路径失败: {}", e))?;
    let exe_dir = exe_path
        .parent()
        .ok_or("获取可执行文件目录失败")?;

    // 开发模式下 exe 在 target/debug/deps/ 目录，需要向上一级到 target/debug/
    let base_dir = if exe_dir.ends_with("deps") {
        exe_dir.parent().unwrap_or(exe_dir)
    } else {
        exe_dir
    };

    Ok(base_dir.to_string_lossy().to_string())
}
