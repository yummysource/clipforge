/// ffmpeg 进程管理器
///
/// 负责通过 Tauri Sidecar 机制启动和管理 ffmpeg/ffprobe 子进程。
/// 使用 spawn 模式获取异步事件流，实时解析进度并推送给前端

use std::time::Instant;

use tauri::ipc::Channel;
use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::CommandEvent;

use crate::engine::progress::ProgressParser;
use crate::models::task::{TaskEvent, TaskResult, TaskStatus};
use crate::utils::path::get_file_size;

/// 执行 ffmpeg sidecar 命令并通过 Channel 推送进度
///
/// 使用 Tauri shell 插件的 sidecar 模式启动 ffmpeg 子进程，
/// 监听 stdout（进度信息）和 stderr（日志/错误），
/// 实时解析进度并通过 Channel 推送 TaskEvent 给前端
///
/// # 参数
/// - `app` - Tauri AppHandle，用于获取 sidecar 路径和调用 shell 插件
/// - `task_id` - 任务唯一标识
/// - `args` - ffmpeg 命令行参数数组
/// - `total_duration` - 视频总时长（秒），用于进度百分比计算
/// - `output_path` - 输出文件路径（用于完成后获取文件大小）
/// - `on_progress` - Tauri Channel，用于向前端推送 TaskEvent
///
/// # 返回
/// - `Ok(TaskResult)` - 任务执行结果
/// - `Err(String)` - 启动失败的错误描述
pub async fn run_ffmpeg(
    app: &tauri::AppHandle,
    task_id: &str,
    args: Vec<String>,
    total_duration: f64,
    output_path: &str,
    on_progress: &Channel<TaskEvent>,
) -> Result<TaskResult, String> {
    let start_time = Instant::now();

    // 通知前端任务开始
    let _ = on_progress.send(TaskEvent::Started {
        task_id: task_id.to_string(),
        total_duration,
    });

    // 使用 Tauri shell 插件以 sidecar 模式启动 ffmpeg
    let (mut rx, child) = app
        .shell()
        .sidecar("ffmpeg")
        .map_err(|e| format!("创建 ffmpeg sidecar 失败: {}", e))?
        .args(&args)
        .spawn()
        .map_err(|e| format!("启动 ffmpeg 进程失败: {}", e))?;

    // 注册子进程到全局任务队列（用于取消功能）
    {
        let mut queue = crate::engine::queue::TASK_QUEUE.lock().await;
        queue.register_child(task_id, child);
    }

    // 创建进度解析器
    let mut parser = ProgressParser::new(total_duration, task_id);

    // stderr 中收集的错误信息
    let mut stderr_buffer = String::new();
    // 监听子进程的 stdout/stderr/terminated 事件
    while let Some(event) = rx.recv().await {
        match event {
            CommandEvent::Stdout(line) => {
                let line_str = String::from_utf8_lossy(&line);
                // 逐行解析 progress 输出
                for single_line in line_str.lines() {
                    if let Some(progress) = parser.parse_line(single_line) {
                        let _ = on_progress.send(TaskEvent::Progress(progress));
                    }
                }
            }
            CommandEvent::Stderr(line) => {
                let line_str = String::from_utf8_lossy(&line);
                // 收集 stderr 输出（包含错误信息和日志）
                stderr_buffer.push_str(&line_str);
                if stderr_buffer.len() > 10000 {
                    // 限制 stderr 缓冲区大小，保留最后部分
                    let truncated = stderr_buffer.split_off(stderr_buffer.len() - 5000);
                    stderr_buffer = truncated;
                }
            }
            CommandEvent::Terminated(payload) => {
                let elapsed = start_time.elapsed().as_secs_f64();

                // 检查是否被取消
                let is_cancelled = {
                    let queue = crate::engine::queue::TASK_QUEUE.lock().await;
                    queue.is_cancelled(task_id)
                };

                if is_cancelled {
                    let _ = on_progress.send(TaskEvent::Cancelled {
                        task_id: task_id.to_string(),
                    });
                    return Ok(TaskResult {
                        task_id: task_id.to_string(),
                        status: TaskStatus::Cancelled,
                        output_path: None,
                        output_size: None,
                        elapsed: Some(elapsed),
                        error: None,
                    });
                }

                // 检查退出码判断成功或失败
                let exit_code = payload.code.unwrap_or(-1);
                if exit_code == 0 {
                    let output_size = get_file_size(output_path);
                    let _ = on_progress.send(TaskEvent::Completed {
                        task_id: task_id.to_string(),
                        output_path: output_path.to_string(),
                        output_size,
                        elapsed,
                    });
                    return Ok(TaskResult {
                        task_id: task_id.to_string(),
                        status: TaskStatus::Completed,
                        output_path: Some(output_path.to_string()),
                        output_size: Some(output_size),
                        elapsed: Some(elapsed),
                        error: None,
                    });
                } else {
                    // 从 stderr 中提取最后一行有意义的错误信息
                    let error_msg = extract_error_message(&stderr_buffer, exit_code);
                    let _ = on_progress.send(TaskEvent::Failed {
                        task_id: task_id.to_string(),
                        error: error_msg.clone(),
                    });
                    return Ok(TaskResult {
                        task_id: task_id.to_string(),
                        status: TaskStatus::Failed,
                        output_path: None,
                        output_size: None,
                        elapsed: Some(elapsed),
                        error: Some(error_msg),
                    });
                }
            }
            _ => {}
        }
    }

    // 事件流意外关闭（不应到达此处）
    Err("ffmpeg 进程事件流意外关闭".to_string())
}

/// 执行 ffmpeg 命令（静默模式，不推送进度事件）
///
/// 用于多步骤任务中的中间步骤（如多片段裁剪的每段切割），
/// 同步等待 ffmpeg 完成后返回结果，不发送 Started/Progress/Completed 事件。
/// 最终进度由调用方统一管理和推送
///
/// # 参数
/// - `app` - Tauri AppHandle
/// - `args` - ffmpeg 命令行参数数组
///
/// # 返回
/// - `Ok(())` - 执行成功
/// - `Err(String)` - 执行失败的错误描述
pub async fn run_ffmpeg_quiet(
    app: &tauri::AppHandle,
    args: Vec<String>,
) -> Result<(), String> {
    let output = app
        .shell()
        .sidecar("ffmpeg")
        .map_err(|e| format!("创建 ffmpeg sidecar 失败: {}", e))?
        .args(&args)
        .output()
        .await
        .map_err(|e| format!("执行 ffmpeg 失败: {}", e))?;

    if output.status.success() {
        Ok(())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let exit_code = output.status.code().unwrap_or(-1);
        Err(extract_error_message(&stderr, exit_code))
    }
}

/// 使用 ffprobe 获取媒体文件信息（同步等待结果）
///
/// 调用 ffprobe sidecar 获取 JSON 格式的媒体信息，
/// 同步等待执行完成后返回原始 JSON 字符串
///
/// # 参数
/// - `app` - Tauri AppHandle
/// - `file_path` - 媒体文件路径
///
/// # 返回
/// ffprobe JSON 输出字符串
pub async fn run_ffprobe(
    app: &tauri::AppHandle,
    file_path: &str,
) -> Result<String, String> {
    let output = app
        .shell()
        .sidecar("ffprobe")
        .map_err(|e| format!("创建 ffprobe sidecar 失败: {}", e))?
        .args(&[
            "-v", "quiet",
            "-print_format", "json",
            "-show_format",
            "-show_streams",
            file_path,
        ])
        .output()
        .await
        .map_err(|e| format!("执行 ffprobe 失败: {}", e))?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("ffprobe 执行失败: {}", stderr))
    }
}

/// 从 ffmpeg stderr 输出中提取有意义的错误信息
///
/// ffmpeg 的 stderr 输出包含大量日志信息，
/// 此函数尝试从中提取最后一个有意义的错误描述
fn extract_error_message(stderr: &str, exit_code: i32) -> String {
    // 从 stderr 的最后几行中找包含错误关键词的行
    let lines: Vec<&str> = stderr.lines().rev().take(20).collect();
    for line in &lines {
        let lower = line.to_lowercase();
        if lower.contains("error")
            || lower.contains("invalid")
            || lower.contains("no such")
            || lower.contains("permission denied")
            || lower.contains("not found")
        {
            return line.trim().to_string();
        }
    }

    // 未找到特定错误信息，返回通用错误
    format!("ffmpeg 进程退出，退出码: {}", exit_code)
}
