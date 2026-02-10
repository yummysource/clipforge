/**
 * @file 英文翻译字典
 * @description 作为翻译系统的基准类型，所有其他语言必须实现相同结构。
 * 约 250+ 个翻译键，按功能命名空间分组
 */

const en = {
  // ── 通用词汇 ──
  common: {
    start: 'Start',
    cancel: 'Cancel',
    reset: 'Reset',
    processing: 'Processing...',
    completed: 'Completed',
    failed: 'Failed',
    cancelled: 'Cancelled',
    ready: 'Ready',
    retry: 'Retry',
    continueProcessing: 'Continue',
    cancelProcessing: 'Cancel',
    calculating: 'Calculating...',
    speed: 'speed',
    delete: 'Delete',
    save: 'Save',
    close: 'Close',
    confirm: 'Confirm',
    on: 'On',
    off: 'Off',
  },

  // ── 应用首页 ──
  app: {
    title: 'ClipForge',
    subtitle: 'Professional Video Processing Toolkit',
  },

  // ── 功能卡片名称和描述 ──
  features: {
    convert: { name: 'Convert', description: 'Convert video to MP4/MOV/AVI etc.' },
    compress: { name: 'Compress', description: 'Smart compression, maintaining quality' },
    trim: { name: 'Trim', description: 'Clip segments, trim start/end' },
    merge: { name: 'Merge', description: 'Combine multiple videos into one' },
    audio: { name: 'Audio', description: 'Extract, replace, adjust volume' },
    watermark: { name: 'Watermark', description: 'Add image or text watermark' },
    resize: { name: 'Resize', description: 'Adjust resolution, frame rate, ratio' },
    gif: { name: 'GIF Maker', description: 'Convert video clip to GIF' },
    subtitle: { name: 'Subtitle', description: 'Embed, extract, burn-in subtitles' },
    download: { name: 'Download', description: 'Download from YouTube/X/Instagram' },
  },

  // ── 文件操作 ──
  file: {
    dragHere: 'Drag files here',
    orClickSelect: 'or click to select',
    supported: 'Supported',
    addMore: 'Add more files',
    filesAdded: '{count} files added',
    removeFile: 'Remove file',
    selectFileToView: 'Select a file to view info',
    selectFileToPreview: 'Select a file to preview',
    fileInfo: 'File Info',
    fileName: 'File name',
    fileSize: 'Size',
    duration: 'Duration',
    format: 'Format',
    resolution: 'Resolution',
    frameRate: 'Frame rate',
    videoCodec: 'Video codec',
    videoBitrate: 'Video bitrate',
    audioCodec: 'Audio codec',
    sampleRate: 'Sample rate',
    channels: 'Channels',
    totalBitrate: 'Total bitrate',
    mono: 'Mono',
    channelsCount: '{count} channels',
    cannotGetMediaInfo: 'Cannot get media info',
  },

  // ── Preview ──
  preview: {
    unsupportedFormat: 'Browser cannot preview this format',
    unsupportedFormatDesc: '{format} format cannot be previewed directly in browser, but the file has been converted successfully. Consider converting to MP4/WebM for preview support.',
  },

  // ── 进度面板 ──
  progress: {
    processing: 'Processing...',
    completed: 'Completed',
    failed: 'Failed',
    cancelled: 'Cancelled',
    ready: 'Ready',
  },

  // ── 设置页 ──
  settings: {
    title: 'Settings',
    output: 'Output',
    sameAsSource: 'Output to source directory',
    sameAsSourceDesc: 'Save output files to the same directory as source files',
    outputDirectory: 'Output directory',
    selectDirectory: 'Select...',
    outputSuffix: 'Output file suffix',
    outputSuffixDesc: 'Append suffix to output file name (current: "{suffix}")',
    overwriteExisting: 'Overwrite existing files',
    overwriteExistingDesc: 'Automatically overwrite when output file already exists',
    performance: 'Performance',
    hardwareAccel: 'Hardware acceleration',
    hardwareAccelDesc: 'Use macOS VideoToolbox for encoding/decoding',
    maxConcurrent: 'Max concurrent tasks',
    maxConcurrentDesc: 'Maximum number of concurrent tasks (current: {count})',
    notifications: 'Notifications',
    notifyOnComplete: 'Completion notification',
    notifyOnCompleteDesc: 'Send system notification when processing completes',
    openOnComplete: 'Auto open directory',
    openOnCompleteDesc: 'Open output directory when processing completes',
    language: 'Language',
    languageDesc: 'Interface display language',
    resetDefaults: 'Reset to Defaults',
  },

  // ── 布局组件 ──
  layout: {
    home: 'Home',
    dragToStart: 'Drag files onto cards to quick start',
    tasksRunning: '{count} tasks running',
    noActiveTasks: 'No active tasks',
    startProcessing: 'Start',
    previewTab: 'Preview',
    resultTab: 'Result',
  },

  // ── 格式转换页 ──
  convert: {
    outputFormat: 'Output Format',
    videoCodec: 'Video Codec',
    qualityLevel: 'Quality (CRF: {value})',
    highQuality: 'Best quality',
    lowQuality: 'Smallest file',
    advancedToggle: '{action} advanced options',
    expand: 'Expand',
    collapse: 'Collapse',
    audioCodec: 'Audio Codec',
    webmCodecHint: '💡 WebM format only supports VP8/VP9/AV1 video and Vorbis/Opus audio. Incompatible codecs will be auto-replaced with VP9 + Opus.',
  },

  // ── 压缩页 ──
  compress: {
    mode: 'Compression Mode',
    bySize: 'By target size',
    byRatio: 'By ratio',
    byQuality: 'By quality',
    targetSize: 'Target size: {value} MB',
    ratio: 'Ratio: {value}%',
    ratioMin: '10% (heavy)',
    ratioMax: '90% (light)',
    qualityLevel: 'Quality: {value}/10',
    qualityMin: 'Low quality (small)',
    qualityMax: 'High quality (large)',
  },

  // ── 裁剪页 ──
  trim: {
    preciseCut: 'Precise cut',
    preciseCutDesc: 'Re-encode for frame-accurate cutting, slower',
    mergeSegments: 'Merge segments',
    mergeSegmentsDesc: 'Merge multiple segments into one file',
  },

  // ── 合并页 ──
  merge: {
    dragToReorder: 'Drag to reorder videos',
    moveUp: 'Up',
    moveDown: 'Down',
    totalDuration: 'Total: {value}',
    transition: 'Transition',
    transitionNone: 'None',

    // Transition effect groups
    transitionGroupFade: 'Fade Effects',
    transitionGroupSlide: 'Slide Effects',
    transitionGroupWipe: 'Wipe Effects',
    transitionGroupDissolve: 'Dissolve Effects',
    transitionGroupZoom: 'Zoom Effects',
    transitionGroupSpecial: 'Special Effects',

    // Fade effects
    transitionFade: 'Fade',
    transitionFadeBlack: 'Fade through black',
    transitionFadeWhite: 'Fade through white',
    transitionFadeGrays: 'Fade through grays',

    // Slide effects
    transitionSlideLeft: 'Slide left',
    transitionSlideRight: 'Slide right',
    transitionSlideUp: 'Slide up',
    transitionSlideDown: 'Slide down',

    // Wipe effects
    transitionWipeLeft: 'Wipe left',
    transitionWipeRight: 'Wipe right',
    transitionWipeUp: 'Wipe up',
    transitionWipeDown: 'Wipe down',

    // Dissolve effects
    transitionDissolve: 'Dissolve',
    transitionPixelize: 'Pixelize',

    // Zoom effects
    transitionZoomIn: 'Zoom in',
    transitionSmoothLeft: 'Smooth left',
    transitionSmoothRight: 'Smooth right',
    transitionSmoothUp: 'Smooth up',
    transitionSmoothDown: 'Smooth down',

    // Special effects
    transitionCircleOpen: 'Circle open',
    transitionCircleClose: 'Circle close',
    transitionDiagTL: 'Diagonal top-left',
    transitionDiagTR: 'Diagonal top-right',
    transitionDiagBL: 'Diagonal bottom-left',
    transitionDiagBR: 'Diagonal bottom-right',
    transitionRadial: 'Radial',
    transitionHBlur: 'Horizontal blur',

    transitionDuration: 'Transition duration: {value}s',
    normalize: 'Normalize resolution/fps',
    normalizeDesc: 'Auto adjust all videos to same resolution and frame rate',
    mergeFiles: 'Merge {count} files',
  },

  // ── 音频页 ──
  audio: {
    mode: 'Processing Mode',
    extract: 'Extract audio',
    extractDesc: 'Export audio track',
    replace: 'Replace audio',
    replaceDesc: 'Replace audio track',
    mute: 'Mute',
    muteDesc: 'Remove audio',
    adjust: 'Volume',
    adjustDesc: 'Adjust volume',
    outputFormat: 'Output Format',
    replaceFile: 'Replacement audio file',
    clickSelectAudio: 'Click to select audio file...',
    volume: 'Volume: {value} dB',
    volumeMin: '-20 dB (quieter)',
    volumeZero: '0 dB',
    volumeMax: '+20 dB (louder)',
  },

  // ── 水印页 ──
  watermark: {
    imageWatermark: 'Image watermark',
    textWatermark: 'Text watermark',
    watermarkImage: 'Watermark image',
    clickSelectImage: 'Click to select image...',
    imageSize: 'Size: {value}%',
    watermarkText: 'Watermark text',
    textPlaceholder: 'Enter watermark text...',
    fontSize: 'Font size',
    fontColor: 'Color',
    opacity: 'Opacity: {value}%',
    position: 'Position',
    topLeft: 'Top left',
    topCenter: 'Top center',
    topRight: 'Top right',
    centerLeft: 'Center left',
    center: 'Center',
    centerRight: 'Center right',
    bottomLeft: 'Bottom left',
    bottomCenter: 'Bottom center',
    bottomRight: 'Bottom right',
    offsetX: 'X offset (px)',
    offsetY: 'Y offset (px)',
  },

  // ── 分辨率调整页 ──
  resize: {
    presetResolution: 'Preset Resolution',
    width: 'Width',
    height: 'Height',
    keepAspectRatio: 'Keep aspect ratio',
    targetFps: 'Target Frame Rate',
    keepOriginal: 'Keep original',
    scaleAlgorithm: 'Scale Algorithm',
    aspectMode: 'Aspect Mode',
    crop: 'Crop to fit',
    pad: 'Add letterbox',
    stretch: 'Stretch',
  },

  // ── GIF 制作页 ──
  gif: {
    generateGif: 'Generate GIF',
    outputWidth: 'Output width: {value}px',
    fps: 'Frame Rate',
    ditherAlgorithm: 'Dither Algorithm',
    infiniteLoop: 'Infinite loop',
    gifInfo: 'GIF duration: {duration}s | Frames: ~{frames}',
  },

  // ── 字幕页 ──
  subtitle: {
    mode: 'Processing Mode',
    embed: 'Embed',
    embedDesc: 'Soft subtitle',
    extract: 'Extract',
    extractDesc: 'Export file',
    burnIn: 'Burn-in',
    burnInDesc: 'Hard subtitle',
    subtitleFile: 'Subtitle file',
    clickSelectSubtitle: 'Click to select .srt / .ass / .vtt file...',
    outputFormat: 'Output Format',
    subtitleStyle: 'Subtitle Style',
    fontSize: 'Font size',
    fontColor: 'Color',
    outlineWidth: 'Outline width',
    marginBottom: 'Bottom margin',
    embedTip: 'Soft subtitles are embedded as a separate track. You need to enable subtitles in your video player (VLC / IINA recommended). macOS QuickTime has limited subtitle support.',
  },

  // ── 下载页 ──
  download: {
    urlPlaceholder: 'Paste video URL, supports YouTube, X, Instagram...',
    parsing: 'Parsing...',
    parse: 'Parse',
    selectFormat: 'Select Download Format',
    videoAudio: 'Video + Audio',
    audioOnly: 'Audio Only',
    cancelDownload: 'Cancel download',
    startDownload: 'Download',
  },

  // ── 预设名称和描述 ──
  presets: {
    title: 'Presets',
    socialMedia: 'Social Media',
    socialMediaDesc: 'H.264 MP4, ideal for social platforms',
    webOptimized: 'Web Optimized',
    webOptimizedDesc: 'Small MP4, ideal for web embedding',
    highQuality: 'High Quality',
    highQualityDesc: 'H.265 MKV, high quality low space',
    appleEcosystem: 'Apple Ecosystem',
    appleEcosystemDesc: 'MOV format, for Final Cut / iMovie',
    losslessCopy: 'Lossless Remux',
    losslessCopyDesc: 'No re-encoding, only change container',
    lightCompress: 'Light',
    lightCompressDesc: 'Keep high quality, ~30% reduction',
    moderateCompress: 'Moderate',
    moderateCompressDesc: 'Balance quality and size, ~50% reduction',
    heavyCompress: 'Heavy',
    heavyCompressDesc: 'Significant size reduction, quality loss',
  },

  // ── 编码器描述 ──
  codecs: {
    bestCompatibility: 'Best compatibility',
    highCompression: 'High compression',
    hwAccel: 'macOS HW accel',
    webmFormat: 'WebM format',
    nextGen: 'Next-gen codec',
    noCopy: 'Copy stream',
    copyDirect: 'Direct copy',
    universal: 'Universal',
    legacy: 'Legacy',
    highQuality: 'High quality',
    lossless: 'Lossless',
    uncompressed: 'Uncompressed',
    universalLossy: 'Universal lossy',
    efficientLossy: 'Efficient lossy',
    openSource: 'Open source',
  },

  // ── 格式描述 ──
  formats: {
    mostCompatible: 'Most compatible',
    multiTrack: 'Multi-track support',
    appleEco: 'Apple ecosystem',
    webOptimized: 'Web optimized',
    traditional: 'Traditional format',
    streaming: 'Streaming',
    liveStream: 'Live stream',
  },

  // ── 缩放算法 ──
  scaleAlgorithms: {
    lanczos: 'High quality (recommended)',
    bicubic: 'Balanced',
    bilinear: 'Fast',
    nearest: 'Pixel art',
  },

  // ── GIF 抖动算法 ──
  ditherAlgorithms: {
    floydSteinberg: 'Default, good quality',
    sierra: 'Faster',
    bayer: 'Regular pattern',
    noDither: 'No dither',
    blockStyle: 'Block style',
  },

  // ── 时间轴选择器 ──
  timeline: {
    inPoint: 'In',
    outPoint: 'Out',
    duration: 'Duration',
    segmentsSelected: '{count} segments selected',
    addSegment: '+ Add segment',
  },

  // ── ETA 格式化 ──
  eta: {
    almostDone: 'Almost done',
    seconds: '~{value}s',
    hoursMinutes: '~{h}h {m}m',
    minutesSeconds: '~{m}m {s}s',
    minutes: '~{m}m',
  },
};

/** 翻译字典类型 — 其他语言必须实现此结构 */
export type Translations = typeof en;

export default en;
