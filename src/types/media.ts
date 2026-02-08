/**
 * @file 媒体信息类型定义
 * @description 定义视频/音频/字幕流信息结构，与 Rust 后端 models/media.rs 对应
 *
 * 所有字段使用 camelCase 命名，与后端 serde(rename_all = "camelCase") 一致
 */

/** 视频流信息 */
export interface VideoStream {
  /** 流索引 */
  index: number;
  /** 编解码器名称（如 h264, hevc, vp9） */
  codecName: string;
  /** 视频宽度（像素） */
  width: number;
  /** 视频高度（像素） */
  height: number;
  /** 帧率（浮点数，如 29.97, 30, 60） */
  frameRate: number;
  /** 视频码率（bps），可能不存在 */
  bitrate: number | null;
  /** 像素格式（如 yuv420p, yuv444p） */
  pixFmt: string;
}

/** 音频流信息 */
export interface AudioStream {
  /** 流索引 */
  index: number;
  /** 编解码器名称（如 aac, mp3, flac） */
  codecName: string;
  /** 采样率（Hz，如 44100, 48000） */
  sampleRate: number;
  /** 声道数（1=单声道, 2=立体声） */
  channels: number;
  /** 音频码率（bps），可能不存在 */
  bitrate: number | null;
}

/** 字幕流信息 */
export interface SubtitleStream {
  /** 流索引 */
  index: number;
  /** 编解码器名称（如 srt, ass, mov_text） */
  codecName: string;
  /** 语言标签（如 eng, chi, jpn），可能不存在 */
  language: string | null;
}

/**
 * 媒体文件完整信息
 * @description 从 ffprobe 解析获得的媒体元数据，包含文件信息和所有流信息
 */
export interface MediaInfo {
  /** 文件绝对路径 */
  filePath: string;
  /** 文件名（含扩展名） */
  fileName: string;
  /** 文件大小（字节） */
  fileSize: number;
  /** 容器格式名称（如 mov,mp4,m4a,3gp） */
  formatName: string;
  /** 总时长（秒） */
  duration: number;
  /** 总码率（bps） */
  bitrate: number;
  /** 视频流信息列表 */
  videoStreams: VideoStream[];
  /** 音频流信息列表 */
  audioStreams: AudioStream[];
  /** 字幕流信息列表 */
  subtitleStreams: SubtitleStream[];
}

/**
 * 带有媒体信息的文件条目
 * @description 用于文件列表展示，包含文件路径和可选的媒体信息
 */
export interface MediaFile {
  /** 唯一标识（UUID） */
  id: string;
  /** 文件绝对路径 */
  path: string;
  /** 文件名（含扩展名） */
  name: string;
  /** 文件大小（字节） */
  size: number;
  /** 媒体信息（异步加载后填充） */
  mediaInfo: MediaInfo | null;
  /** 信息加载状态 */
  loading: boolean;
  /** 加载错误信息 */
  error: string | null;
}
