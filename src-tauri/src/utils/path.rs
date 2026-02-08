/// 路径工具函数
///
/// 提供输出文件路径生成、临时文件管理和文件名处理功能，
/// 用于在 ffmpeg 命令构建前确定输出路径

use std::path::{Path, PathBuf};

/// 根据输入路径和参数生成输出文件路径
///
/// 如果 output_dir 为空字符串，则输出到输入文件所在目录。
/// 当 auto_rename 为 true 时，如果输出路径已存在，自动追加数字后缀避免覆盖
///
/// # 参数
/// - `input_path` - 输入文件完整路径
/// - `output_dir` - 指定的输出目录（空字符串表示与输入同目录）
/// - `suffix` - 文件名后缀标记（如 "_compressed", "_trimmed"）
/// - `extension` - 输出文件扩展名（如 "mp4", "gif"）
/// - `auto_rename` - 是否在文件已存在时自动追加数字后缀
///
/// # 返回
/// 生成的输出文件完整路径
pub fn generate_output_path(
    input_path: &str,
    output_dir: &str,
    suffix: &str,
    extension: &str,
    auto_rename: bool,
) -> String {
    let input = Path::new(input_path);

    // 提取输入文件的基础名称（不含扩展名）
    let stem = input
        .file_stem()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_else(|| "output".to_string());

    // 确定输出目录：优先使用指定目录，否则使用输入文件所在目录
    let dir = if output_dir.is_empty() {
        input
            .parent()
            .map(|p| p.to_path_buf())
            .unwrap_or_else(|| PathBuf::from("."))
    } else {
        PathBuf::from(output_dir)
    };

    // 构建基础输出路径
    let base_name = format!("{}{}.{}", stem, suffix, extension);
    let mut output_path = dir.join(&base_name);

    // 自动重命名：追加数字后缀直到找到不存在的文件名
    if auto_rename {
        let mut counter = 1u32;
        while output_path.exists() {
            let numbered_name = format!("{}{}_{}.{}", stem, suffix, counter, extension);
            output_path = dir.join(&numbered_name);
            counter += 1;
        }
    }

    output_path.to_string_lossy().to_string()
}

/// 从文件路径中提取不含扩展名的文件名
///
/// # 参数
/// - `path` - 文件路径（完整路径或仅文件名）
///
/// # 返回
/// 不含扩展名的文件名字符串
pub fn file_stem(path: &str) -> String {
    Path::new(path)
        .file_stem()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_else(|| "unknown".to_string())
}

/// 从文件路径中提取文件扩展名（不含点号）
///
/// # 参数
/// - `path` - 文件路径
///
/// # 返回
/// 小写扩展名，无扩展名时返回空字符串
pub fn file_extension(path: &str) -> String {
    Path::new(path)
        .extension()
        .map(|e| e.to_string_lossy().to_lowercase())
        .unwrap_or_default()
}

/// 获取文件大小（字节）
///
/// # 参数
/// - `path` - 文件路径
///
/// # 返回
/// 文件大小，文件不存在或读取失败返回 0
pub fn get_file_size(path: &str) -> u64 {
    std::fs::metadata(path)
        .map(|m| m.len())
        .unwrap_or(0)
}

/// 创建临时目录用于存放中间文件
///
/// 使用系统临时目录下的 clipforge 子目录，
/// 如果目录不存在则自动创建
///
/// # 返回
/// 临时目录路径，创建失败返回错误
pub fn get_temp_dir() -> Result<PathBuf, String> {
    let temp = std::env::temp_dir().join("clipforge");
    std::fs::create_dir_all(&temp)
        .map_err(|e| format!("创建临时目录失败: {}", e))?;
    Ok(temp)
}

/// 生成临时文件路径
///
/// 在 clipforge 临时目录下生成一个带有唯一标识的临时文件路径
///
/// # 参数
/// - `prefix` - 文件名前缀（如 "concat", "palette"）
/// - `extension` - 文件扩展名（如 "txt", "png"）
///
/// # 返回
/// 临时文件完整路径
pub fn temp_file_path(prefix: &str, extension: &str) -> Result<String, String> {
    let temp_dir = get_temp_dir()?;
    let unique_id = uuid::Uuid::new_v4().to_string();
    let filename = format!("{}_{}.{}", prefix, &unique_id[..8], extension);
    Ok(temp_dir.join(filename).to_string_lossy().to_string())
}

/// 清理临时文件
///
/// 删除指定的临时文件，忽略删除失败的错误（文件可能已不存在）
///
/// # 参数
/// - `path` - 要删除的临时文件路径
pub fn cleanup_temp_file(path: &str) {
    let _ = std::fs::remove_file(path);
}
