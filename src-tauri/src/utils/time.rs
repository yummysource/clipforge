/// 时间格式工具函数
///
/// 提供秒数与 HH:MM:SS.mmm 格式之间的双向转换，
/// 用于 ffmpeg 命令参数构建和进度输出解析

/// 将秒数转换为 ffmpeg 时间格式字符串
///
/// 输出格式为 HH:MM:SS.mmm（精确到毫秒），
/// 这是 ffmpeg -ss / -to 参数接受的标准时间格式
///
/// # 参数
/// - `seconds` - 时间（秒），支持小数部分表示毫秒
///
/// # 返回
/// 格式化的时间字符串，如 "01:30:05.500"
///
/// # 示例
/// ```
/// assert_eq!(seconds_to_timestamp(5405.5), "01:30:05.500");
/// assert_eq!(seconds_to_timestamp(0.0), "00:00:00.000");
/// ```
pub fn seconds_to_timestamp(seconds: f64) -> String {
    let total_secs = seconds.max(0.0);
    let hours = (total_secs / 3600.0) as u32;
    let minutes = ((total_secs % 3600.0) / 60.0) as u32;
    let secs = (total_secs % 60.0) as u32;
    let millis = ((total_secs % 1.0) * 1000.0) as u32;
    format!("{:02}:{:02}:{:02}.{:03}", hours, minutes, secs, millis)
}

/// 将 ffmpeg 时间格式字符串解析为秒数
///
/// 支持以下格式：
/// - "HH:MM:SS.ffffff"（ffmpeg progress 输出的微秒精度）
/// - "HH:MM:SS.mmm"（毫秒精度）
/// - "HH:MM:SS"（无小数部分）
/// - 纯数字（直接作为秒数）
///
/// # 参数
/// - `timestamp` - 时间格式字符串
///
/// # 返回
/// 解析后的秒数，解析失败返回 0.0
pub fn timestamp_to_seconds(timestamp: &str) -> f64 {
    let trimmed = timestamp.trim();

    // 尝试纯数字解析（已经是秒数）
    if !trimmed.contains(':') {
        return trimmed.parse::<f64>().unwrap_or(0.0);
    }

    // 按冒号分割为时、分、秒
    let parts: Vec<&str> = trimmed.split(':').collect();
    match parts.len() {
        3 => {
            let hours = parts[0].parse::<f64>().unwrap_or(0.0);
            let minutes = parts[1].parse::<f64>().unwrap_or(0.0);
            let seconds = parts[2].parse::<f64>().unwrap_or(0.0);
            hours * 3600.0 + minutes * 60.0 + seconds
        }
        2 => {
            // MM:SS 格式
            let minutes = parts[0].parse::<f64>().unwrap_or(0.0);
            let seconds = parts[1].parse::<f64>().unwrap_or(0.0);
            minutes * 60.0 + seconds
        }
        _ => 0.0,
    }
}

/// 将微秒值转换为秒
///
/// ffmpeg progress 输出中 out_time_us 字段以微秒为单位，
/// 此函数将其转换为秒以便计算进度百分比
///
/// # 参数
/// - `microseconds` - 微秒值
///
/// # 返回
/// 对应的秒数
pub fn microseconds_to_seconds(microseconds: i64) -> f64 {
    microseconds as f64 / 1_000_000.0
}

/// 将秒数转换为微秒值
///
/// 用于计算 ffmpeg progress 的进度百分比时，
/// 将总时长从秒转换为微秒以与 out_time_us 做比较
///
/// # 参数
/// - `seconds` - 秒数
///
/// # 返回
/// 对应的微秒值
pub fn seconds_to_microseconds(seconds: f64) -> i64 {
    (seconds * 1_000_000.0) as i64
}

/// 格式化时长为人类可读的字符串
///
/// 用于前端展示时长信息，如 "1h 30m 5s" 或 "5m 30s"
///
/// # 参数
/// - `seconds` - 时长（秒）
///
/// # 返回
/// 人类可读的时长字符串
pub fn format_duration(seconds: f64) -> String {
    let total_secs = seconds.max(0.0) as u64;
    let hours = total_secs / 3600;
    let minutes = (total_secs % 3600) / 60;
    let secs = total_secs % 60;

    if hours > 0 {
        format!("{}h {}m {}s", hours, minutes, secs)
    } else if minutes > 0 {
        format!("{}m {}s", minutes, secs)
    } else {
        format!("{}s", secs)
    }
}
