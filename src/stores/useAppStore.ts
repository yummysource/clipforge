/**
 * @file 全局应用状态
 * @description 管理应用级别的全局状态，包括 ffmpeg 版本信息、当前选中文件等
 */
import { create } from 'zustand';
import type { MediaFile } from '@/types/media';

/** 应用全局状态接口 */
interface AppState {
  /** ffmpeg 版本字符串（启动时检测） */
  ffmpegVersion: string;
  /** 当前功能页已加载的文件列表 */
  files: MediaFile[];
  /** 当前选中的文件索引 */
  selectedFileIndex: number;
  /** 全局加载状态提示 */
  globalLoading: boolean;

  /** 设置 ffmpeg 版本 */
  setFfmpegVersion: (version: string) => void;
  /** 添加文件到列表 */
  addFiles: (files: MediaFile[]) => void;
  /** 从列表移除文件 */
  removeFile: (fileId: string) => void;
  /** 更新文件的媒体信息 */
  updateFileMediaInfo: (fileId: string, update: Partial<MediaFile>) => void;
  /** 设置选中的文件索引 */
  setSelectedFileIndex: (index: number) => void;
  /** 清空文件列表 */
  clearFiles: () => void;
  /** 重新排序文件列表（合并功能用） */
  reorderFiles: (fromIndex: number, toIndex: number) => void;
  /** 设置全局加载状态 */
  setGlobalLoading: (loading: boolean) => void;
}

/**
 * 全局应用状态 Store
 *
 * 存储跨页面共享的数据，包括文件列表、ffmpeg 版本等。
 * 各功能页面通过此 store 管理已添加的文件。
 */
export const useAppStore = create<AppState>((set) => ({
  ffmpegVersion: '',
  files: [],
  selectedFileIndex: 0,
  globalLoading: false,

  setFfmpegVersion: (version) => set({ ffmpegVersion: version }),

  addFiles: (newFiles) =>
    set((state) => ({ files: [...state.files, ...newFiles] })),

  removeFile: (fileId) =>
    set((state) => {
      const files = state.files.filter((f) => f.id !== fileId);
      /* 调整选中索引 */
      const selectedFileIndex = Math.min(state.selectedFileIndex, Math.max(0, files.length - 1));
      return { files, selectedFileIndex };
    }),

  updateFileMediaInfo: (fileId, update) =>
    set((state) => ({
      files: state.files.map((f) => (f.id === fileId ? { ...f, ...update } : f)),
    })),

  setSelectedFileIndex: (index) => set({ selectedFileIndex: index }),

  clearFiles: () => set({ files: [], selectedFileIndex: 0 }),

  reorderFiles: (fromIndex, toIndex) =>
    set((state) => {
      const files = [...state.files];
      const [moved] = files.splice(fromIndex, 1);
      files.splice(toIndex, 0, moved);
      return { files };
    }),

  setGlobalLoading: (loading) => set({ globalLoading: loading }),
}));
