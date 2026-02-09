/**
 * @file 单任务执行 Hook
 * @description 管理单个 ffmpeg 任务的生命周期，包括启动、进度跟踪、取消。
 * 任务完成时自动根据设置执行后处理操作（打开目录等）。
 * 同步更新全局 useTaskStore，使状态栏能正确显示活跃任务数量。
 */
import { useState, useCallback, useRef } from 'react';
import type { TaskStatus, ProgressUpdate, TaskEvent, TaskResult } from '@/types/task';
import { cancelTask } from '@/services/ffmpeg';
import { revealInFinder } from '@/services/files';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useTaskStore } from '@/stores/useTaskStore';

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
 * 同步更新全局 TaskStore，使底部状态栏显示正确的活跃任务数量。
 * 任务完成后根据 openOnComplete 设置自动在 Finder 中展示输出文件。
 *
 * @param taskType - 功能类型标识（如 'convert', 'compress', 'download' 等），用于全局任务追踪
 * @returns 任务状态和控制函数
 */
export function useTask(taskType: string = 'unknown'): UseTaskReturn {
  const [status, setStatus] = useState<TaskStatus>('idle');
  const [progress, setProgress] = useState<ProgressUpdate | null>(null);
  const [result, setResult] = useState<TaskResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  /** 当前任务 ID 引用 */
  const taskIdRef = useRef<string | null>(null);

  /**
   * 执行任务
   *
   * @description 启动任务并同步更新全局 TaskStore，使状态栏能正确显示活跃任务数。
   * 通过 duck typing 从 params 中提取 inputPath/outputPath 作为任务元数据。
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

    /* Extract file names from params via duck typing for global task tracking */
    const p = params as Record<string, unknown>;
    const inputFileName = extractFileName(p.inputPath) || extractFileName(p.url) || '';
    const outputFileName = extractFileName(p.outputPath) || '';

    /* Generate a temporary ID for global store registration (will be replaced by real taskId) */
    const tempId = `temp-${Date.now()}`;
    const { addTask, updateProgress, updateStatus, removeTask } = useTaskStore.getState();

    /* Register task in global store so status bar reflects active task count */
    addTask({
      id: tempId,
      type: taskType,
      inputFileName,
      outputFileName,
      status: 'running',
      progress: null,
      result: null,
      createdAt: Date.now(),
    });

    try {
      const taskId = await serviceFn(params, (event: TaskEvent) => {
        switch (event.event) {
          case 'started':
            /* Replace temp ID with real task ID in global store */
            removeTask(tempId);
            addTask({
              id: event.data.taskId,
              type: taskType,
              inputFileName,
              outputFileName,
              status: 'running',
              progress: null,
              result: null,
              createdAt: Date.now(),
            });
            break;
          case 'progress':
            setProgress(event.data);
            updateProgress(taskIdRef.current || tempId, event.data);
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
            updateStatus(event.data.taskId, 'completed');
            /* 任务完成后自动打开目录（根据设置） */
            handlePostComplete(event.data.outputPath);
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
            updateStatus(event.data.taskId, 'failed', event.data.error);
            break;
          case 'cancelled':
            setStatus('cancelled');
            updateStatus(taskIdRef.current || tempId, 'cancelled');
            break;
        }
      });
      taskIdRef.current = taskId;
    } catch (err) {
      setStatus('failed');
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      /* Update global store on execution error */
      updateStatus(tempId, 'failed', message);
    }
  }, [taskType]);

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

  /** 重置所有状态为初始值，同时从全局 TaskStore 移除对应任务 */
  const reset = useCallback(() => {
    if (taskIdRef.current) {
      useTaskStore.getState().removeTask(taskIdRef.current);
    }
    setStatus('idle');
    setProgress(null);
    setResult(null);
    setError(null);
    taskIdRef.current = null;
  }, []);

  return { status, progress, result, error, execute, cancel, reset };
}

/**
 * 任务完成后处理：根据设置决定是否在 Finder 中展示输出文件
 *
 * @param outputPath - 输出文件路径
 */
function handlePostComplete(outputPath: string): void {
  const { openOnComplete } = useSettingsStore.getState();
  if (openOnComplete && outputPath) {
    revealInFinder(outputPath).catch(() => {
      /* 打开 Finder 失败不影响主流程 */
    });
  }
}

/**
 * 从文件路径或 URL 中提取文件名
 *
 * @param value - 文件路径或 URL 字符串
 * @returns 文件名，如果无法提取则返回空字符串
 */
function extractFileName(value: unknown): string {
  if (typeof value !== 'string' || !value) return '';
  /* Extract filename from path (handles both / and \ separators) */
  const parts = value.split(/[/\\]/);
  return parts[parts.length - 1] || '';
}
