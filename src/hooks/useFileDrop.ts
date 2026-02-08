/**
 * @file 文件拖拽监听 Hook
 * @description 监听 Tauri 原生 DragDropEvent，处理文件拖入应用窗口的事件
 */
import { useEffect, useState, useCallback } from 'react';
import { getCurrentWebview } from '@tauri-apps/api/webview';

/** 文件拖拽状态 */
export interface FileDropState {
  /** 是否正在拖拽文件悬停于窗口上 */
  isDragging: boolean;
  /** 最近一次放下的文件路径列表 */
  droppedFiles: string[];
}

/**
 * 监听 Tauri DragDropEvent 的自定义 Hook
 *
 * 自动注册和清理事件监听器，跟踪拖拽悬停状态和放下的文件。
 * 支持过滤指定文件扩展名。
 *
 * @param allowedExtensions - 允许的文件扩展名列表（小写，不含点号），为空则不过滤
 * @param onDrop - 文件放下时的回调，参数为过滤后的文件路径列表
 * @returns 拖拽状态对象
 */
export function useFileDrop(
  allowedExtensions: string[] = [],
  onDrop?: (files: string[]) => void,
): FileDropState {
  const [isDragging, setIsDragging] = useState(false);
  const [droppedFiles, setDroppedFiles] = useState<string[]>([]);

  /** 过滤文件扩展名 */
  const filterFiles = useCallback((paths: string[]): string[] => {
    if (allowedExtensions.length === 0) return paths;
    return paths.filter((p) => {
      const ext = p.split('.').pop()?.toLowerCase() ?? '';
      return allowedExtensions.includes(ext);
    });
  }, [allowedExtensions]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    const setup = async () => {
      const webview = getCurrentWebview();
      unlisten = await webview.onDragDropEvent((event) => {
        if (event.payload.type === 'over') {
          /* 文件拖拽悬停在窗口上方 */
          setIsDragging(true);
        } else if (event.payload.type === 'drop') {
          /* 文件放下 */
          setIsDragging(false);
          const filtered = filterFiles(event.payload.paths);
          setDroppedFiles(filtered);
          onDrop?.(filtered);
        } else if (event.payload.type === 'leave') {
          /* 文件拖拽离开窗口 */
          setIsDragging(false);
        }
      });
    };

    setup();

    return () => {
      unlisten?.();
    };
  }, [filterFiles, onDrop]);

  return { isDragging, droppedFiles };
}
