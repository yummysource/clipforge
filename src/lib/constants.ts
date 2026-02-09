/**
 * @file 常量定义
 * @description 定义功能卡片、格式列表、编码器列表、分辨率预设、帧率预设等全局常量。
 * 所有用户可见文本通过 i18n 翻译键引用，组件渲染时调用 t() 获取对应语言文本
 */
import type { ConvertPreset, CompressPreset, ResolutionPreset, FrameRatePreset } from '@/types/presets';

/**
 * 功能卡片配置
 * @description 首页 3x3 网格展示的功能卡片信息
 */
export interface FeatureCard {
  /** 功能唯一标识，也是路由路径 */
  id: string;
  /** i18n 键前缀（features.{id}），组件中用 t(`features.${id}.name`) 获取翻译 */
  nameKey: string;
  /** i18n 键前缀（features.{id}），组件中用 t(`features.${id}.description`) 获取翻译 */
  descKey: string;
  /** lucide-react 图标名称 */
  icon: string;
}

/** 功能卡片列表，按首页网格顺序排列 */
export const FEATURE_CARDS: FeatureCard[] = [
  { id: 'convert',   nameKey: 'features.convert.name',   descKey: 'features.convert.description',   icon: 'RefreshCw' },
  { id: 'compress',  nameKey: 'features.compress.name',  descKey: 'features.compress.description',  icon: 'Shrink' },
  { id: 'trim',      nameKey: 'features.trim.name',      descKey: 'features.trim.description',      icon: 'Scissors' },
  { id: 'merge',     nameKey: 'features.merge.name',     descKey: 'features.merge.description',     icon: 'Layers' },
  { id: 'audio',     nameKey: 'features.audio.name',     descKey: 'features.audio.description',     icon: 'AudioLines' },
  { id: 'watermark', nameKey: 'features.watermark.name', descKey: 'features.watermark.description', icon: 'Stamp' },
  { id: 'resize',    nameKey: 'features.resize.name',    descKey: 'features.resize.description',    icon: 'Maximize2' },
  { id: 'gif',       nameKey: 'features.gif.name',       descKey: 'features.gif.description',       icon: 'Clapperboard' },
  { id: 'subtitle',  nameKey: 'features.subtitle.name',  descKey: 'features.subtitle.description',  icon: 'Subtitles' },
  { id: 'download',  nameKey: 'features.download.name',  descKey: 'features.download.description',  icon: 'Download' },
];

/**
 * 支持的视频输出格式列表
 * @description descKey 对应 i18n 翻译键，组件中用 t(descKey) 获取
 */
export const VIDEO_FORMATS = [
  { value: 'mp4',  label: 'MP4',  descKey: 'formats.mostCompatible' },
  { value: 'mkv',  label: 'MKV',  descKey: 'formats.multiTrack' },
  { value: 'mov',  label: 'MOV',  descKey: 'formats.appleEco' },
  { value: 'webm', label: 'WebM', descKey: 'formats.webOptimized' },
  { value: 'avi',  label: 'AVI',  descKey: 'formats.traditional' },
  { value: 'ts',   label: 'TS',   descKey: 'formats.streaming' },
  { value: 'flv',  label: 'FLV',  descKey: 'formats.liveStream' },
] as const;

/**
 * 支持的视频编码器列表
 */
export const VIDEO_CODECS = [
  { value: 'libx264',             label: 'H.264',      descKey: 'codecs.bestCompatibility' },
  { value: 'libx265',             label: 'H.265/HEVC', descKey: 'codecs.highCompression' },
  { value: 'h264_videotoolbox',   label: 'H.264 (HW)', descKey: 'codecs.hwAccel' },
  { value: 'hevc_videotoolbox',   label: 'HEVC (HW)',  descKey: 'codecs.hwAccel' },
  { value: 'libvpx-vp9',          label: 'VP9',        descKey: 'codecs.webmFormat' },
  { value: 'libaom-av1',          label: 'AV1',        descKey: 'codecs.nextGen' },
  { value: 'copy',                label: 'Copy',       descKey: 'codecs.noCopy' },
] as const;

/**
 * 支持的音频编码器列表
 */
export const AUDIO_CODECS = [
  { value: 'aac',          label: 'AAC',   descKey: 'codecs.universal' },
  { value: 'libmp3lame',   label: 'MP3',   descKey: 'codecs.legacy' },
  { value: 'libopus',      label: 'Opus',  descKey: 'codecs.highQuality' },
  { value: 'flac',         label: 'FLAC',  descKey: 'codecs.lossless' },
  { value: 'pcm_s16le',    label: 'WAV',   descKey: 'codecs.uncompressed' },
  { value: 'copy',         label: 'Copy',  descKey: 'codecs.copyDirect' },
] as const;

/**
 * 支持的音频输出格式列表（音频提取时使用）
 */
export const AUDIO_FORMATS = [
  { value: 'mp3',  label: 'MP3',  descKey: 'codecs.universalLossy' },
  { value: 'aac',  label: 'AAC',  descKey: 'codecs.efficientLossy' },
  { value: 'wav',  label: 'WAV',  descKey: 'codecs.uncompressed' },
  { value: 'flac', label: 'FLAC', descKey: 'codecs.lossless' },
  { value: 'ogg',  label: 'OGG',  descKey: 'codecs.openSource' },
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
 * @description nameKey/descKey 对应 i18n 翻译键
 */
export const CONVERT_PRESETS: (ConvertPreset & { nameKey: string; descKey: string })[] = [
  {
    id: 'social-media',
    name: '', nameKey: 'presets.socialMedia', descKey: 'presets.socialMediaDesc',
    description: '',
    outputFormat: 'mp4',
    videoCodec: 'libx264',
    audioCodec: 'aac',
    quality: 23,
    encoderPreset: 'medium',
  },
  {
    id: 'web-optimized',
    name: '', nameKey: 'presets.webOptimized', descKey: 'presets.webOptimizedDesc',
    description: '',
    outputFormat: 'mp4',
    videoCodec: 'libx264',
    audioCodec: 'aac',
    quality: 28,
    encoderPreset: 'fast',
  },
  {
    id: 'high-quality',
    name: '', nameKey: 'presets.highQuality', descKey: 'presets.highQualityDesc',
    description: '',
    outputFormat: 'mkv',
    videoCodec: 'libx265',
    audioCodec: 'aac',
    quality: 18,
    encoderPreset: 'slow',
  },
  {
    id: 'apple-ecosystem',
    name: '', nameKey: 'presets.appleEcosystem', descKey: 'presets.appleEcosystemDesc',
    description: '',
    outputFormat: 'mov',
    videoCodec: 'libx264',
    audioCodec: 'aac',
    quality: 20,
    encoderPreset: 'medium',
  },
  {
    id: 'lossless-copy',
    name: '', nameKey: 'presets.losslessCopy', descKey: 'presets.losslessCopyDesc',
    description: '',
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
export const COMPRESS_PRESETS: (CompressPreset & { nameKey: string; descKey: string })[] = [
  {
    id: 'light',
    name: '', nameKey: 'presets.lightCompress', descKey: 'presets.lightCompressDesc',
    description: '',
    mode: 'byQuality',
    targetSizeMb: null,
    compressRatio: null,
    qualityLevel: 8,
  },
  {
    id: 'moderate',
    name: '', nameKey: 'presets.moderateCompress', descKey: 'presets.moderateCompressDesc',
    description: '',
    mode: 'byQuality',
    targetSizeMb: null,
    compressRatio: null,
    qualityLevel: 5,
  },
  {
    id: 'heavy',
    name: '', nameKey: 'presets.heavyCompress', descKey: 'presets.heavyCompressDesc',
    description: '',
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
  { value: 'lanczos',   label: 'Lanczos',   descKey: 'scaleAlgorithms.lanczos' },
  { value: 'bicubic',   label: 'Bicubic',   descKey: 'scaleAlgorithms.bicubic' },
  { value: 'bilinear',  label: 'Bilinear',  descKey: 'scaleAlgorithms.bilinear' },
  { value: 'neighbor',  label: 'Nearest',   descKey: 'scaleAlgorithms.nearest' },
] as const;

/**
 * GIF 抖动算法列表
 */
export const GIF_DITHER_ALGORITHMS = [
  { value: 'floyd_steinberg', label: 'Floyd-Steinberg', descKey: 'ditherAlgorithms.floydSteinberg' },
  { value: 'sierra2_4a',      label: 'Sierra',          descKey: 'ditherAlgorithms.sierra' },
  { value: 'bayer',           label: 'Bayer',           descKey: 'ditherAlgorithms.bayer' },
  { value: 'none',            label: 'None',            descKey: 'ditherAlgorithms.noDither' },
] as const;
