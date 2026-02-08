/**
 * @file 视频下载服务封装
 * @description 封装 yt-dlp 相关的 Tauri invoke 调用：解析 URL 和下载视频
 */
import { invoke, Channel } from '@tauri-apps/api/core';
import type { TaskEvent } from '@/types/task';

/** 视频格式信息（对应 Rust FormatInfo） */
export interface FormatInfo {
  /** yt-dlp 格式 ID */
  formatId: string;
  /** 格式描述（如 "1080p"） */
  formatNote: string;
  /** 文件扩展名 */
  ext: string;
  /** 视频宽度（像素） */
  width: number;
  /** 视频高度（像素） */
  height: number;
  /** 预估文件大小（字节） */
  filesize: number;
  /** 是否包含视频流 */
  hasVideo: boolean;
  /** 是否包含音频流 */
  hasAudio: boolean;
  /** 视频编码 */
  vcodec: string;
  /** 音频编码 */
  acodec: string;
}

/** 视频信息（对应 Rust VideoInfo） */
export interface VideoInfo {
  /** 视频标题 */
  title: string;
  /** 时长（秒） */
  duration: number;
  /** 缩略图 URL */
  thumbnail: string;
  /** 上传者 */
  uploader: string;
  /** 平台标识 */
  platform: string;
  /** 可用格式列表 */
  formats: FormatInfo[];
}

/** 下载参数 */
export interface DownloadParams {
  /** 视频 URL */
  url: string;
  /** yt-dlp 格式 ID */
  formatId: string;
  /** 输出文件路径 */
  outputPath: string;
}

/**
 * 解析视频 URL，获取视频信息和可用格式
 *
 * @param url - 视频页面 URL
 * @returns 视频信息（标题、时长、格式列表等）
 */
export async function parseVideoUrl(url: string): Promise<VideoInfo> {
  return invoke<VideoInfo>('parse_video_url', { url });
}

/**
 * 下载视频
 *
 * @param params - 下载参数
 * @param onEvent - 进度事件回调
 * @returns 任务 ID
 */
export async function downloadVideo(
  params: DownloadParams,
  onEvent: (event: TaskEvent) => void,
): Promise<string> {
  const channel = new Channel<TaskEvent>();
  channel.onmessage = onEvent;
  return invoke<string>('download_video', { params, onProgress: channel });
}
