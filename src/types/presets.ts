/**
 * @file 预设类型定义
 * @description 定义各功能页面的预设方案类型
 */

/**
 * 格式转换预设
 * @description 预配置的输出格式和编码器组合
 */
export interface ConvertPreset {
  /** 预设唯一标识 */
  id: string;
  /** 预设名称（如 "社交媒体 MP4"） */
  name: string;
  /** 预设描述 */
  description: string;
  /** 输出容器格式 */
  outputFormat: string;
  /** 视频编码器 */
  videoCodec: string;
  /** 音频编码器 */
  audioCodec: string;
  /** CRF 质量值（越小质量越高） */
  quality: number;
  /** 编码速度预设 */
  encoderPreset: string;
}

/**
 * 压缩模式枚举
 * @description 视频压缩的三种目标模式
 */
export type CompressMode = 'bySize' | 'byRatio' | 'byQuality';

/**
 * 压缩预设
 * @description 预配置的视频压缩方案
 */
export interface CompressPreset {
  /** 预设唯一标识 */
  id: string;
  /** 预设名称 */
  name: string;
  /** 预设描述 */
  description: string;
  /** 压缩模式 */
  mode: CompressMode;
  /** 目标大小（MB），按大小压缩时使用 */
  targetSizeMb: number | null;
  /** 压缩比 (0.0-1.0)，按比例压缩时使用 */
  compressRatio: number | null;
  /** 质量等级 (1-10)，按质量压缩时使用 */
  qualityLevel: number | null;
}

/**
 * 音频处理模式枚举
 * @description 四种音频处理模式
 */
export type AudioMode = 'extract' | 'replace' | 'mute' | 'adjust';

/**
 * 水印类型枚举
 */
export type WatermarkType = 'image' | 'text';

/**
 * 水印位置枚举
 * @description 九宫格水印位置选项
 */
export type WatermarkPosition =
  | 'topLeft' | 'topCenter' | 'topRight'
  | 'centerLeft' | 'center' | 'centerRight'
  | 'bottomLeft' | 'bottomCenter' | 'bottomRight';

/**
 * 字幕处理模式枚举
 */
export type SubtitleMode = 'embed' | 'extract' | 'burnIn';

/**
 * 分辨率预设
 * @description 常用分辨率快捷选项
 */
export interface ResolutionPreset {
  /** 预设名称（如 "1080p"） */
  name: string;
  /** 宽度 */
  width: number;
  /** 高度 */
  height: number;
}

/**
 * 帧率预设
 * @description 常用帧率快捷选项
 */
export interface FrameRatePreset {
  /** 显示标签（如 "30 fps"） */
  label: string;
  /** 帧率值 */
  value: number;
}
