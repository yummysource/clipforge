/**
 * @file 常量定义
 * @description 定义功能卡片、格式列表、编码器列表、分辨率预设、帧率预设等全局常量
 */
import type { ConvertPreset, CompressPreset, ResolutionPreset, FrameRatePreset } from '@/types/presets';

/**
 * 功能卡片配置
 * @description 首页 3x3 网格展示的 9 个功能卡片信息
 */
export interface FeatureCard {
  /** 功能唯一标识，也是路由路径 */
  id: string;
  /** 功能名称 */
  name: string;
  /** 功能简述 */
  description: string;
  /** lucide-react 图标名称 */
  icon: string;
}

/** 9 个功能卡片列表，按首页网格顺序排列 */
export const FEATURE_CARDS: FeatureCard[] = [
  { id: 'convert',   name: '格式转换', description: '转换视频到 MP4/MOV/AVI 等格式',      icon: 'RefreshCw' },
  { id: 'compress',  name: '视频压缩', description: '智能压缩，保持画质降低体积',          icon: 'Shrink' },
  { id: 'trim',      name: '裁剪剪切', description: '截取片段、去头去尾',                  icon: 'Scissors' },
  { id: 'merge',     name: '合并拼接', description: '多个视频合为一个',                    icon: 'Layers' },
  { id: 'audio',     name: '音频处理', description: '提取音频、替换配音、调节音量',         icon: 'AudioLines' },
  { id: 'watermark', name: '加水印',   description: '添加图片水印或文字水印',              icon: 'Stamp' },
  { id: 'resize',    name: '分辨率调整', description: '调整分辨率、帧率、比例',            icon: 'Maximize2' },
  { id: 'gif',       name: 'GIF 制作',  description: '视频片段转 GIF 动图',               icon: 'Clapperboard' },
  { id: 'subtitle',  name: '字幕处理', description: '嵌入字幕、提取字幕、调整时间轴',      icon: 'Subtitles' },
  { id: 'download',  name: '视频下载', description: '从 YouTube/X/Instagram 下载视频',   icon: 'Download' },
];

/**
 * 支持的视频输出格式列表
 */
export const VIDEO_FORMATS = [
  { value: 'mp4',  label: 'MP4',  description: '通用性最强' },
  { value: 'mkv',  label: 'MKV',  description: '支持多轨道' },
  { value: 'mov',  label: 'MOV',  description: 'Apple 生态' },
  { value: 'webm', label: 'WebM', description: '网页优化' },
  { value: 'avi',  label: 'AVI',  description: '传统格式' },
  { value: 'ts',   label: 'TS',   description: '流媒体' },
  { value: 'flv',  label: 'FLV',  description: '直播流' },
] as const;

/**
 * 支持的视频编码器列表
 */
export const VIDEO_CODECS = [
  { value: 'libx264',      label: 'H.264',      description: '兼容性最佳' },
  { value: 'libx265',      label: 'H.265/HEVC', description: '高压缩率' },
  { value: 'h264_videotoolbox', label: 'H.264 (硬件)', description: 'macOS 硬件加速' },
  { value: 'hevc_videotoolbox', label: 'HEVC (硬件)',  description: 'macOS 硬件加速' },
  { value: 'libvpx-vp9',   label: 'VP9',        description: 'WebM 格式' },
  { value: 'libaom-av1',   label: 'AV1',        description: '新一代编码' },
  { value: 'copy',         label: '不转码',     description: '直接复制流' },
] as const;

/**
 * 支持的音频编码器列表
 */
export const AUDIO_CODECS = [
  { value: 'aac',          label: 'AAC',   description: '通用' },
  { value: 'libmp3lame',   label: 'MP3',   description: '传统' },
  { value: 'libopus',      label: 'Opus',  description: '高质量' },
  { value: 'flac',         label: 'FLAC',  description: '无损' },
  { value: 'pcm_s16le',    label: 'WAV',   description: '无压缩' },
  { value: 'copy',         label: '不转码', description: '直接复制' },
] as const;

/**
 * 支持的音频输出格式列表（音频提取时使用）
 */
export const AUDIO_FORMATS = [
  { value: 'mp3',  label: 'MP3',  description: '通用有损' },
  { value: 'aac',  label: 'AAC',  description: '高效有损' },
  { value: 'wav',  label: 'WAV',  description: '无压缩' },
  { value: 'flac', label: 'FLAC', description: '无损' },
  { value: 'ogg',  label: 'OGG',  description: '开源格式' },
] as const;

/**
 * 分辨率预设列表
 */
export const RESOLUTION_PRESETS: ResolutionPreset[] = [
  { name: '4K (2160p)',   width: 3840, height: 2160 },
  { name: '2K (1440p)',   width: 2560, height: 1440 },
  { name: '1080p',        width: 1920, height: 1080 },
  { name: '720p',         width: 1280, height: 720 },
  { name: '480p',         width: 854,  height: 480 },
  { name: '360p',         width: 640,  height: 360 },
];

/**
 * 帧率预设列表
 */
export const FRAME_RATE_PRESETS: FrameRatePreset[] = [
  { label: '60 fps', value: 60 },
  { label: '30 fps', value: 30 },
  { label: '24 fps', value: 24 },
  { label: '15 fps', value: 15 },
  { label: '10 fps', value: 10 },
];

/**
 * 格式转换预设列表
 */
export const CONVERT_PRESETS: ConvertPreset[] = [
  {
    id: 'social-media',
    name: '社交媒体',
    description: 'H.264 MP4，适合微信/抖音/B站',
    outputFormat: 'mp4',
    videoCodec: 'libx264',
    audioCodec: 'aac',
    quality: 23,
    encoderPreset: 'medium',
  },
  {
    id: 'web-optimized',
    name: '网页优化',
    description: '小体积 MP4，适合网页嵌入',
    outputFormat: 'mp4',
    videoCodec: 'libx264',
    audioCodec: 'aac',
    quality: 28,
    encoderPreset: 'fast',
  },
  {
    id: 'high-quality',
    name: '高质量存档',
    description: 'H.265 MKV，高质量低空间',
    outputFormat: 'mkv',
    videoCodec: 'libx265',
    audioCodec: 'aac',
    quality: 18,
    encoderPreset: 'slow',
  },
  {
    id: 'apple-ecosystem',
    name: 'Apple 生态',
    description: 'MOV 格式，适合 Final Cut / iMovie',
    outputFormat: 'mov',
    videoCodec: 'libx264',
    audioCodec: 'aac',
    quality: 20,
    encoderPreset: 'medium',
  },
  {
    id: 'lossless-copy',
    name: '无损转封装',
    description: '不重新编码，仅改变容器格式',
    outputFormat: 'mp4',
    videoCodec: 'copy',
    audioCodec: 'copy',
    quality: 0,
    encoderPreset: 'medium',
  },
];

/**
 * 压缩预设列表
 */
export const COMPRESS_PRESETS: CompressPreset[] = [
  {
    id: 'light',
    name: '轻度压缩',
    description: '保持高画质，体积减少约 30%',
    mode: 'byQuality',
    targetSizeMb: null,
    compressRatio: null,
    qualityLevel: 8,
  },
  {
    id: 'moderate',
    name: '中度压缩',
    description: '画质与体积平衡，减少约 50%',
    mode: 'byQuality',
    targetSizeMb: null,
    compressRatio: null,
    qualityLevel: 5,
  },
  {
    id: 'heavy',
    name: '重度压缩',
    description: '大幅减小体积，画质有损',
    mode: 'byQuality',
    targetSizeMb: null,
    compressRatio: null,
    qualityLevel: 3,
  },
];

/**
 * 支持的视频文件扩展名（用于文件过滤）
 */
export const VIDEO_EXTENSIONS = [
  'mp4', 'mkv', 'mov', 'avi', 'webm', 'flv', 'ts', 'wmv',
  'm4v', '3gp', 'ogv', 'mpg', 'mpeg', 'mts', 'm2ts',
] as const;

/**
 * 支持的音频文件扩展名
 */
export const AUDIO_EXTENSIONS = [
  'mp3', 'aac', 'wav', 'flac', 'ogg', 'wma', 'm4a', 'opus',
] as const;

/**
 * 支持的字幕文件扩展名
 */
export const SUBTITLE_EXTENSIONS = [
  'srt', 'ass', 'ssa', 'vtt', 'sub', 'idx',
] as const;

/**
 * 缩放算法列表
 */
export const SCALE_ALGORITHMS = [
  { value: 'lanczos',   label: 'Lanczos',   description: '高质量（推荐）' },
  { value: 'bicubic',   label: 'Bicubic',   description: '平衡' },
  { value: 'bilinear',  label: 'Bilinear',  description: '快速' },
  { value: 'neighbor',  label: 'Nearest',   description: '像素风格' },
] as const;

/**
 * GIF 抖动算法列表
 */
export const GIF_DITHER_ALGORITHMS = [
  { value: 'floyd_steinberg', label: 'Floyd-Steinberg', description: '默认，效果好' },
  { value: 'sierra2_4a',      label: 'Sierra',          description: '更快' },
  { value: 'bayer',           label: 'Bayer',           description: '规则图案' },
  { value: 'none',            label: '无抖动',          description: '色块风格' },
] as const;
