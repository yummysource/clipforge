/// ffmpeg 命令构建器
///
/// 使用 Builder 模式构建 ffmpeg 命令行参数数组。
/// 每个功能模块提供专用的构建函数，将前端传来的参数结构体
/// 转换为 ffmpeg 可执行的命令行参数
///
/// 所有构建函数返回 `Vec<String>` 参数数组，交由 process.rs 执行

use crate::models::preset::*;

// ============================================================
// 通用 FfmpegCommand 构建器
// ============================================================

/// ffmpeg 命令构建器
///
/// 提供链式 API 逐步组装 ffmpeg 命令行参数，
/// 最终通过 build() 方法生成完整的参数数组。
///
/// ffmpeg 要求参数按特定顺序排列：
/// 全局选项 → 输入选项 → -i 输入文件 → 输出选项 → 滤镜 → 输出路径
pub struct FfmpegCommand {
    /// 输入前的全局参数（如 -y, -hide_banner, -progress, -ss 等）
    pre_args: Vec<String>,
    /// 输入文件列表（按添加顺序）
    inputs: Vec<String>,
    /// 输入后的输出参数（如 -c:v, -crf, -preset 等）
    post_args: Vec<String>,
    /// 视频滤镜链（-vf 参数）
    video_filters: Vec<String>,
    /// 音频滤镜链（-af 参数）
    audio_filters: Vec<String>,
    /// 复杂滤镜图（-filter_complex 参数）
    complex_filter: Option<String>,
    /// 输出文件路径
    output: String,
}

impl FfmpegCommand {
    /// 创建新的命令构建器
    ///
    /// 默认添加 -y（覆盖输出）和 -hide_banner（隐藏版本信息）
    pub fn new() -> Self {
        Self {
            pre_args: vec!["-y".to_string(), "-hide_banner".to_string()],
            inputs: Vec::new(),
            post_args: Vec::new(),
            video_filters: Vec::new(),
            audio_filters: Vec::new(),
            complex_filter: None,
            output: String::new(),
        }
    }

    /// 添加输入文件
    pub fn input(mut self, path: &str) -> Self {
        self.inputs.push(path.to_string());
        self
    }

    /// 添加输入前的全局参数（如 -ss 放在 -i 前面用于快速定位）
    pub fn pre_arg(mut self, arg: &str) -> Self {
        self.pre_args.push(arg.to_string());
        self
    }

    /// 添加输入前的全局 key-value 参数（如 -ss, -t 放在 -i 前面时）
    pub fn pre_args_pair(mut self, key: &str, value: &str) -> Self {
        self.pre_args.push(key.to_string());
        self.pre_args.push(value.to_string());
        self
    }

    /// 添加输出参数（单个参数，放在 -i 之后）
    pub fn arg(mut self, arg: &str) -> Self {
        self.post_args.push(arg.to_string());
        self
    }

    /// 添加一对输出 key-value 参数（如 "-c:v", "libx264"，放在 -i 之后）
    pub fn args_pair(mut self, key: &str, value: &str) -> Self {
        self.post_args.push(key.to_string());
        self.post_args.push(value.to_string());
        self
    }

    /// 设置视频编码器
    pub fn video_codec(self, codec: &str) -> Self {
        self.args_pair("-c:v", codec)
    }

    /// 设置音频编码器
    pub fn audio_codec(self, codec: &str) -> Self {
        self.args_pair("-c:a", codec)
    }

    /// 设置 CRF 质量值
    pub fn crf(self, value: u32) -> Self {
        self.args_pair("-crf", &value.to_string())
    }

    /// 设置编码速度预设（如 "medium", "slow"）
    pub fn preset(self, preset: &str) -> Self {
        self.args_pair("-preset", preset)
    }

    /// 设置音频码率（如 "128k"）
    pub fn audio_bitrate(self, bitrate: &str) -> Self {
        self.args_pair("-b:a", bitrate)
    }

    /// 设置视频码率（如 "5M"）
    pub fn video_bitrate(self, bitrate: &str) -> Self {
        self.args_pair("-b:v", bitrate)
    }

    /// 添加视频滤镜（-vf 链的一个环节）
    pub fn video_filter(mut self, filter: &str) -> Self {
        self.video_filters.push(filter.to_string());
        self
    }

    /// 添加音频滤镜（-af 链的一个环节）
    pub fn audio_filter(mut self, filter: &str) -> Self {
        self.audio_filters.push(filter.to_string());
        self
    }

    /// 设置复杂滤镜图（-filter_complex 参数）
    pub fn complex_filter(mut self, filter: &str) -> Self {
        self.complex_filter = Some(filter.to_string());
        self
    }

    /// 设置输出路径
    pub fn output(mut self, path: &str) -> Self {
        self.output = path.to_string();
        self
    }

    /// 添加进度监控参数（-progress pipe:1 -nostats）
    ///
    /// 这些是全局参数，放在 -i 之前
    pub fn with_progress(self) -> Self {
        self.pre_args_pair("-progress", "pipe:1").pre_arg("-nostats")
    }

    /// 添加 MP4 web 优化参数（-movflags +faststart）
    pub fn faststart(self) -> Self {
        self.args_pair("-movflags", "+faststart")
    }

    /// 构建最终的命令行参数数组
    ///
    /// 按照 ffmpeg 要求的顺序组装参数：
    /// 全局/输入前参数 → -i 输入文件 → 输出参数 → 滤镜 → 输出路径
    pub fn build(self) -> Vec<String> {
        let mut result: Vec<String> = Vec::new();

        // 1. 全局/输入前参数（-y, -hide_banner, -progress, -ss 等）
        result.extend(self.pre_args);

        // 2. 输入文件（-i 参数）
        for input in &self.inputs {
            result.push("-i".to_string());
            result.push(input.clone());
        }

        // 3. 输出参数（-c:v, -crf, -preset 等，必须在 -i 之后）
        result.extend(self.post_args);

        // 4. 滤镜（复杂滤镜与简单滤镜互斥，优先使用 -filter_complex）
        if let Some(cf) = &self.complex_filter {
            result.push("-filter_complex".to_string());
            result.push(cf.clone());
        } else {
            // 简单视频滤镜链
            if !self.video_filters.is_empty() {
                result.push("-vf".to_string());
                result.push(self.video_filters.join(","));
            }
            // 简单音频滤镜链
            if !self.audio_filters.is_empty() {
                result.push("-af".to_string());
                result.push(self.audio_filters.join(","));
            }
        }

        // 5. 输出路径
        if !self.output.is_empty() {
            result.push(self.output);
        }

        result
    }
}

// ============================================================
// 功能专用命令构建函数
// ============================================================

/// 构建格式转换命令
///
/// 根据目标格式和编码器选择构建 ffmpeg 转码命令。
/// 如果视频编码器为 "copy"，则直接封装不重新编码
///
/// # 参数
/// - `params` - 格式转换参数
///
/// # 返回
/// ffmpeg 命令行参数数组
pub fn build_convert_command(params: &ConvertParams) -> Vec<String> {
    let mut cmd = FfmpegCommand::new()
        .with_progress()
        .input(&params.input_path);

    // 设置视频编码器
    if params.hardware_accel.unwrap_or(false) && params.video_codec != "copy" {
        // VideoToolbox 硬件加速编码
        cmd = cmd.video_codec("h264_videotoolbox")
            .video_bitrate("5M");
    } else {
        cmd = cmd.video_codec(&params.video_codec);
        // 软件编码时设置 CRF 和 preset（copy 模式不需要）
        if params.video_codec != "copy" {
            if let Some(quality) = params.quality {
                cmd = cmd.crf(quality);
            }
            if let Some(ref preset) = params.preset {
                cmd = cmd.preset(preset);
            }
        }
    }

    // 设置音频编码器
    cmd = cmd.audio_codec(&params.audio_codec);
    if params.audio_codec != "copy" {
        cmd = cmd.audio_bitrate("128k");
    }

    // MP4/MOV 格式添加 faststart 优化
    let ext = params.output_format.to_lowercase();
    if ext == "mp4" || ext == "mov" {
        cmd = cmd.faststart();
    }

    // HEVC 的 Apple 兼容性标签
    if params.video_codec == "libx265" {
        cmd = cmd.args_pair("-tag:v", "hvc1");
    }

    // WebM 格式需要特殊处理
    if ext == "webm" && params.video_codec == "libvpx-vp9" {
        cmd = cmd.args_pair("-b:v", "0");
    }

    // 添加额外参数
    if let Some(ref extra) = params.extra_args {
        for arg in extra {
            cmd = cmd.arg(arg);
        }
    }

    cmd = cmd.output(&params.output_path);
    cmd.build()
}

/// 构建视频压缩命令
///
/// 支持三种压缩模式：
/// - BySize: 根据目标文件大小反算视频码率
/// - ByRatio: 根据压缩比例计算 CRF 值
/// - ByQuality: 直接映射质量等级到 CRF 值
///
/// # 参数
/// - `params` - 视频压缩参数
/// - `input_duration` - 输入视频时长（秒），用于 BySize 模式的码率计算
/// - `input_bitrate` - 输入视频总码率（bps），用于 ByRatio 模式
pub fn build_compress_command(
    params: &CompressParams,
    input_duration: f64,
    input_bitrate: u64,
) -> Vec<String> {
    let mut cmd = FfmpegCommand::new()
        .with_progress()
        .input(&params.input_path);

    let preset = params.preset.as_deref().unwrap_or("medium");

    if params.hardware_accel.unwrap_or(false) {
        // VideoToolbox 硬件加速模式：使用码率控制
        cmd = cmd.video_codec("h264_videotoolbox");
        match params.mode {
            CompressMode::BySize => {
                // 根据目标大小反算码率: target_bitrate = target_size_bytes * 8 / duration
                let target_mb = params.target_size_mb.unwrap_or(50.0);
                let audio_kbps = 128.0;
                let video_kbps = (target_mb * 1024.0 * 8.0 / input_duration) - audio_kbps;
                let video_kbps = video_kbps.max(100.0) as u64;
                cmd = cmd.video_bitrate(&format!("{}k", video_kbps));
            }
            CompressMode::ByRatio => {
                // 按比例压缩：目标码率 = 原码率 * 比例
                let ratio = params.compress_ratio.unwrap_or(0.5);
                let target_bps = (input_bitrate as f64 * ratio) as u64;
                let target_kbps = target_bps / 1000;
                cmd = cmd.video_bitrate(&format!("{}k", target_kbps.max(100)));
            }
            CompressMode::ByQuality => {
                // VideoToolbox 的质量参数 -q:v (0-100, 数值越高质量越好)
                let level = params.quality_level.unwrap_or(5);
                let vt_quality = quality_level_to_vt_q(level);
                cmd = cmd.args_pair("-q:v", &vt_quality.to_string());
            }
        }
    } else {
        // 软件编码模式：使用 CRF 控制质量
        cmd = cmd.video_codec("libx264").preset(preset);
        match params.mode {
            CompressMode::BySize => {
                // 按目标大小：计算码率后使用 -b:v + -maxrate + -bufsize
                let target_mb = params.target_size_mb.unwrap_or(50.0);
                let audio_kbps = 128.0;
                let video_kbps = (target_mb * 1024.0 * 8.0 / input_duration) - audio_kbps;
                let video_kbps = video_kbps.max(100.0) as u64;
                cmd = cmd
                    .video_bitrate(&format!("{}k", video_kbps))
                    .args_pair("-maxrate", &format!("{}k", video_kbps * 15 / 10))
                    .args_pair("-bufsize", &format!("{}k", video_kbps * 2));
            }
            CompressMode::ByRatio => {
                // 按比例压缩：映射到 CRF 值
                let ratio = params.compress_ratio.unwrap_or(0.5);
                let crf = ratio_to_crf(ratio);
                cmd = cmd.crf(crf);
            }
            CompressMode::ByQuality => {
                // 按质量等级：直接映射到 CRF 值
                let level = params.quality_level.unwrap_or(5);
                let crf = quality_level_to_crf(level);
                cmd = cmd.crf(crf);
            }
        }
    }

    cmd = cmd.audio_codec("aac").audio_bitrate("128k").faststart();
    cmd = cmd.output(&params.output_path);
    cmd.build()
}

/// 构建单个片段的裁剪命令
///
/// 根据 precise_cut 参数选择快速切割（copy）或精确切割（重编码）。
/// 此函数处理单个时间片段的裁剪，多片段场景由 trim.rs 循环调用
///
/// # 参数
/// - `input_path` - 输入视频文件路径
/// - `output_path` - 输出文件路径
/// - `start` - 片段起始时间（秒）
/// - `end` - 片段结束时间（秒）
/// - `precise_cut` - 是否精确切割（重编码）
/// - `with_progress_flag` - 是否添加进度监控参数（单片段用 true，多片段中间步骤用 false）
///
/// # 返回
/// ffmpeg 命令行参数数组
pub fn build_trim_segment_command(
    input_path: &str,
    output_path: &str,
    start: f64,
    end: f64,
    precise_cut: bool,
    with_progress_flag: bool,
) -> Vec<String> {
    let duration = end - start;
    let start_ts = crate::utils::time::seconds_to_timestamp(start);
    let duration_ts = crate::utils::time::seconds_to_timestamp(duration);

    let mut cmd = FfmpegCommand::new();
    if with_progress_flag {
        cmd = cmd.with_progress();
    }

    if precise_cut {
        // 精确切割：-ss 放在 -i 之前（快速定位），然后重新编码确保帧级精度
        // 参数顺序：-ss <start> -i <input> -t <duration> -c:v libx264 ...
        cmd = cmd
            .pre_args_pair("-ss", &start_ts)
            .input(input_path)
            .args_pair("-t", &duration_ts)
            .video_codec("libx264")
            .crf(18)
            .preset("medium")
            .audio_codec("aac")
            .audio_bitrate("128k")
            .arg("-avoid_negative_ts")
            .arg("make_zero")
            .faststart()
            .output(output_path);
    } else {
        // 快速切割：-ss 放在 -i 之前（快速定位），直接复制流
        cmd = cmd
            .pre_args_pair("-ss", &start_ts)
            .input(input_path)
            .args_pair("-t", &duration_ts)
            .video_codec("copy")
            .audio_codec("copy")
            .arg("-avoid_negative_ts")
            .arg("make_zero")
            .output(output_path);
    }

    cmd.build()
}

/// 构建视频裁剪命令（兼容单片段调用）
///
/// 对 build_trim_segment_command 的封装，取 params 中第一个片段构建命令。
/// 多片段场景请直接使用 build_trim_segment_command
///
/// # 参数
/// - `params` - 裁剪参数
///
/// # 返回
/// ffmpeg 命令行参数数组
pub fn build_trim_command(params: &TrimParams) -> Vec<String> {
    let segment = &params.segments[0];
    build_trim_segment_command(
        &params.input_path,
        &params.output_path,
        segment.start,
        segment.end,
        params.precise_cut,
        true, // 单片段需要进度监控
    )
}

/// 构建视频合并命令
///
/// 根据参数自动选择合并策略：
/// - 无转场 + 不归一化：使用 concat demuxer（-f concat，无需重编码）
/// - 有转场或需要归一化：使用 concat filter（-filter_complex，重新编码）
///
/// # 参数
/// - `params` - 合并参数
/// - `concat_file_path` - concat demuxer 使用的临时文件列表路径
///
/// # 返回
/// ffmpeg 命令行参数数组
pub fn build_merge_command(params: &MergeParams, concat_file_path: &str) -> Vec<String> {
    let has_transition = params.transition.is_some();
    let needs_filter = has_transition || params.normalize;

    if !needs_filter {
        // 简单模式：使用 concat demuxer，无需重编码
        // -f concat 和 -safe 0 必须在 -i 之前，指定输入格式
        FfmpegCommand::new()
            .with_progress()
            .pre_args_pair("-f", "concat")
            .pre_args_pair("-safe", "0")
            .input(concat_file_path)
            .video_codec("copy")
            .audio_codec("copy")
            .output(&params.output_path)
            .build()
    } else {
        // 复杂模式：使用 filter_complex 进行归一化或添加转场
        let n = params.input_paths.len();

        // 解析目标分辨率
        let (target_w, target_h) = params
            .target_resolution
            .as_ref()
            .and_then(|r| {
                let parts: Vec<&str> = r.split('x').collect();
                if parts.len() == 2 {
                    Some((
                        parts[0].parse::<u32>().unwrap_or(1920),
                        parts[1].parse::<u32>().unwrap_or(1080),
                    ))
                } else {
                    None
                }
            })
            .unwrap_or((1920, 1080));
        let target_fps = params.target_fps.unwrap_or(30.0);

        // 构建滤镜图
        let mut filter_parts: Vec<String> = Vec::new();
        let mut concat_inputs = String::new();

        for i in 0..n {
            // 统一每个输入流的分辨率、宽高比和帧率
            filter_parts.push(format!(
                "[{i}:v]scale={w}:{h}:force_original_aspect_ratio=decrease,\
                 pad={w}:{h}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps={fps}[v{i}]",
                i = i, w = target_w, h = target_h, fps = target_fps
            ));
            filter_parts.push(format!(
                "[{i}:a]aresample=44100,aformat=sample_fmts=fltp:channel_layouts=stereo[a{i}]",
                i = i
            ));
            concat_inputs.push_str(&format!("[v{i}][a{i}]", i = i));
        }

        if has_transition {
            // 带转场效果的合并（使用 xfade 和 acrossfade）
            // 注意：xfade 一次只能连接两个视频，多个需要链式
            let transition = params.transition.as_ref().unwrap();
            let trans_type = &transition.transition_type;
            let trans_dur = transition.duration;

            // 第一次 xfade：v0 + v1
            if n >= 2 {
                // 清空简单 concat 输入，改用 xfade 链式
                filter_parts.push(format!(
                    "[v0][v1]xfade=transition={t}:duration={d}:offset=OFFSET_0[vt0];\
                     [a0][a1]acrossfade=d={d}[at0]",
                    t = trans_type, d = trans_dur
                ));
            }
            // 后续 xfade（第 3 个及以后的视频）
            for i in 2..n {
                filter_parts.push(format!(
                    "[vt{prev}][v{i}]xfade=transition={t}:duration={d}:offset=OFFSET_{prev}[vt{curr}];\
                     [at{prev}][a{i}]acrossfade=d={d}[at{curr}]",
                    prev = i - 2, i = i, curr = i - 1,
                    t = trans_type, d = trans_dur
                ));
            }

            let last = if n >= 3 { n - 2 } else { 0 };
            let filter_str = format!(
                "{};-map [vt{}] -map [at{}]",
                filter_parts.join(";"),
                last, last
            );

            let mut cmd = FfmpegCommand::new().with_progress();
            for path in &params.input_paths {
                cmd = cmd.input(path);
            }
            cmd = cmd
                .complex_filter(&filter_str)
                .video_codec("libx264")
                .crf(18)
                .preset("medium")
                .audio_codec("aac")
                .audio_bitrate("128k")
                .faststart()
                .output(&params.output_path);
            return cmd.build();
        }

        // 无转场归一化合并：使用 concat filter
        let concat_filter = format!(
            "{};{}concat=n={}:v=1:a=1[v][a]",
            filter_parts.join(";"),
            concat_inputs,
            n
        );

        let mut cmd = FfmpegCommand::new().with_progress();
        for path in &params.input_paths {
            cmd = cmd.input(path);
        }
        cmd = cmd
            .complex_filter(&concat_filter)
            .args_pair("-map", "[v]")
            .args_pair("-map", "[a]")
            .video_codec("libx264")
            .crf(18)
            .preset("medium")
            .audio_codec("aac")
            .audio_bitrate("128k")
            .faststart()
            .output(&params.output_path);
        cmd.build()
    }
}

/// 构建音频处理命令
///
/// 根据 AudioMode 选择不同的处理逻辑：
/// - Extract: 从视频提取纯音频
/// - Replace: 替换视频音轨
/// - Mute: 删除音轨
/// - Adjust: 音量/标准化/淡入淡出
///
/// # 参数
/// - `params` - 音频处理参数
/// - `input_duration` - 输入文件时长（秒），用于淡出时间计算
pub fn build_audio_command(params: &AudioParams, input_duration: f64) -> Vec<String> {
    match params.mode {
        AudioMode::Extract => {
            let format = params.output_format.as_deref().unwrap_or("mp3");
            let mut cmd = FfmpegCommand::new()
                .with_progress()
                .input(&params.input_path)
                .arg("-vn"); // 去除视频流

            // 根据输出格式选择编码器
            cmd = match format {
                "mp3" => cmd.audio_codec("libmp3lame").args_pair("-q:a", "2"),
                "aac" | "m4a" => cmd.audio_codec("aac").audio_bitrate("256k"),
                "wav" => cmd.audio_codec("pcm_s16le"),
                "flac" => cmd.audio_codec("flac"),
                _ => cmd.audio_codec("libmp3lame").args_pair("-q:a", "2"),
            };

            cmd = cmd.output(&params.output_path);
            cmd.build()
        }
        AudioMode::Replace => {
            let replace_path = params.replace_audio_path.as_deref().unwrap_or("");
            FfmpegCommand::new()
                .with_progress()
                .input(&params.input_path)
                .input(replace_path)
                .video_codec("copy")
                .audio_codec("aac")
                .audio_bitrate("128k")
                .args_pair("-map", "0:v:0")
                .args_pair("-map", "1:a:0")
                .arg("-shortest")
                .output(&params.output_path)
                .build()
        }
        AudioMode::Mute => {
            FfmpegCommand::new()
                .with_progress()
                .input(&params.input_path)
                .video_codec("copy")
                .arg("-an") // 删除音轨
                .output(&params.output_path)
                .build()
        }
        AudioMode::Adjust => {
            let mut cmd = FfmpegCommand::new()
                .with_progress()
                .input(&params.input_path)
                .video_codec("copy");

            // 构建音频滤镜链
            let mut filters: Vec<String> = Vec::new();

            // 音量调节（倍数或 dB）
            if let Some(vol) = params.volume {
                filters.push(format!("volume={}", vol));
            } else if let Some(db) = params.volume_db {
                filters.push(format!("volume={}dB", db));
            }

            // EBU R128 响度标准化
            if params.normalize.unwrap_or(false) {
                filters.push("loudnorm=I=-16:LRA=11:TP=-1.5".to_string());
            }

            // 淡入效果
            if let Some(fade_in) = params.fade_in {
                if fade_in > 0.0 {
                    filters.push(format!("afade=t=in:st=0:d={}", fade_in));
                }
            }

            // 淡出效果（从 total_duration - fade_out 秒处开始）
            if let Some(fade_out) = params.fade_out {
                if fade_out > 0.0 {
                    let start = (input_duration - fade_out).max(0.0);
                    filters.push(format!("afade=t=out:st={}:d={}", start, fade_out));
                }
            }

            if !filters.is_empty() {
                cmd = cmd.audio_filter(&filters.join(","));
            }

            cmd = cmd.audio_codec("aac").audio_bitrate("128k");
            cmd = cmd.output(&params.output_path);
            cmd.build()
        }
    }
}

/// 构建水印叠加命令
///
/// 支持图片水印（overlay 滤镜）和文字水印（drawtext 滤镜），
/// 通过 WatermarkPosition 枚举计算叠加位置坐标
///
/// # 参数
/// - `params` - 水印参数
pub fn build_watermark_command(params: &WatermarkParams) -> Vec<String> {
    let mut cmd = FfmpegCommand::new()
        .with_progress()
        .input(&params.input_path);

    // 默认边距
    let margin = 10;
    let offset_x = params.offset_x.unwrap_or(0);
    let offset_y = params.offset_y.unwrap_or(0);

    match params.watermark_type {
        WatermarkType::Image => {
            let image_path = params.image_path.as_deref().unwrap_or("");
            cmd = cmd.input(image_path);

            // 构建水印处理滤镜（缩放 + 透明度）
            let opacity = params.opacity.unwrap_or(1.0);
            let scale = params.image_scale.unwrap_or(0.15);
            let mut wm_filters = Vec::new();

            // 按视频宽度的比例缩放水印
            wm_filters.push(format!("[1:v]scale=iw*{}:-1", scale));

            // 如果不是完全不透明，添加透明度处理
            if opacity < 1.0 {
                wm_filters.push(format!("format=rgba,colorchannelmixer=aa={}", opacity));
            }

            let wm_filter_str = format!("{}[wm]", wm_filters.join(","));

            // 获取 overlay 位置坐标
            let (x, y) = get_image_overlay_position(&params.position, margin, offset_x, offset_y);
            let overlay = format!("[0:v][wm]overlay={}:{}", x, y);

            let filter = format!("{};{}", wm_filter_str, overlay);
            cmd = cmd.complex_filter(&filter);
        }
        WatermarkType::Text => {
            let text = params.text.as_deref().unwrap_or("Watermark");
            let font_size = params.font_size.unwrap_or(24);
            let font_color = params.font_color.as_deref().unwrap_or("white");
            let border_width = params.border_width.unwrap_or(2);
            let border_color = params.border_color.as_deref().unwrap_or("black");

            // 获取 drawtext 位置坐标
            let (x, y) = get_text_position(&params.position, margin, offset_x, offset_y);

            // 构建 drawtext 滤镜
            let mut drawtext_parts = vec![
                format!("text='{}'", escape_drawtext(text)),
                format!("fontsize={}", font_size),
                format!("fontcolor={}", font_color),
                format!("x={}", x),
                format!("y={}", y),
                format!("borderw={}", border_width),
                format!("bordercolor={}", border_color),
            ];

            // 可选字体文件
            if let Some(ref font_path) = params.font_path {
                drawtext_parts.push(format!("fontfile={}", font_path));
            }

            cmd = cmd.video_filter(&format!("drawtext={}", drawtext_parts.join(":")));
        }
    }

    cmd = cmd
        .video_codec("libx264")
        .crf(18)
        .preset("medium")
        .audio_codec("copy")
        .output(&params.output_path);
    cmd.build()
}

/// 构建分辨率/帧率调整命令
///
/// # 参数
/// - `params` - 分辨率/帧率调整参数
pub fn build_resize_command(params: &ResizeParams) -> Vec<String> {
    let mut cmd = FfmpegCommand::new()
        .with_progress()
        .input(&params.input_path);

    let mut vf_parts: Vec<String> = Vec::new();

    // 分辨率调整
    if params.width.is_some() || params.height.is_some() {
        let w = params.width.map(|v| v.to_string()).unwrap_or_else(|| "-2".to_string());
        let h = params.height.map(|v| v.to_string()).unwrap_or_else(|| "-2".to_string());

        let scale_algo = params.scale_algorithm.as_deref().unwrap_or("lanczos");
        let aspect_mode = params.aspect_mode.as_deref().unwrap_or("pad");

        if params.keep_aspect_ratio {
            match aspect_mode {
                "pad" => {
                    // 缩放到不超过目标尺寸，然后加黑边填充
                    let tw = params.width.unwrap_or(1920);
                    let th = params.height.unwrap_or(1080);
                    vf_parts.push(format!(
                        "scale={}:{}:force_original_aspect_ratio=decrease:flags={}",
                        tw, th, scale_algo
                    ));
                    vf_parts.push(format!(
                        "pad={}:{}:(ow-iw)/2:(oh-ih)/2:black",
                        tw, th
                    ));
                }
                "crop" => {
                    // 缩放到填满目标尺寸，然后裁切超出部分
                    let tw = params.width.unwrap_or(1920);
                    let th = params.height.unwrap_or(1080);
                    vf_parts.push(format!(
                        "scale={}:{}:force_original_aspect_ratio=increase:flags={}",
                        tw, th, scale_algo
                    ));
                    vf_parts.push(format!("crop={}:{}", tw, th));
                }
                _ => {
                    // stretch: 直接拉伸（不保持比例）
                    vf_parts.push(format!("scale={}:{}:flags={}", w, h, scale_algo));
                }
            }
        } else {
            // 不保持宽高比，直接缩放到指定尺寸
            vf_parts.push(format!("scale={}:{}:flags={}", w, h, scale_algo));
        }
    }

    // 帧率调整
    if let Some(fps) = params.fps {
        vf_parts.push(format!("fps={}", fps));
    }

    // 应用视频滤镜
    if !vf_parts.is_empty() {
        for vf in &vf_parts {
            cmd = cmd.video_filter(vf);
        }
    }

    cmd = cmd
        .video_codec("libx264")
        .crf(18)
        .preset("medium")
        .audio_codec("copy")
        .faststart()
        .output(&params.output_path);
    cmd.build()
}

/// 构建 GIF 制作命令
///
/// 使用高质量两步法（palettegen + paletteuse）合并为单条 filter_complex 命令，
/// 生成色彩还原度高的 GIF
///
/// # 参数
/// - `params` - GIF 制作参数
pub fn build_gif_command(params: &GifParams) -> Vec<String> {
    let start_ts = crate::utils::time::seconds_to_timestamp(params.start_time);
    let duration_ts = crate::utils::time::seconds_to_timestamp(params.duration);
    let max_colors = params.max_colors.unwrap_or(256);
    let dither = params.dither.as_deref().unwrap_or("bayer");

    // 构建 filter_complex：一步完成调色板生成和应用
    // fps → scale → split → palettegen + paletteuse
    let filter = format!(
        "fps={fps},scale={w}:-1:flags=lanczos,split[s0][s1];\
         [s0]palettegen=max_colors={mc}:stats_mode=diff[p];\
         [s1][p]paletteuse=dither={dither}:bayer_scale=5",
        fps = params.fps,
        w = params.width,
        mc = max_colors,
        dither = dither,
    );

    FfmpegCommand::new()
        .with_progress()
        .pre_args_pair("-ss", &start_ts)
        .pre_args_pair("-t", &duration_ts)
        .input(&params.input_path)
        .complex_filter(&filter)
        .args_pair("-loop", &params.loop_count.to_string())
        .output(&params.output_path)
        .build()
}

/// 构建字幕处理命令
///
/// 支持三种模式：
/// - Embed: 将外部字幕文件作为软字幕嵌入容器
/// - Extract: 从容器中提取字幕流为独立文件
/// - BurnIn: 将字幕烧录到视频画面上（硬字幕）
///
/// # 参数
/// - `params` - 字幕处理参数
pub fn build_subtitle_command(params: &SubtitleParams) -> Vec<String> {
    match params.mode {
        SubtitleMode::Embed => {
            let subtitle_path = params.subtitle_path.as_deref().unwrap_or("");
            let ext = crate::utils::path::file_extension(&params.output_path);

            // 根据输出容器选择字幕编码器
            let sub_codec = if ext == "mp4" { "mov_text" } else { "srt" };

            FfmpegCommand::new()
                .with_progress()
                .input(&params.input_path)
                .input(subtitle_path)
                .video_codec("copy")
                .audio_codec("copy")
                .args_pair("-c:s", sub_codec)
                .args_pair("-map", "0:v")
                .args_pair("-map", "0:a")
                .args_pair("-map", "1:s")
                .output(&params.output_path)
                .build()
        }
        SubtitleMode::Extract => {
            let sub_index = params.subtitle_index.unwrap_or(0);
            FfmpegCommand::new()
                .input(&params.input_path)
                .args_pair("-map", &format!("0:s:{}", sub_index))
                .output(&params.output_path)
                .build()
        }
        SubtitleMode::BurnIn => {
            let mut cmd = FfmpegCommand::new()
                .with_progress()
                .input(&params.input_path);

            // 构建 subtitles/ass 滤镜
            if let Some(ref sub_path) = params.subtitle_path {
                let ext = crate::utils::path::file_extension(sub_path);

                // 构建 force_style 样式参数
                let mut style_parts: Vec<String> = Vec::new();
                if let Some(ref name) = params.font_name {
                    style_parts.push(format!("FontName={}", name));
                }
                if let Some(size) = params.font_size {
                    style_parts.push(format!("FontSize={}", size));
                }
                if let Some(ref color) = params.primary_color {
                    style_parts.push(format!("PrimaryColour={}", color));
                }
                if let Some(width) = params.outline_width {
                    style_parts.push(format!("Outline={}", width));
                }
                if let Some(margin) = params.margin_v {
                    style_parts.push(format!("MarginV={}", margin));
                }

                let filter = if ext == "ass" {
                    // ASS 字幕保留原始样式
                    format!("ass={}", escape_filter_path(sub_path))
                } else if style_parts.is_empty() {
                    format!("subtitles={}", escape_filter_path(sub_path))
                } else {
                    format!(
                        "subtitles={}:force_style='{}'",
                        escape_filter_path(sub_path),
                        style_parts.join(",")
                    )
                };

                cmd = cmd.video_filter(&filter);
            } else {
                // 烧录视频内嵌字幕（如 MKV 中的字幕流）
                let sub_index = params.subtitle_index.unwrap_or(0);
                cmd = cmd.video_filter(&format!(
                    "subtitles={}:si={}",
                    escape_filter_path(&params.input_path),
                    sub_index
                ));
            }

            cmd = cmd
                .video_codec("libx264")
                .crf(18)
                .preset("medium")
                .audio_codec("copy")
                .faststart()
                .output(&params.output_path);
            cmd.build()
        }
    }
}

// ============================================================
// 辅助函数
// ============================================================

/// 将质量等级 (1-10) 映射到 CRF 值
///
/// 等级 10 对应最高质量 (CRF 16)，等级 1 对应最低质量 (CRF 34)
fn quality_level_to_crf(level: u32) -> u32 {
    let clamped = level.clamp(1, 10);
    // CRF 范围 16-34，等级越高 CRF 越低（质量越好）
    34 - ((clamped - 1) * 2)
}

/// 将质量等级 (1-10) 映射到 VideoToolbox 的 -q:v 值
///
/// VT 的 q:v 范围 0-100，数值越高质量越好
fn quality_level_to_vt_q(level: u32) -> u32 {
    let clamped = level.clamp(1, 10);
    // 映射到 30-85 范围
    30 + ((clamped - 1) * 55 / 9)
}

/// 将压缩比例 (0.0-1.0) 映射到 CRF 值
///
/// 比例 1.0（不压缩）对应 CRF 16，比例 0.1（极端压缩）对应 CRF 34
fn ratio_to_crf(ratio: f64) -> u32 {
    let clamped = ratio.clamp(0.1, 1.0);
    // 线性插值：ratio 越小 CRF 越高
    let crf = 16.0 + (1.0 - clamped) * 20.0;
    crf as u32
}

/// 获取图片水印的 overlay 位置坐标
///
/// 返回 ffmpeg overlay 滤镜的 x/y 表达式字符串，
/// W/H 代表底层视频尺寸，w/h 代表水印尺寸
fn get_image_overlay_position(
    position: &WatermarkPosition,
    margin: i32,
    offset_x: i32,
    offset_y: i32,
) -> (String, String) {
    let (base_x, base_y) = match position {
        WatermarkPosition::TopLeft => (format!("{}", margin), format!("{}", margin)),
        WatermarkPosition::TopCenter => (format!("(W-w)/2"), format!("{}", margin)),
        WatermarkPosition::TopRight => (format!("W-w-{}", margin), format!("{}", margin)),
        WatermarkPosition::CenterLeft => (format!("{}", margin), format!("(H-h)/2")),
        WatermarkPosition::Center => (format!("(W-w)/2"), format!("(H-h)/2")),
        WatermarkPosition::CenterRight => (format!("W-w-{}", margin), format!("(H-h)/2")),
        WatermarkPosition::BottomLeft => (format!("{}", margin), format!("H-h-{}", margin)),
        WatermarkPosition::BottomCenter => (format!("(W-w)/2"), format!("H-h-{}", margin)),
        WatermarkPosition::BottomRight => (format!("W-w-{}", margin), format!("H-h-{}", margin)),
    };

    // 应用额外偏移
    let x = if offset_x != 0 {
        format!("{}+{}", base_x, offset_x)
    } else {
        base_x
    };
    let y = if offset_y != 0 {
        format!("{}+{}", base_y, offset_y)
    } else {
        base_y
    };

    (x, y)
}

/// 获取文字水印的 drawtext 位置坐标
///
/// 返回 drawtext 滤镜的 x/y 表达式字符串，
/// w/h 代表视频尺寸，text_w/text_h 代表文字尺寸
fn get_text_position(
    position: &WatermarkPosition,
    margin: i32,
    offset_x: i32,
    offset_y: i32,
) -> (String, String) {
    let (base_x, base_y) = match position {
        WatermarkPosition::TopLeft => (format!("{}", margin), format!("{}", margin)),
        WatermarkPosition::TopCenter => (format!("(w-text_w)/2"), format!("{}", margin)),
        WatermarkPosition::TopRight => (format!("w-text_w-{}", margin), format!("{}", margin)),
        WatermarkPosition::CenterLeft => (format!("{}", margin), format!("(h-text_h)/2")),
        WatermarkPosition::Center => (format!("(w-text_w)/2"), format!("(h-text_h)/2")),
        WatermarkPosition::CenterRight => (format!("w-text_w-{}", margin), format!("(h-text_h)/2")),
        WatermarkPosition::BottomLeft => (format!("{}", margin), format!("h-text_h-{}", margin)),
        WatermarkPosition::BottomCenter => (format!("(w-text_w)/2"), format!("h-text_h-{}", margin)),
        WatermarkPosition::BottomRight => (format!("w-text_w-{}", margin), format!("h-text_h-{}", margin)),
    };

    let x = if offset_x != 0 {
        format!("{}+{}", base_x, offset_x)
    } else {
        base_x
    };
    let y = if offset_y != 0 {
        format!("{}+{}", base_y, offset_y)
    } else {
        base_y
    };

    (x, y)
}

/// 转义 drawtext 滤镜中的特殊字符
///
/// ffmpeg drawtext 中需要对单引号和反斜杠进行转义
fn escape_drawtext(text: &str) -> String {
    text.replace('\\', "\\\\")
        .replace('\'', "\\'")
        .replace(':', "\\:")
        .replace(';', "\\;")
}

/// 转义滤镜中的文件路径
///
/// ffmpeg 滤镜参数中的文件路径需要转义特殊字符
fn escape_filter_path(path: &str) -> String {
    path.replace('\\', "\\\\")
        .replace('\'', "\\'")
        .replace(':', "\\:")
        .replace(';', "\\;")
}
