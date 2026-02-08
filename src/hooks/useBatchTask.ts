/**
 * @file 批量任务管理 Hook
 * @description 管理多个文件的批量处理，跟踪每个文件的进度和总体进度
 */
import { useState, useCallback, useRef } from 'react';
import type { TaskStatus, ProgressUpdate, TaskEvent } from '@/types/task';
import { cancelTask } from '@/services/ffmpeg';

/** 单个批量任务项 */
export interface BatchItem {
  /** 唯一 ID */
  id: string;
  /** 输入文件名 */
  inputName: string;
  /** 输出文件名 */
  outputName: string;
  /** 当前状态 */
  status: TaskStatus;
  /** 进度信息 */
  progress: ProgressUpdate | null;
  /** 错误信息 */
  error: string | null;
  /** 任务 ID（后端返回） */
  taskId: string | null;
}

/** 批量任务 Hook 返回值 */
export interface UseBatchTaskReturn {
  /** 所有任务项 */
  items: BatchItem[];
  /** 是否正在处理 */
  isProcessing: boolean;
  /** 已完成数量 */
  completedCount: number;
  /** 总体进度百分比 (0-100) */
  totalProgress: number;
  /** 启动批量处理 */
  executeBatch: <P>(
    tasks: Array<{ id: string; inputName: string; outputName: string; params: P }>,
    serviceFn: (params: P, onEvent: (e: TaskEvent) => void) => Promise<string>,
  ) => Promise<void>;
  /** 取消所有任务 */
  cancelAll: () => Promise<void>;
  /** 重置 */
  reset: () => void;
}

/**
 * 管理批量 ffmpeg 任务的自定义 Hook
 *
 * 逐个执行任务列表，跟踪每个任务的独立进度并计算总体进度。
 *
 * @returns 批量任务状态和控制函数
 */
export function useBatchTask(): UseBatchTaskReturn {
  const [items, setItems] = useState<BatchItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  /** 是否已请求取消 */
  const cancelledRef = useRef(false);
  /** 当前运行中的任务 ID 列表 */
  const activeTaskIdsRef = useRef<string[]>([]);

  /** 计算已完成数量 */
  const completedCount = items.filter(
    (i) => i.status === 'completed' || i.status === 'failed' || i.status === 'cancelled'
  ).length;

  /** 计算总体进度百分比 */
  const totalProgress = items.length === 0 ? 0 : (() => {
    const perItem = 100 / items.length;
    return items.reduce((sum, item) => {
      if (item.status === 'completed') return sum + perItem;
      if (item.status === 'running' && item.progress) return sum + (perItem * item.progress.percent / 100);
      return sum;
    }, 0);
  })();

  /**
   * 启动批量处理
   *
   * @param tasks - 任务配置列表
   * @param serviceFn - ffmpeg 操作函数
   */
  const executeBatch = useCallback(async <P>(
    tasks: Array<{ id: string; inputName: string; outputName: string; params: P }>,
    serviceFn: (params: P, onEvent: (e: TaskEvent) => void) => Promise<string>,
  ): Promise<void> => {
    cancelledRef.current = false;
    activeTaskIdsRef.current = [];
    setIsProcessing(true);

    /* 初始化所有任务项为 pending 状态 */
    const initialItems: BatchItem[] = tasks.map((t) => ({
      id: t.id,
      inputName: t.inputName,
      outputName: t.outputName,
      status: 'pending' as TaskStatus,
      progress: null,
      error: null,
      taskId: null,
    }));
    setItems(initialItems);

    /* 逐个执行 */
    for (let i = 0; i < tasks.length; i++) {
      if (cancelledRef.current) break;

      const task = tasks[i];

      /* 更新当前任务为 running */
      setItems((prev) =>
        prev.map((item) => item.id === task.id ? { ...item, status: 'running' } : item)
      );

      try {
        await new Promise<void>((resolve, reject) => {
          serviceFn(task.params, (event: TaskEvent) => {
            switch (event.event) {
              case 'started':
                activeTaskIdsRef.current.push(event.data.taskId);
                setItems((prev) =>
                  prev.map((item) =>
                    item.id === task.id ? { ...item, taskId: event.data.taskId } : item
                  )
                );
                break;
              case 'progress':
                setItems((prev) =>
                  prev.map((item) =>
                    item.id === task.id ? { ...item, progress: event.data } : item
                  )
                );
                break;
              case 'completed':
                setItems((prev) =>
                  prev.map((item) =>
                    item.id === task.id ? { ...item, status: 'completed' } : item
                  )
                );
                resolve();
                break;
              case 'failed':
                setItems((prev) =>
                  prev.map((item) =>
                    item.id === task.id
                      ? { ...item, status: 'failed', error: event.data.error }
                      : item
                  )
                );
                resolve(); /* 失败不中断批量，继续下一个 */
                break;
              case 'cancelled':
                setItems((prev) =>
                  prev.map((item) =>
                    item.id === task.id ? { ...item, status: 'cancelled' } : item
                  )
                );
                resolve();
                break;
            }
          }).catch(reject);
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setItems((prev) =>
          prev.map((item) =>
            item.id === task.id ? { ...item, status: 'failed', error: message } : item
          )
        );
      }
    }

    setIsProcessing(false);
  }, []);

  /** 取消所有正在执行和等待中的任务 */
  const cancelAll = useCallback(async () => {
    cancelledRef.current = true;
    for (const taskId of activeTaskIdsRef.current) {
      try {
        await cancelTask(taskId);
      } catch {
        /* 忽略取消错误 */
      }
    }
    setItems((prev) =>
      prev.map((item) =>
        item.status === 'pending' || item.status === 'running'
          ? { ...item, status: 'cancelled' }
          : item
      )
    );
    setIsProcessing(false);
  }, []);

  /** 重置所有状态 */
  const reset = useCallback(() => {
    setItems([]);
    setIsProcessing(false);
    cancelledRef.current = false;
    activeTaskIdsRef.current = [];
  }, []);

  return { items, isProcessing, completedCount, totalProgress, executeBatch, cancelAll, reset };
}
