/// 预设参数数据模型
///
/// 定义所有 9 个功能模块的 command 参数结构体，
/// 每个结构体对应前端传来的操作参数，用于 ffmpeg 命令构建

use serde::{Deserialize, Serialize};

// ============================================================
// 格式转换参数
// ============================================================

/// 格式转换参数
///
/// 定义格式转换所需的全部参数，包括输入/输出路径、
/// 目标格式、编码器选择和质量控制等
#[derive(Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ConvertParams {
    /// 输入文件完整路径
    pub input_path: String,
    /// 输出文件完整路径
    pub output_path: String,
    /// 目标输出格式（如 "mp4", "mkv", "mov", "webm"）
    pub output_format: String,
    /// 视频编码器（如 "libx264", "libx265", "copy", "libvpx-vp9"）
    pub video_codec: String,
    /// 音频编码器（如 "aac", "copy", "libmp3lame", "libopus"）
    pub audio_codec: String,
    /// 视频质量（CRF 值，libx264 范围 0-51，默认 23）
    pub quality: Option<u32>,
    /// 编码速度预设（如 "medium", "slow", "fast"）
    pub preset: Option<String>,
    /// 是否启用 VideoToolbox 硬件加速
    pub hardware_accel: Option<bool>,
    /// 额外的 ffmpeg 命令行参数
    pub extra_args: Option<Vec<String>>,
}

// ============================================================
// 视频压缩参数
// ============================================================

/// 压缩模式枚举
///
/// 三种压缩策略：按目标大小、按压缩比例、按质量等级
#[derive(Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub enum CompressMode {
    /// 按目标文件大小压缩（自动反算码率）
    BySize,
    /// 按压缩比例压缩（如压缩到原大小的 50%）
    ByRatio,
    /// 按质量等级压缩（映射到 CRF 值）
    ByQuality,
}

/// 视频压缩参数
///
/// 支持三种压缩模式，根据 mode 字段选择使用不同的参数组合
#[derive(Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct CompressParams {
    /// 输入文件路径
    pub input_path: String,
    /// 输出文件路径
    pub output_path: String,
    /// 压缩模式选择
    pub mode: CompressMode,
    /// 目标文件大小（MB），仅 BySize 模式使用
    pub target_size_mb: Option<f64>,
    /// 压缩比例（0.0-1.0），仅 ByRatio 模式使用
    pub compress_ratio: Option<f64>,
    /// 质量等级（1-10，10 最高），仅 ByQuality 模式使用
    pub quality_level: Option<u32>,
    /// 编码速度预设
    pub preset: Option<String>,
    /// 是否启用硬件加速
    pub hardware_accel: Option<bool>,
}

// ============================================================
// 视频裁剪参数
// ============================================================

/// 时间片段
///
/// 定义一个裁剪片段的起止时间点（以秒为单位）
#[derive(Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct TimeSegment {
    /// 起始时间（秒）
    pub start: f64,
    /// 结束时间（秒）
    pub end: f64,
}

/// 视频裁剪参数
///
/// 支持单片段和多片段裁剪，可选精确切割（重编码）或快速切割（copy）
#[derive(Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct TrimParams {
    /// 输入文件路径
    pub input_path: String,
    /// 输出文件路径
    pub output_path: String,
    /// 裁剪片段列表（支持多个不连续片段）
    pub segments: Vec<TimeSegment>,
    /// 是否使用精确切割（true=重新编码确保帧级精度，false=copy 流直接复制）
    pub precise_cut: bool,
    /// 多片段时是否合并为一个输出文件
    pub merge_segments: bool,
}

// ============================================================
// 视频合并参数
// ============================================================

/// 转场效果配置
///
/// 定义两个视频片段之间的过渡效果
#[derive(Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct TransitionConfig {
    /// 转场类型（如 "fade", "wipeleft", "dissolve", "slideright"）
    pub transition_type: String,
    /// 转场持续时长（秒）
    pub duration: f64,
}

/// 视频合并参数
///
/// 将多个视频文件合并为一个，支持可选的转场效果和参数归一化
#[derive(Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct MergeParams {
    /// 待合并的输入文件路径列表（按照期望的播放顺序排列）
    pub input_paths: Vec<String>,
    /// 输出文件路径
    pub output_path: String,
    /// 转场效果配置（None 表示无转场，直接拼接）
    pub transition: Option<TransitionConfig>,
    /// 是否统一分辨率和帧率（不同源视频参数不一致时需要开启）
    pub normalize: bool,
    /// 目标分辨率（如 "1920x1080"），仅在 normalize=true 时使用
    pub target_resolution: Option<String>,
    /// 目标帧率，仅在 normalize=true 时使用
    pub target_fps: Option<f64>,
}

// ============================================================
// 音频处理参数
// ============================================================

/// 音频处理模式枚举
///
/// 四种音频处理策略
#[derive(Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub enum AudioMode {
    /// 从视频中提取音频（输出纯音频文件）
    Extract,
    /// 用新的音频替换视频原有音轨
    Replace,
    /// 删除音轨（静音视频）
    Mute,
    /// 调节音量/标准化/淡入淡出
    Adjust,
}

/// 音频处理参数
///
/// 根据 mode 字段选择不同的处理逻辑，
/// 不同模式使用不同的参数子集
#[derive(Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct AudioParams {
    /// 输入文件路径
    pub input_path: String,
    /// 输出文件路径
    pub output_path: String,
    /// 处理模式
    pub mode: AudioMode,
    /// 输出音频格式（如 "mp3", "aac", "wav", "flac"），仅 Extract 模式
    pub output_format: Option<String>,
    /// 替换用的音频文件路径，仅 Replace 模式
    pub replace_audio_path: Option<String>,
    /// 音量倍数（如 2.0 为加倍, 0.5 为减半），仅 Adjust 模式
    pub volume: Option<f64>,
    /// 音量调整（dB 值，如 3.0 为 +3dB），仅 Adjust 模式
    pub volume_db: Option<f64>,
    /// 是否启用 EBU R128 响度标准化，仅 Adjust 模式
    pub normalize: Option<bool>,
    /// 淡入时长（秒），仅 Adjust 模式
    pub fade_in: Option<f64>,
    /// 淡出时长（秒），仅 Adjust 模式
    pub fade_out: Option<f64>,
}

// ============================================================
// 水印参数
// ============================================================

/// 水印类型枚举
#[derive(Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub enum WatermarkType {
    /// 图片水印（PNG/JPG 等图片叠加到视频上）
    Image,
    /// 文字水印（使用 drawtext 滤镜绘制）
    Text,
}

/// 水印位置枚举（九宫格预设位置）
///
/// 对应 ffmpeg overlay 滤镜的坐标计算公式
#[derive(Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub enum WatermarkPosition {
    /// 左上角
    TopLeft,
    /// 顶部居中
    TopCenter,
    /// 右上角
    TopRight,
    /// 左侧居中
    CenterLeft,
    /// 正中央
    Center,
    /// 右侧居中
    CenterRight,
    /// 左下角
    BottomLeft,
    /// 底部居中
    BottomCenter,
    /// 右下角
    BottomRight,
}

/// 水印参数
///
/// 支持图片水印和文字水印两种类型，通过 watermark_type 区分。
/// 图片水印使用 overlay 滤镜，文字水印使用 drawtext 滤镜
#[derive(Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct WatermarkParams {
    /// 输入视频文件路径
    pub input_path: String,
    /// 输出文件路径
    pub output_path: String,
    /// 水印类型
    pub watermark_type: WatermarkType,
    // --- 图片水印参数 ---
    /// 水印图片路径（仅 Image 类型）
    pub image_path: Option<String>,
    /// 水印图片缩放比例（0.0-1.0，相对于视频宽度），仅 Image 类型
    pub image_scale: Option<f64>,
    /// 水印透明度（0.0-1.0，1.0 为完全不透明），仅 Image 类型
    pub opacity: Option<f64>,
    // --- 文字水印参数 ---
    /// 水印文字内容（仅 Text 类型）
    pub text: Option<String>,
    /// 字体文件路径（仅 Text 类型，macOS 默认使用 PingFang）
    pub font_path: Option<String>,
    /// 字体大小（像素，仅 Text 类型）
    pub font_size: Option<u32>,
    /// 字体颜色（如 "white", "0xFFFFFF"，仅 Text 类型）
    pub font_color: Option<String>,
    /// 文字描边宽度（像素，仅 Text 类型）
    pub border_width: Option<u32>,
    /// 文字描边颜色（仅 Text 类型）
    pub border_color: Option<String>,
    // --- 通用定位参数 ---
    /// 水印预设位置（九宫格）
    pub position: WatermarkPosition,
    /// X 方向额外偏移（像素，正值向右）
    pub offset_x: Option<i32>,
    /// Y 方向额外偏移（像素，正值向下）
    pub offset_y: Option<i32>,
}

// ============================================================
// 分辨率/帧率调整参数
// ============================================================

/// 分辨率/帧率调整参数
///
/// 调整视频的分辨率和/或帧率，支持多种缩放算法和宽高比处理模式
#[derive(Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ResizeParams {
    /// 输入文件路径
    pub input_path: String,
    /// 输出文件路径
    pub output_path: String,
    /// 目标宽度（像素），None 时保持原宽度或自动计算
    pub width: Option<u32>,
    /// 目标高度（像素），None 时保持原高度或自动计算
    pub height: Option<u32>,
    /// 是否保持原始宽高比
    pub keep_aspect_ratio: bool,
    /// 缩放算法（如 "lanczos", "bilinear", "bicubic"）
    pub scale_algorithm: Option<String>,
    /// 目标帧率（如 24.0, 30.0, 60.0），None 时保持原帧率
    pub fps: Option<f64>,
    /// 宽高比不匹配时的处理模式（"crop" 裁切 / "pad" 加黑边 / "stretch" 拉伸）
    pub aspect_mode: Option<String>,
}

// ============================================================
// GIF 制作参数
// ============================================================

/// GIF 制作参数
///
/// 使用 ffmpeg 高质量两步法（palettegen + paletteuse）生成 GIF，
/// 支持自定义帧率、尺寸、调色板和抖动算法
#[derive(Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct GifParams {
    /// 输入视频文件路径
    pub input_path: String,
    /// 输出 GIF 文件路径
    pub output_path: String,
    /// 截取起始时间（秒）
    pub start_time: f64,
    /// 截取持续时长（秒）
    pub duration: f64,
    /// 输出 GIF 宽度（像素，高度按比例自动计算）
    pub width: u32,
    /// 输出帧率（推荐 10-15fps）
    pub fps: u32,
    /// 循环次数（0=无限循环, -1=不循环, n=循环 n 次）
    pub loop_count: i32,
    /// 调色板最大颜色数（2-256，默认 256）
    pub max_colors: Option<u32>,
    /// 抖动算法（如 "bayer", "sierra2_4a"，影响色彩过渡质量）
    pub dither: Option<String>,
    /// 质量预设（"low"=小体积, "medium"=平衡, "high"=高质量）
    pub quality: Option<String>,
}

// ============================================================
// 字幕处理参数
// ============================================================

/// 字幕处理模式枚举
#[derive(Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub enum SubtitleMode {
    /// 添加软字幕（字幕作为独立流嵌入容器，播放器可切换显示）
    Embed,
    /// 提取字幕流为独立文件
    Extract,
    /// 烧录硬字幕（字幕直接渲染到视频画面中，不可关闭）
    BurnIn,
}

/// 字幕处理参数
///
/// 支持三种模式：嵌入、提取、烧录。
/// 烧录模式额外支持自定义字幕样式（字体、颜色、描边等）
#[derive(Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct SubtitleParams {
    /// 输入视频文件路径
    pub input_path: String,
    /// 输出文件路径
    pub output_path: String,
    /// 字幕处理模式
    pub mode: SubtitleMode,
    /// 外部字幕文件路径（Embed 和 BurnIn 模式使用）
    pub subtitle_path: Option<String>,
    /// 字幕流索引（Extract 模式中指定要提取的字幕流）
    pub subtitle_index: Option<u32>,
    /// 输出字幕格式（如 "srt", "ass", "vtt"，仅 Extract 模式）
    pub output_format: Option<String>,
    // --- 烧录样式参数（仅 BurnIn 模式） ---
    /// 字体名称（如 "PingFang SC", "Arial"）
    pub font_name: Option<String>,
    /// 字体大小
    pub font_size: Option<u32>,
    /// 主要颜色（ASS 格式 &HAABBGGRR，如 "&H00FFFFFF" 白色）
    pub primary_color: Option<String>,
    /// 描边宽度
    pub outline_width: Option<u32>,
    /// 垂直边距（距底部距离）
    pub margin_v: Option<u32>,
}

// ============================================================
// 视频下载参数
// ============================================================

/// 视频下载参数
///
/// 前端解析完成后用户选择格式，提交此参数执行下载
#[derive(Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct DownloadParams {
    /// 视频页面 URL（YouTube/X/Instagram 等）
    pub url: String,
    /// yt-dlp 格式 ID（如 "137+140"、"best"）
    pub format_id: String,
    /// 输出文件路径
    pub output_path: String,
}

/// yt-dlp 解析出的视频格式信息
///
/// 对应 yt-dlp --dump-json 返回的 formats 数组中的每一项
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct FormatInfo {
    /// yt-dlp 格式 ID
    pub format_id: String,
    /// 格式描述（如 "1080p"、"720p"）
    pub format_note: String,
    /// 文件扩展名（如 "mp4"、"webm"）
    pub ext: String,
    /// 视频宽度（像素），纯音频时为 0
    pub width: u32,
    /// 视频高度（像素），纯音频时为 0
    pub height: u32,
    /// 文件大小估计（字节），可能为 0（未知）
    pub filesize: u64,
    /// 是否包含视频流
    pub has_video: bool,
    /// 是否包含音频流
    pub has_audio: bool,
    /// 视频编码（如 "h264"、"vp9"）
    pub vcodec: String,
    /// 音频编码（如 "aac"、"opus"）
    pub acodec: String,
    /// 传输协议（如 "https"、"m3u8"、"m3u8_native"）
    /// 用于区分原生 HTTP 下载和 HLS 流，优先选择 https 格式
    pub protocol: String,
}

/// yt-dlp 解析出的视频基本信息
///
/// 对应 yt-dlp --dump-json 返回的顶层字段
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct VideoInfo {
    /// 视频标题
    pub title: String,
    /// 视频时长（秒）
    pub duration: f64,
    /// 缩略图 URL
    pub thumbnail: String,
    /// 上传者/频道名
    pub uploader: String,
    /// 视频来源平台（如 "youtube"、"twitter"、"instagram"）
    pub platform: String,
    /// 可用的下载格式列表
    pub formats: Vec<FormatInfo>,
}

// ============================================================
// 内置预设定义
// ============================================================

/// 预设方案信息
///
/// 描述一个内置预设的基本信息，用于前端展示预设选择列表
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct PresetInfo {
    /// 预设唯一标识（如 "social_media", "high_quality"）
    pub id: String,
    /// 预设显示名称（如 "社交媒体优化", "高质量归档"）
    pub name: String,
    /// 预设描述（简要说明适用场景）
    pub description: String,
    /// 所属功能模块（如 "convert", "compress", "gif"）
    pub category: String,
}
