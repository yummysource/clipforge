/// 任务管理 command
///
/// 提供取消正在运行的 ffmpeg 任务的能力，
/// 通过向子进程发送 kill 信号来终止执行

/// 取消指定的 ffmpeg 任务
///
/// 前端点击取消按钮时调用此 command，
/// 通过全局任务队列查找并终止对应的 ffmpeg 子进程
///
/// # 参数
/// - `task_id` - 要取消的任务 ID（UUID v4 格式）
///
/// # 返回
/// - `Ok(())` - 取消信号已发送
/// - `Err(String)` - 任务不存在或已完成
#[tauri::command]
pub async fn cancel_task(task_id: String) -> Result<(), String> {
    let mut queue = crate::engine::queue::TASK_QUEUE.lock().await;
    queue.cancel_task(&task_id)
}
