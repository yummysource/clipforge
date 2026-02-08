/// ffmpeg 进度解析器
///
/// 解析 ffmpeg `-progress pipe:1` 的标准输出，
/// 将 key=value 格式的进度信息转换为结构化的 ProgressUpdate
///
/// ffmpeg progress 输出格式示例：
/// ```text
/// frame=150
/// fps=45.2
/// stream_0_0_q=28.0
/// bitrate=4500.0kbits/s
/// total_size=1048576
/// out_time_us=5000000
/// out_time=00:00:05.000000
/// speed=1.5x
/// progress=continue
/// ```

use std::collections::HashMap;
use std::time::Instant;

use crate::models::task::ProgressUpdate;
use crate::utils::time::microseconds_to_seconds;

/// 进度推送的最小间隔（毫秒）
///
/// 避免过于频繁地推送进度更新导致前端渲染压力过大
const MIN_EMIT_INTERVAL_MS: u128 = 200;

/// ffmpeg 进度解析器
///
/// 维护解析状态和时间控制，每当收到一组完整的 progress 输出
/// （以 `progress=continue` 或 `progress=end` 结尾）时，
/// 生成一个 ProgressUpdate
pub struct ProgressParser {
    /// 视频总时长（微秒），用于计算进度百分比
    total_duration_us: i64,
    /// 关联的任务 ID，用于填充 ProgressUpdate.task_id
    task_id: String,
    /// 上次推送进度的时间，用于节流控制
    last_emit_time: Instant,
    /// 当前正在解析的 key=value 对缓存
    current_values: HashMap<String, String>,
}

impl ProgressParser {
    /// 创建新的进度解析器
    ///
    /// # 参数
    /// - `total_duration` - 视频总时长（秒），用于百分比计算
    /// - `task_id` - 关联的任务 ID
    pub fn new(total_duration: f64, task_id: &str) -> Self {
        Self {
            total_duration_us: (total_duration * 1_000_000.0) as i64,
            task_id: task_id.to_string(),
            last_emit_time: Instant::now()
                .checked_sub(std::time::Duration::from_millis(MIN_EMIT_INTERVAL_MS as u64))
                .unwrap_or_else(Instant::now),
            current_values: HashMap::new(),
        }
    }

    /// 解析一行 ffmpeg progress 输出
    ///
    /// 收集 key=value 对，当遇到 `progress=continue` 或 `progress=end` 时
    /// 生成一个完整的 ProgressUpdate。通过时间节流避免过于频繁的推送
    ///
    /// # 参数
    /// - `line` - 一行 ffmpeg progress 输出（如 "frame=150" 或 "progress=continue"）
    ///
    /// # 返回
    /// - `Some(ProgressUpdate)` - 收到完整进度数据且满足推送间隔
    /// - `None` - 数据尚不完整或未达到推送时间间隔
    pub fn parse_line(&mut self, line: &str) -> Option<ProgressUpdate> {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            return None;
        }

        // 解析 key=value 格式
        if let Some(eq_pos) = trimmed.find('=') {
            let key = trimmed[..eq_pos].trim().to_string();
            let value = trimmed[eq_pos + 1..].trim().to_string();

            // 当遇到 progress=continue/end 时，表示一组完整的进度数据
            if key == "progress" {
                let result = self.build_progress_update();
                self.current_values.clear();

                // 节流控制：避免推送过于频繁
                if self.last_emit_time.elapsed().as_millis() >= MIN_EMIT_INTERVAL_MS {
                    self.last_emit_time = Instant::now();
                    return result;
                }
                // 如果是 progress=end，强制推送最后一次更新
                if value == "end" {
                    return result;
                }
                return None;
            }

            self.current_values.insert(key, value);
        }

        None
    }

    /// 检查 ffmpeg 是否已完成处理
    ///
    /// 当解析到 `progress=end` 行时返回 true
    ///
    /// # 参数
    /// - `line` - 一行 ffmpeg progress 输出
    pub fn is_finished(line: &str) -> bool {
        line.trim() == "progress=end"
    }

    /// 从缓存的 key=value 对构建 ProgressUpdate
    ///
    /// 从 out_time_us 计算进度百分比，从 speed 计算预估剩余时间
    fn build_progress_update(&self) -> Option<ProgressUpdate> {
        // 提取 out_time_us（已处理的时间，微秒）
        let out_time_us = self
            .current_values
            .get("out_time_us")
            .and_then(|v| v.parse::<i64>().ok())
            .unwrap_or(0);

        // 计算进度百分比
        let percent = if self.total_duration_us > 0 {
            (out_time_us as f64 / self.total_duration_us as f64 * 100.0).min(100.0)
        } else {
            0.0
        };

        // 提取已处理的时间（秒）
        let current_time = microseconds_to_seconds(out_time_us);

        // 提取处理速度（如 "1.5x" → 1.5）
        let speed = self
            .current_values
            .get("speed")
            .and_then(|v| v.trim_end_matches('x').parse::<f64>().ok())
            .unwrap_or(0.0);

        // 计算预估剩余时间：remaining_time / speed
        let total_duration_secs = microseconds_to_seconds(self.total_duration_us);
        let remaining_time = total_duration_secs - current_time;
        let eta = if speed > 0.0 {
            (remaining_time / speed).max(0.0)
        } else {
            0.0
        };

        // 提取输出文件当前大小（字节）
        let output_size = self
            .current_values
            .get("total_size")
            .and_then(|v| v.parse::<u64>().ok())
            .unwrap_or(0);

        // 提取已处理帧数
        let frame = self
            .current_values
            .get("frame")
            .and_then(|v| v.parse::<u64>().ok())
            .unwrap_or(0);

        // 提取当前处理帧率
        let fps = self
            .current_values
            .get("fps")
            .and_then(|v| v.parse::<f64>().ok())
            .unwrap_or(0.0);

        Some(ProgressUpdate {
            task_id: self.task_id.clone(),
            percent,
            speed,
            current_time,
            eta,
            output_size,
            frame,
            fps,
        })
    }
}
