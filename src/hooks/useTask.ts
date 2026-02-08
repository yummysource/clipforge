/**
 * @file 单任务执行 Hook
 * @description 管理单个 ffmpeg 任务的生命周期，包括启动、进度跟踪、取消
 */
import { useState, useCallback, useRef } from 'react';
import type { TaskStatus, ProgressUpdate, TaskEvent, TaskResult } from '@/types/task';
import { cancelTask } from '@/services/ffmpeg';

/** 任务 Hook 返回值 */
export interface UseTaskReturn {
  /** 当前任务状态 */
  status: TaskStatus;
  /** 最新进度信息 */
  progress: ProgressUpdate | null;
  /** 任务结果 */
  result: TaskResult | null;
  /** 错误信息 */
  error: string | null;
  /** 执行任务 */
  execute: <P>(
    serviceFn: (params: P, onEvent: (e: TaskEvent) => void) => Promise<string>,
    params: P,
  ) => Promise<void>;
  /** 取消当前任务 */
  cancel: () => Promise<void>;
  /** 重置状态为 idle */
  reset: () => void;
}

/**
 * 管理单个 ffmpeg 任务执行和进度的自定义 Hook
 *
 * 通过泛型 serviceFn 参数支持所有 ffmpeg 操作类型。
 * 自动处理 Channel 事件并更新状态。
 *
 * @returns 任务状态和控制函数
 */
export function useTask(): UseTaskReturn {
  const [status, setStatus] = useState<TaskStatus>('idle');
  const [progress, setProgress] = useState<ProgressUpdate | null>(null);
  const [result, setResult] = useState<TaskResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  /** 当前任务 ID 引用 */
  const taskIdRef = useRef<string | null>(null);

  /**
   * 执行任务
   *
   * @param serviceFn - services/ffmpeg.ts 中的操作函数
   * @param params - 对应操作的参数
   */
  const execute = useCallback(async <P>(
    serviceFn: (params: P, onEvent: (e: TaskEvent) => void) => Promise<string>,
    params: P,
  ): Promise<void> => {
    setStatus('running');
    setProgress(null);
    setResult(null);
    setError(null);

    try {
      const taskId = await serviceFn(params, (event: TaskEvent) => {
        switch (event.event) {
          case 'started':
            /* 任务已在后端启动 */
            break;
          case 'progress':
            setProgress(event.data);
            break;
          case 'completed':
            setStatus('completed');
            setResult({
              taskId: event.data.taskId,
              status: 'completed',
              outputPath: event.data.outputPath,
              outputSize: event.data.outputSize,
              elapsed: event.data.elapsed,
              error: null,
            });
            break;
          case 'failed':
            setStatus('failed');
            setError(event.data.error);
            setResult({
              taskId: event.data.taskId,
              status: 'failed',
              outputPath: null,
              outputSize: null,
              elapsed: null,
              error: event.data.error,
            });
            break;
          case 'cancelled':
            setStatus('cancelled');
            break;
        }
      });
      taskIdRef.current = taskId;
    } catch (err) {
      setStatus('failed');
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    }
  }, []);

  /** 取消当前正在执行的任务 */
  const cancel = useCallback(async () => {
    if (taskIdRef.current) {
      try {
        await cancelTask(taskIdRef.current);
      } catch {
        /* 忽略取消时的错误（任务可能已完成） */
      }
    }
  }, []);

  /** 重置所有状态为初始值 */
  const reset = useCallback(() => {
    setStatus('idle');
    setProgress(null);
    setResult(null);
    setError(null);
    taskIdRef.current = null;
  }, []);

  return { status, progress, result, error, execute, cancel, reset };
}
