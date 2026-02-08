/**
 * @file ffmpeg 操作服务封装
 * @description 封装所有 ffmpeg 操作的 Tauri invoke 调用，每个功能对应一个函数
 *
 * 所有操作函数接收参数对象和事件回调，通过 Tauri Channel 接收进度推送
 */
import { invoke, Channel } from '@tauri-apps/api/core';
import type { TaskEvent } from '@/types/task';

/**
 * 创建 Tauri Channel 并绑定事件回调
 *
 * @param onEvent - 接收后端推送的任务事件回调
 * @returns 配置好的 Channel 实例
 */
function createProgressChannel(onEvent: (event: TaskEvent) => void): Channel<TaskEvent> {
  const channel = new Channel<TaskEvent>();
  channel.onmessage = onEvent;
  return channel;
}

/** 格式转换参数 */
export interface ConvertParams {
  inputPath: string;
  outputPath: string;
  outputFormat: string;
  videoCodec: string;
  audioCodec: string;
  quality?: number;
  preset?: string;
  hardwareAccel?: boolean;
  extraArgs?: string[];
}

/**
 * 执行格式转换
 *
 * @param params - 转换参数
 * @param onEvent - 进度事件回调
 * @returns 任务 ID
 */
export async function convertVideo(
  params: ConvertParams,
  onEvent: (event: TaskEvent) => void,
): Promise<string> {
  const channel = createProgressChannel(onEvent);
  return invoke<string>('convert_video', { params, onProgress: channel });
}

/** 视频压缩参数 */
export interface CompressParams {
  inputPath: string;
  outputPath: string;
  mode: string;
  targetSizeMb?: number;
  compressRatio?: number;
  qualityLevel?: number;
  preset?: string;
  hardwareAccel?: boolean;
}

/**
 * 执行视频压缩
 *
 * @param params - 压缩参数
 * @param onEvent - 进度事件回调
 * @returns 任务 ID
 */
export async function compressVideo(
  params: CompressParams,
  onEvent: (event: TaskEvent) => void,
): Promise<string> {
  const channel = createProgressChannel(onEvent);
  return invoke<string>('compress_video', { params, onProgress: channel });
}

/** 视频裁剪参数 */
export interface TrimParams {
  inputPath: string;
  outputPath: string;
  segments: Array<{ start: number; end: number }>;
  preciseCut: boolean;
  mergeSegments: boolean;
}

/**
 * 执行视频裁剪
 *
 * @param params - 裁剪参数
 * @param onEvent - 进度事件回调
 * @returns 任务 ID
 */
export async function trimVideo(
  params: TrimParams,
  onEvent: (event: TaskEvent) => void,
): Promise<string> {
  const channel = createProgressChannel(onEvent);
  return invoke<string>('trim_video', { params, onProgress: channel });
}

/** 视频合并参数 */
export interface MergeParams {
  inputPaths: string[];
  outputPath: string;
  transition?: { transitionType: string; duration: number };
  normalize: boolean;
  targetResolution?: string;
  targetFps?: number;
}

/**
 * 执行视频合并
 *
 * @param params - 合并参数
 * @param onEvent - 进度事件回调
 * @returns 任务 ID
 */
export async function mergeVideos(
  params: MergeParams,
  onEvent: (event: TaskEvent) => void,
): Promise<string> {
  const channel = createProgressChannel(onEvent);
  return invoke<string>('merge_videos', { params, onProgress: channel });
}

/** 音频处理参数 */
export interface AudioParams {
  inputPath: string;
  outputPath: string;
  mode: string;
  outputFormat?: string;
  replaceAudioPath?: string;
  volume?: number;
  volumeDb?: number;
  normalize?: boolean;
  fadeIn?: number;
  fadeOut?: number;
}

/**
 * 执行音频处理
 *
 * @param params - 音频参数
 * @param onEvent - 进度事件回调
 * @returns 任务 ID
 */
export async function processAudio(
  params: AudioParams,
  onEvent: (event: TaskEvent) => void,
): Promise<string> {
  const channel = createProgressChannel(onEvent);
  return invoke<string>('process_audio', { params, onProgress: channel });
}

/** 水印参数 */
export interface WatermarkParams {
  inputPath: string;
  outputPath: string;
  watermarkType: string;
  imagePath?: string;
  imageScale?: number;
  opacity?: number;
  text?: string;
  fontPath?: string;
  fontSize?: number;
  fontColor?: string;
  borderWidth?: number;
  borderColor?: string;
  position: string;
  offsetX?: number;
  offsetY?: number;
}

/**
 * 执行加水印
 *
 * @param params - 水印参数
 * @param onEvent - 进度事件回调
 * @returns 任务 ID
 */
export async function addWatermark(
  params: WatermarkParams,
  onEvent: (event: TaskEvent) => void,
): Promise<string> {
  const channel = createProgressChannel(onEvent);
  return invoke<string>('add_watermark', { params, onProgress: channel });
}

/** 分辨率/帧率调整参数 */
export interface ResizeParams {
  inputPath: string;
  outputPath: string;
  width?: number;
  height?: number;
  keepAspectRatio: boolean;
  scaleAlgorithm?: string;
  fps?: number;
  aspectMode?: string;
}

/**
 * 执行分辨率/帧率调整
 *
 * @param params - 调整参数
 * @param onEvent - 进度事件回调
 * @returns 任务 ID
 */
export async function resizeVideo(
  params: ResizeParams,
  onEvent: (event: TaskEvent) => void,
): Promise<string> {
  const channel = createProgressChannel(onEvent);
  return invoke<string>('resize_video', { params, onProgress: channel });
}

/** GIF 制作参数 */
export interface GifParams {
  inputPath: string;
  outputPath: string;
  startTime: number;
  duration: number;
  width: number;
  fps: number;
  loopCount: number;
  maxColors?: number;
  dither?: string;
  quality?: string;
}

/**
 * 执行 GIF 制作
 *
 * @param params - GIF 参数
 * @param onEvent - 进度事件回调
 * @returns 任务 ID
 */
export async function createGif(
  params: GifParams,
  onEvent: (event: TaskEvent) => void,
): Promise<string> {
  const channel = createProgressChannel(onEvent);
  return invoke<string>('create_gif', { params, onProgress: channel });
}

/** 字幕处理参数 */
export interface SubtitleParams {
  inputPath: string;
  outputPath: string;
  mode: string;
  subtitlePath?: string;
  subtitleIndex?: number;
  outputFormat?: string;
  fontName?: string;
  fontSize?: number;
  primaryColor?: string;
  outlineWidth?: number;
  marginV?: number;
}

/**
 * 执行字幕处理
 *
 * @param params - 字幕参数
 * @param onEvent - 进度事件回调
 * @returns 任务 ID
 */
export async function processSubtitle(
  params: SubtitleParams,
  onEvent: (event: TaskEvent) => void,
): Promise<string> {
  const channel = createProgressChannel(onEvent);
  return invoke<string>('process_subtitle', { params, onProgress: channel });
}

/**
 * 取消指定任务
 *
 * @param taskId - 要取消的任务 ID
 */
export async function cancelTask(taskId: string): Promise<void> {
  return invoke('cancel_task', { taskId });
}
