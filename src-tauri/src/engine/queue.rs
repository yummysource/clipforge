/// 任务队列管理器
///
/// 管理 ffmpeg 任务的生命周期：注册子进程、取消任务、
/// 跟踪运行状态。使用全局单例模式通过 Mutex 保证线程安全

use std::collections::{HashMap, HashSet};
use tauri_plugin_shell::process::CommandChild;
use tokio::sync::Mutex;

/// 全局任务队列单例
///
/// 使用 tokio::sync::Mutex 保证异步上下文中的线程安全，
/// 所有 command 函数通过此全局变量访问任务队列
pub static TASK_QUEUE: once_cell::sync::Lazy<Mutex<TaskQueue>> =
    once_cell::sync::Lazy::new(|| Mutex::new(TaskQueue::new()));

/// 任务队列
///
/// 维护运行中的 ffmpeg 子进程和已取消任务的标记集合。
/// 支持注册、取消和状态查询操作
pub struct TaskQueue {
    /// 运行中的子进程映射（task_id -> CommandChild）
    ///
    /// CommandChild 用于向 ffmpeg 进程发送 kill 信号
    running: HashMap<String, CommandChild>,
    /// 已标记取消的任务 ID 集合
    ///
    /// 取消操作先杀进程，再在此集合中标记，
    /// 进程 Terminated 事件回调中检查此标记以区分正常退出和取消
    cancelled: HashSet<String>,
}

impl TaskQueue {
    /// 创建空的任务队列
    pub fn new() -> Self {
        Self {
            running: HashMap::new(),
            cancelled: HashSet::new(),
        }
    }

    /// 注册一个运行中的 ffmpeg 子进程
    ///
    /// 在 ffmpeg spawn 成功后调用，将 CommandChild 存入映射表，
    /// 以便后续通过 task_id 取消进程。
    /// 调用方需要通过 TASK_QUEUE.lock().await 获取 &mut 访问权限
    ///
    /// # 参数
    /// - `task_id` - 任务唯一标识
    /// - `child` - Tauri shell CommandChild，持有进程 handle
    pub fn register_child(&mut self, task_id: &str, child: CommandChild) {
        self.running.insert(task_id.to_string(), child);
    }

    /// 取消指定任务
    ///
    /// 向 ffmpeg 子进程发送 kill 信号并标记为已取消。
    /// 进程终止后，事件回调中会检查此标记以推送 Cancelled 事件
    ///
    /// # 参数
    /// - `task_id` - 要取消的任务 ID
    ///
    /// # 返回
    /// - `Ok(())` - 成功发送取消信号
    /// - `Err(String)` - 任务不存在
    pub fn cancel_task(&mut self, task_id: &str) -> Result<(), String> {
        if let Some(child) = self.running.remove(task_id) {
            // 标记为已取消（在 Terminated 事件中检查）
            self.cancelled.insert(task_id.to_string());
            // 向进程发送 kill 信号
            let _ = child.kill();
            Ok(())
        } else {
            Err(format!("任务 {} 不存在或已完成", task_id))
        }
    }

    /// 检查任务是否已被标记为取消
    ///
    /// # 参数
    /// - `task_id` - 任务 ID
    pub fn is_cancelled(&self, task_id: &str) -> bool {
        self.cancelled.contains(task_id)
    }

    /// 清理已完成任务的记录
    ///
    /// 从 running 映射和 cancelled 集合中移除指定任务
    ///
    /// # 参数
    /// - `task_id` - 要清理的任务 ID
    pub fn cleanup(&mut self, task_id: &str) {
        self.running.remove(task_id);
        self.cancelled.remove(task_id);
    }
}
