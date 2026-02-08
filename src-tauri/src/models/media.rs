/// 媒体信息数据模型
///
/// 定义从 ffprobe 解析的视频/音频/字幕流信息结构体，
/// 用于前端展示文件详情和为 ffmpeg 命令构建提供参数依据

use serde::{Deserialize, Serialize};

/// 媒体文件完整信息（从 ffprobe JSON 输出解析）
///
/// 包含文件基础属性和所有流（视频、音频、字幕）的详细信息，
/// 前端用于展示文件详情，后端用于构建 ffmpeg 命令时参考
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct MediaInfo {
    /// 文件完整路径
    pub file_path: String,
    /// 文件名（不含路径）
    pub file_name: String,
    /// 文件大小（字节）
    pub file_size: u64,
    /// 容器格式名称（如 "mov,mp4,m4a,3gp,3g2,mj2"）
    pub format_name: String,
    /// 总时长（秒）
    pub duration: f64,
    /// 总码率（bps）
    pub bitrate: u64,
    /// 视频流信息列表
    pub video_streams: Vec<VideoStream>,
    /// 音频流信息列表
    pub audio_streams: Vec<AudioStream>,
    /// 字幕流信息列表
    pub subtitle_streams: Vec<SubtitleStream>,
}

/// 视频流信息
///
/// 对应 ffprobe 输出中 codec_type == "video" 的流，
/// 包含分辨率、帧率、编码器等关键视频属性
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct VideoStream {
    /// 流在容器中的索引位置
    pub index: u32,
    /// 编解码器名称（如 "h264", "hevc", "vp9"）
    pub codec_name: String,
    /// 视频宽度（像素）
    pub width: u32,
    /// 视频高度（像素）
    pub height: u32,
    /// 帧率（浮点数，从 r_frame_rate 分数计算得出）
    pub frame_rate: f64,
    /// 码率（bps），部分流可能不包含此信息
    pub bitrate: Option<u64>,
    /// 像素格式（如 "yuv420p", "yuv444p"）
    pub pix_fmt: String,
    /// 总帧数（部分容器格式可能不提供）
    pub nb_frames: Option<u64>,
    /// 流时长（秒，可能与容器时长略有差异）
    pub duration: Option<f64>,
}

/// 音频流信息
///
/// 对应 ffprobe 输出中 codec_type == "audio" 的流，
/// 包含采样率、声道数等音频属性
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct AudioStream {
    /// 流在容器中的索引位置
    pub index: u32,
    /// 编解码器名称（如 "aac", "mp3", "flac"）
    pub codec_name: String,
    /// 采样率（Hz，如 44100, 48000）
    pub sample_rate: u32,
    /// 声道数（1=单声道, 2=立体声, 6=5.1 环绕声）
    pub channels: u32,
    /// 码率（bps），部分流可能不包含此信息
    pub bitrate: Option<u64>,
}

/// 字幕流信息
///
/// 对应 ffprobe 输出中 codec_type == "subtitle" 的流，
/// 包含字幕格式和语言标签
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct SubtitleStream {
    /// 流在容器中的索引位置
    pub index: u32,
    /// 编解码器名称（如 "srt", "ass", "mov_text"）
    pub codec_name: String,
    /// 语言标签（如 "chi", "eng"），部分字幕流可能不含语言信息
    pub language: Option<String>,
}

/// ffprobe 原始 JSON 输出的根结构
///
/// 仅用于内部反序列化，不暴露给前端。
/// 从这个结构解析出最终的 MediaInfo
#[derive(Deserialize, Debug)]
pub struct FfprobeOutput {
    /// 流列表（包含视频、音频、字幕等所有类型）
    pub streams: Option<Vec<FfprobeStream>>,
    /// 容器格式信息
    pub format: Option<FfprobeFormat>,
}

/// ffprobe 流的原始 JSON 结构
///
/// 包含所有可能的字段，通过 codec_type 区分流类型
#[derive(Deserialize, Debug)]
pub struct FfprobeStream {
    /// 流索引
    pub index: Option<u32>,
    /// 编解码器名称
    pub codec_name: Option<String>,
    /// 流类型标识（"video" / "audio" / "subtitle"）
    pub codec_type: Option<String>,
    /// 视频宽度
    pub width: Option<u32>,
    /// 视频高度
    pub height: Option<u32>,
    /// 帧率（分数形式，如 "30/1", "30000/1001"）
    pub r_frame_rate: Option<String>,
    /// 码率（字符串形式的 bps 值）
    pub bit_rate: Option<String>,
    /// 像素格式
    pub pix_fmt: Option<String>,
    /// 总帧数（字符串形式）
    pub nb_frames: Option<String>,
    /// 流时长（字符串形式的秒数）
    pub duration: Option<String>,
    /// 采样率（字符串形式的 Hz 值）
    pub sample_rate: Option<String>,
    /// 声道数
    pub channels: Option<u32>,
    /// 语言标签（存储在 tags 对象中）
    pub tags: Option<FfprobeStreamTags>,
}

/// ffprobe 流标签
///
/// 包含流的元数据信息，如语言、标题等
#[derive(Deserialize, Debug)]
pub struct FfprobeStreamTags {
    /// 语言标签
    pub language: Option<String>,
}

/// ffprobe 容器格式信息
///
/// 包含文件级别的格式属性
#[derive(Deserialize, Debug)]
pub struct FfprobeFormat {
    /// 文件名
    pub filename: Option<String>,
    /// 格式名称（如 "mov,mp4,m4a,3gp,3g2,mj2"）
    pub format_name: Option<String>,
    /// 总时长（字符串形式的秒数）
    pub duration: Option<String>,
    /// 文件大小（字符串形式的字节数）
    pub size: Option<String>,
    /// 总码率（字符串形式的 bps 值）
    pub bit_rate: Option<String>,
}

impl FfprobeOutput {
    /// 将 ffprobe 原始输出转换为应用内部使用的 MediaInfo
    ///
    /// 解析所有流信息，按类型分类为视频/音频/字幕流，
    /// 并提取容器级别的格式属性
    ///
    /// # 参数
    /// - `file_path` - 媒体文件的完整路径（用于填充 MediaInfo 的路径字段）
    pub fn to_media_info(&self, file_path: &str) -> MediaInfo {
        // 从文件路径中提取文件名
        let file_name = std::path::Path::new(file_path)
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_default();

        // 解析容器格式信息
        let format = self.format.as_ref();
        let format_name = format
            .and_then(|f| f.format_name.clone())
            .unwrap_or_default();
        let duration = format
            .and_then(|f| f.duration.as_ref())
            .and_then(|d| d.parse::<f64>().ok())
            .unwrap_or(0.0);
        let file_size = format
            .and_then(|f| f.size.as_ref())
            .and_then(|s| s.parse::<u64>().ok())
            .unwrap_or(0);
        let bitrate = format
            .and_then(|f| f.bit_rate.as_ref())
            .and_then(|b| b.parse::<u64>().ok())
            .unwrap_or(0);

        // 按 codec_type 将流分类为视频/音频/字幕
        let mut video_streams = Vec::new();
        let mut audio_streams = Vec::new();
        let mut subtitle_streams = Vec::new();

        if let Some(streams) = &self.streams {
            for stream in streams {
                let codec_type = stream.codec_type.as_deref().unwrap_or("");
                match codec_type {
                    "video" => {
                        video_streams.push(VideoStream {
                            index: stream.index.unwrap_or(0),
                            codec_name: stream.codec_name.clone().unwrap_or_default(),
                            width: stream.width.unwrap_or(0),
                            height: stream.height.unwrap_or(0),
                            frame_rate: parse_frame_rate(
                                stream.r_frame_rate.as_deref().unwrap_or("0/1"),
                            ),
                            bitrate: stream.bit_rate.as_ref().and_then(|b| b.parse().ok()),
                            pix_fmt: stream.pix_fmt.clone().unwrap_or_default(),
                            nb_frames: stream
                                .nb_frames
                                .as_ref()
                                .and_then(|n| n.parse().ok()),
                            duration: stream.duration.as_ref().and_then(|d| d.parse().ok()),
                        });
                    }
                    "audio" => {
                        audio_streams.push(AudioStream {
                            index: stream.index.unwrap_or(0),
                            codec_name: stream.codec_name.clone().unwrap_or_default(),
                            sample_rate: stream
                                .sample_rate
                                .as_ref()
                                .and_then(|s| s.parse().ok())
                                .unwrap_or(0),
                            channels: stream.channels.unwrap_or(0),
                            bitrate: stream.bit_rate.as_ref().and_then(|b| b.parse().ok()),
                        });
                    }
                    "subtitle" => {
                        subtitle_streams.push(SubtitleStream {
                            index: stream.index.unwrap_or(0),
                            codec_name: stream.codec_name.clone().unwrap_or_default(),
                            language: stream.tags.as_ref().and_then(|t| t.language.clone()),
                        });
                    }
                    _ => {}
                }
            }
        }

        MediaInfo {
            file_path: file_path.to_string(),
            file_name,
            file_size,
            format_name,
            duration,
            bitrate,
            video_streams,
            audio_streams,
            subtitle_streams,
        }
    }
}

/// 解析 ffprobe 帧率分数字符串为浮点数
///
/// ffprobe 输出帧率为分数形式（如 "30/1", "30000/1001"），
/// 此函数将其转换为浮点数
///
/// # 参数
/// - `rate_str` - 帧率分数字符串
///
/// # 返回
/// 帧率浮点数值，解析失败返回 0.0
fn parse_frame_rate(rate_str: &str) -> f64 {
    let parts: Vec<&str> = rate_str.split('/').collect();
    if parts.len() == 2 {
        let num = parts[0].parse::<f64>().unwrap_or(0.0);
        let den = parts[1].parse::<f64>().unwrap_or(1.0);
        if den > 0.0 {
            return num / den;
        }
    }
    // 如果不是分数形式，尝试直接解析为浮点数
    rate_str.parse::<f64>().unwrap_or(0.0)
}
