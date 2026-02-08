/**
 * @file 任务队列状态
 * @description 管理所有任务（历史和活跃）的全局状态，用于底部状态栏和任务队列展示
 */
import { create } from 'zustand';
import type { TaskInfo, ProgressUpdate, TaskStatus } from '@/types/task';

/** 任务队列状态接口 */
interface TaskStoreState {
  /** 所有任务映射（taskId -> TaskInfo） */
  tasks: Record<string, TaskInfo>;

  /** 添加新任务 */
  addTask: (task: TaskInfo) => void;
  /** 更新任务进度 */
  updateProgress: (taskId: string, progress: ProgressUpdate) => void;
  /** 更新任务状态 */
  updateStatus: (taskId: string, status: TaskStatus, error?: string) => void;
  /** 移除任务 */
  removeTask: (taskId: string) => void;
  /** 清空所有已完成的任务 */
  clearCompleted: () => void;

  /** 获取正在执行的任务数量 */
  getRunningCount: () => number;
  /** 获取所有任务列表（按创建时间排序） */
  getTaskList: () => TaskInfo[];
}

/**
 * 任务队列 Store
 *
 * 全局追踪所有 ffmpeg 处理任务。底部状态栏读取此 store 显示活跃任务数。
 */
export const useTaskStore = create<TaskStoreState>((set, get) => ({
  tasks: {},

  addTask: (task) =>
    set((state) => ({
      tasks: { ...state.tasks, [task.id]: task },
    })),

  updateProgress: (taskId, progress) =>
    set((state) => {
      const task = state.tasks[taskId];
      if (!task) return state;
      return {
        tasks: {
          ...state.tasks,
          [taskId]: { ...task, progress, status: 'running' },
        },
      };
    }),

  updateStatus: (taskId, status, error) =>
    set((state) => {
      const task = state.tasks[taskId];
      if (!task) return state;
      return {
        tasks: {
          ...state.tasks,
          [taskId]: { ...task, status, result: error ? { ...task.result!, error } : task.result },
        },
      };
    }),

  removeTask: (taskId) =>
    set((state) => {
      const { [taskId]: _, ...rest } = state.tasks;
      return { tasks: rest };
    }),

  clearCompleted: () =>
    set((state) => {
      const tasks: Record<string, TaskInfo> = {};
      for (const [id, task] of Object.entries(state.tasks)) {
        if (task.status === 'running' || task.status === 'pending') {
          tasks[id] = task;
        }
      }
      return { tasks };
    }),

  getRunningCount: () => {
    const { tasks } = get();
    return Object.values(tasks).filter((t) => t.status === 'running').length;
  },

  getTaskList: () => {
    const { tasks } = get();
    return Object.values(tasks).sort((a, b) => b.createdAt - a.createdAt);
  },
}));
