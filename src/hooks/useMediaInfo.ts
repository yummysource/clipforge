/**
 * @file 媒体信息获取 Hook
 * @description 封装 ffprobe 调用，提供加载状态管理和缓存
 */
import { useState, useCallback, useRef } from 'react';
import type { MediaInfo } from '@/types/media';
import { getMediaInfo } from '@/services/ffprobe';

/** 媒体信息 Hook 返回值 */
export interface UseMediaInfoReturn {
  /** 媒体信息（加载完成后） */
  mediaInfo: MediaInfo | null;
  /** 是否正在加载 */
  loading: boolean;
  /** 错误信息 */
  error: string | null;
  /** 手动获取指定文件的媒体信息 */
  fetchInfo: (filePath: string) => Promise<MediaInfo | null>;
  /** 清除当前信息 */
  clear: () => void;
}

/**
 * 获取并缓存媒体信息的自定义 Hook
 *
 * 使用内部缓存避免重复查询同一文件。支持手动触发获取和清除。
 *
 * @returns 媒体信息状态和控制函数
 */
export function useMediaInfo(): UseMediaInfoReturn {
  const [mediaInfo, setMediaInfo] = useState<MediaInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** 内部缓存：文件路径 -> MediaInfo */
  const cacheRef = useRef<Map<string, MediaInfo>>(new Map());

  /** 获取指定文件的媒体信息，优先从缓存读取 */
  const fetchInfo = useCallback(async (filePath: string): Promise<MediaInfo | null> => {
    /* 检查缓存 */
    const cached = cacheRef.current.get(filePath);
    if (cached) {
      setMediaInfo(cached);
      setError(null);
      return cached;
    }

    setLoading(true);
    setError(null);

    try {
      const info = await getMediaInfo(filePath);
      cacheRef.current.set(filePath, info);
      setMediaInfo(info);
      return info;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setMediaInfo(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /** 清除当前媒体信息和错误状态 */
  const clear = useCallback(() => {
    setMediaInfo(null);
    setError(null);
  }, []);

  return { mediaInfo, loading, error, fetchInfo, clear };
}
