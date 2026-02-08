/**
 * @file 任务类型定义
 * @description 定义任务状态、进度事件、执行结果等类型，与 Rust 后端 models/task.rs 对应
 */

/**
 * 任务状态枚举
 * @description 任务生命周期中的各个阶段
 */
export type TaskStatus =
  | 'idle'       // 空闲（未启动）
  | 'pending'    // 等待执行
  | 'running'    // 正在执行
  | 'completed'  // 执行完成
  | 'cancelled'  // 已取消
  | 'failed';    // 执行失败

/**
 * 进度更新数据
 * @description 通过 Tauri Channel 从后端推送的实时进度信息
 */
export interface ProgressUpdate {
  /** 进度百分比 (0.0 - 100.0) */
  percent: number;
  /** 处理速度倍率（如 2.5 表示 2.5x 速度） */
  speed: number;
  /** 已处理的时间位置（秒） */
  currentTime: number;
  /** 预估剩余时间（秒） */
  eta: number;
  /** 当前输出文件大小（字节） */
  outputSize: number;
  /** 当前已处理的帧数 */
  frame: number;
  /** 当前处理帧率 */
  fps: number;
}

/**
 * 任务事件（通过 Channel 推送）
 * @description 后端通过 Tauri Channel 推送的带标签的事件联合类型
 *
 * 使用 tagged union 模式，event 字段区分不同事件类型
 */
export type TaskEvent =
  | { event: 'started'; data: { taskId: string; totalDuration: number } }
  | { event: 'progress'; data: ProgressUpdate }
  | { event: 'completed'; data: { taskId: string; outputPath: string; outputSize: number; elapsed: number } }
  | { event: 'failed'; data: { taskId: string; error: string } }
  | { event: 'cancelled'; data: { taskId: string } };

/**
 * 任务执行结果
 * @description 任务完成后返回的最终结果
 */
export interface TaskResult {
  /** 任务 ID */
  taskId: string;
  /** 最终状态 */
  status: TaskStatus;
  /** 输出文件路径 */
  outputPath: string | null;
  /** 输出文件大小（字节） */
  outputSize: number | null;
  /** 执行耗时（秒） */
  elapsed: number | null;
  /** 错误信息（失败时） */
  error: string | null;
}

/**
 * 前端任务信息
 * @description 前端维护的完整任务状态信息
 */
export interface TaskInfo {
  /** 任务唯一 ID */
  id: string;
  /** 功能类型标识（如 convert, compress, trim 等） */
  type: string;
  /** 输入文件名 */
  inputFileName: string;
  /** 输出文件名 */
  outputFileName: string;
  /** 当前状态 */
  status: TaskStatus;
  /** 最新进度信息 */
  progress: ProgressUpdate | null;
  /** 执行结果 */
  result: TaskResult | null;
  /** 创建时间戳 */
  createdAt: number;
}
