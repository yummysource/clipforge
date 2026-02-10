/**
 * @file 中文翻译字典
 * @description 实现 Translations 类型（= typeof en），编译时自动检查翻译完整性。
 * 缺少任何键会导致 TypeScript 报错
 */
import type { Translations } from './en';

const zh: Translations = {
  // ── 通用词汇 ──
  common: {
    start: '开始处理',
    cancel: '取消',
    reset: '重置',
    processing: '处理中...',
    completed: '处理完成',
    failed: '处理失败',
    cancelled: '已取消',
    ready: '准备就绪',
    retry: '重试',
    continueProcessing: '继续处理',
    cancelProcessing: '取消处理',
    calculating: '计算中...',
    speed: '速度',
    delete: '删除',
    save: '保存',
    close: '关闭',
    confirm: '确认',
    on: '开启',
    off: '关闭',
  },

  // ── 应用首页 ──
  app: {
    title: 'ClipForge',
    subtitle: '专业的视频处理工具箱',
  },

  // ── 功能卡片名称和描述 ──
  features: {
    convert: { name: '格式转换', description: '转换视频到 MP4/MOV/AVI 等格式' },
    compress: { name: '视频压缩', description: '智能压缩，保持画质降低体积' },
    trim: { name: '裁剪剪切', description: '截取片段、去头去尾' },
    merge: { name: '合并拼接', description: '多个视频合为一个' },
    audio: { name: '音频处理', description: '提取音频、替换配音、调节音量' },
    watermark: { name: '加水印', description: '添加图片水印或文字水印' },
    resize: { name: '分辨率调整', description: '调整分辨率、帧率、比例' },
    gif: { name: 'GIF 制作', description: '视频片段转 GIF 动图' },
    subtitle: { name: '字幕处理', description: '嵌入字幕、提取字幕、调整时间轴' },
    download: { name: '视频下载', description: '从 YouTube/X/Instagram 下载视频' },
  },

  // ── 文件操作 ──
  file: {
    dragHere: '拖拽文件到此处',
    orClickSelect: '或点击选择文件',
    supported: '支持',
    addMore: '添加更多文件',
    filesAdded: '已添加 {count} 个文件',
    removeFile: '移除文件',
    selectFileToView: '选择文件以查看信息',
    selectFileToPreview: '选择文件以预览',
    fileInfo: '文件信息',
    fileName: '文件名',
    fileSize: '大小',
    duration: '时长',
    format: '格式',
    resolution: '分辨率',
    frameRate: '帧率',
    videoCodec: '视频编码',
    videoBitrate: '视频码率',
    audioCodec: '音频编码',
    sampleRate: '采样率',
    channels: '声道',
    totalBitrate: '总码率',
    mono: '单声道',
    channelsCount: '{count} 声道',
    cannotGetMediaInfo: '无法获取媒体信息',
  },

  // ── 进度面板 ──
  progress: {
    processing: '处理中...',
    completed: '处理完成',
    failed: '处理失败',
    cancelled: '已取消',
    ready: '准备就绪',
  },

  // ── 设置页 ──
  settings: {
    title: '设置',
    output: '输出设置',
    sameAsSource: '默认输出目录同源目录',
    sameAsSourceDesc: '开启后输出文件保存到源文件所在目录',
    outputDirectory: '输出目录',
    selectDirectory: '选择目录',
    outputSuffix: '输出文件后缀',
    outputSuffixDesc: '输出文件名添加后缀（当前: "{suffix}"）',
    overwriteExisting: '自动覆盖已有文件',
    overwriteExistingDesc: '输出路径存在同名文件时自动覆盖',
    performance: '性能设置',
    hardwareAccel: '硬件加速',
    hardwareAccelDesc: '使用 macOS VideoToolbox 加速编解码',
    maxConcurrent: '最大并发任务',
    maxConcurrentDesc: '同时处理的最大任务数量（当前: {count}）',
    notifications: '通知设置',
    notifyOnComplete: '完成通知',
    notifyOnCompleteDesc: '处理完成后发送系统通知',
    openOnComplete: '自动打开目录',
    openOnCompleteDesc: '处理完成后自动打开输出文件所在目录',
    language: '语言',
    languageDesc: '界面显示语言',
    resetDefaults: '恢复默认设置',
  },

  // ── 布局组件 ──
  layout: {
    home: '首页',
    dragToStart: '拖拽文件到卡片上可快速开始',
    tasksRunning: '{count} 个任务进行中',
    noActiveTasks: '无活跃任务',
    startProcessing: '开始处理',
  },

  // ── 格式转换页 ──
  convert: {
    outputFormat: '输出格式',
    videoCodec: '视频编码',
    qualityLevel: '画质级别 (CRF: {value})',
    highQuality: '极高画质',
    lowQuality: '极低画质',
    advancedToggle: '{action}高级选项',
    expand: '展开',
    collapse: '收起',
    audioCodec: '音频编码',
  },

  // ── 压缩页 ──
  compress: {
    mode: '压缩模式',
    bySize: '按目标大小',
    byRatio: '按压缩比',
    byQuality: '按画质等级',
    targetSize: '目标大小: {value} MB',
    ratio: '压缩比: {value}%',
    ratioMin: '10% (大幅压缩)',
    ratioMax: '90% (轻微压缩)',
    qualityLevel: '画质等级: {value}/10',
    qualityMin: '低画质 (小体积)',
    qualityMax: '高画质 (大体积)',
  },

  // ── 裁剪页 ──
  trim: {
    preciseCut: '精确切割',
    preciseCutDesc: '重新编码以实现帧级精确，速度较慢',
    mergeSegments: '合并片段',
    mergeSegmentsDesc: '将多个片段合并为一个文件',
  },

  // ── 合并页 ──
  merge: {
    dragToReorder: '拖拽排列视频顺序',
    moveUp: '上移',
    moveDown: '下移',
    totalDuration: '总时长: {value}',
    transition: '转场效果',
    transitionNone: '无转场',
    transitionFade: '淡入淡出',
    transitionWipe: '左划过渡',
    transitionDissolve: '溶解过渡',
    transitionDuration: '转场时长: {value}s',
    normalize: '统一分辨率/帧率',
    normalizeDesc: '自动将所有视频调整为一致的分辨率和帧率',
    mergeFiles: '合并 {count} 个文件',
  },

  // ── 音频页 ──
  audio: {
    mode: '处理模式',
    extract: '提取音频',
    extractDesc: '导出音轨',
    replace: '替换配音',
    replaceDesc: '替换音轨',
    mute: '静音消音',
    muteDesc: '移除音频',
    adjust: '调节音量',
    adjustDesc: '增减音量',
    outputFormat: '输出格式',
    replaceFile: '替换音频文件',
    clickSelectAudio: '点击选择音频文件...',
    volume: '音量调节: {value} dB',
    volumeMin: '-20 dB (减小)',
    volumeZero: '0 dB',
    volumeMax: '+20 dB (增大)',
  },

  // ── 水印页 ──
  watermark: {
    imageWatermark: '图片水印',
    textWatermark: '文字水印',
    watermarkImage: '水印图片',
    clickSelectImage: '点击选择图片...',
    imageSize: '大小: {value}%',
    watermarkText: '水印文字',
    textPlaceholder: '输入水印文字...',
    fontSize: '字号',
    fontColor: '颜色',
    opacity: '透明度: {value}%',
    position: '位置',
    topLeft: '左上',
    topCenter: '上中',
    topRight: '右上',
    centerLeft: '左中',
    center: '居中',
    centerRight: '右中',
    bottomLeft: '左下',
    bottomCenter: '下中',
    bottomRight: '右下',
    offsetX: 'X 偏移 (px)',
    offsetY: 'Y 偏移 (px)',
  },

  // ── 分辨率调整页 ──
  resize: {
    presetResolution: '预设分辨率',
    width: '宽度',
    height: '高度',
    keepAspectRatio: '保持宽高比',
    targetFps: '目标帧率',
    keepOriginal: '保持原始',
    scaleAlgorithm: '缩放算法',
    aspectMode: '画面适应',
    crop: '裁剪适应',
    pad: '加黑边',
    stretch: '拉伸',
  },

  // ── GIF 制作页 ──
  gif: {
    generateGif: '生成 GIF',
    outputWidth: '输出宽度: {value}px',
    fps: '帧率',
    ditherAlgorithm: '抖动算法',
    infiniteLoop: '无限循环',
    gifInfo: 'GIF 时长: {duration}s | 帧数: ~{frames}',
  },

  // ── 字幕页 ──
  subtitle: {
    mode: '处理模式',
    embed: '嵌入字幕',
    embedDesc: '软字幕',
    extract: '提取字幕',
    extractDesc: '导出文件',
    burnIn: '烧录字幕',
    burnInDesc: '硬字幕',
    subtitleFile: '字幕文件',
    clickSelectSubtitle: '点击选择 .srt / .ass / .vtt 文件...',
    outputFormat: '输出格式',
    subtitleStyle: '字幕样式',
    fontSize: '字号',
    fontColor: '颜色',
    outlineWidth: '描边宽度',
    marginBottom: '底部边距',
    embedTip: '软字幕以独立轨道嵌入，需要在播放器中手动开启字幕显示（推荐使用 VLC / IINA 播放器）。macOS 自带 QuickTime 对字幕支持有限。',
  },

  // ── 下载页 ──
  download: {
    urlPlaceholder: '粘贴视频链接，支持 YouTube、X、Instagram...',
    parsing: '解析中...',
    parse: '解析',
    selectFormat: '选择下载格式',
    videoAudio: '视频+音频',
    audioOnly: '仅音频',
    cancelDownload: '取消下载',
    startDownload: '开始下载',
  },

  // ── 预设名称和描述 ──
  presets: {
    title: '预设方案',
    socialMedia: '社交媒体',
    socialMediaDesc: 'H.264 MP4，适合微信/抖音/B站',
    webOptimized: '网页优化',
    webOptimizedDesc: '小体积 MP4，适合网页嵌入',
    highQuality: '高质量存档',
    highQualityDesc: 'H.265 MKV，高质量低空间',
    appleEcosystem: 'Apple 生态',
    appleEcosystemDesc: 'MOV 格式，适合 Final Cut / iMovie',
    losslessCopy: '无损转封装',
    losslessCopyDesc: '不重新编码，仅改变容器格式',
    lightCompress: '轻度压缩',
    lightCompressDesc: '保持高画质，体积减少约 30%',
    moderateCompress: '中度压缩',
    moderateCompressDesc: '画质与体积平衡，减少约 50%',
    heavyCompress: '重度压缩',
    heavyCompressDesc: '大幅减小体积，画质有损',
  },

  // ── 编码器描述 ──
  codecs: {
    bestCompatibility: '兼容性最佳',
    highCompression: '高压缩率',
    hwAccel: 'macOS 硬件加速',
    webmFormat: 'WebM 格式',
    nextGen: '新一代编码',
    noCopy: '不转码',
    copyDirect: '直接复制',
    universal: '通用',
    legacy: '传统',
    highQuality: '高质量',
    lossless: '无损',
    uncompressed: '无压缩',
    universalLossy: '通用有损',
    efficientLossy: '高效有损',
    openSource: '开源格式',
  },

  // ── 格式描述 ──
  formats: {
    mostCompatible: '通用性最强',
    multiTrack: '支持多轨道',
    appleEco: 'Apple 生态',
    webOptimized: '网页优化',
    traditional: '传统格式',
    streaming: '流媒体',
    liveStream: '直播流',
  },

  // ── 缩放算法 ──
  scaleAlgorithms: {
    lanczos: '高质量（推荐）',
    bicubic: '平衡',
    bilinear: '快速',
    nearest: '像素风格',
  },

  // ── GIF 抖动算法 ──
  ditherAlgorithms: {
    floydSteinberg: '默认，效果好',
    sierra: '更快',
    bayer: '规则图案',
    noDither: '无抖动',
    blockStyle: '色块风格',
  },

  // ── 时间轴选择器 ──
  timeline: {
    inPoint: '入点',
    outPoint: '出点',
    duration: '时长',
    segmentsSelected: '已选 {count} 个片段',
    addSegment: '+ 添加片段',
  },

  // ── ETA 格式化 ──
  eta: {
    almostDone: '即将完成',
    seconds: '约 {value} 秒',
    hoursMinutes: '约 {h} 小时 {m} 分',
    minutesSeconds: '约 {m} 分 {s} 秒',
    minutes: '约 {m} 分',
  },
};

export default zh;
