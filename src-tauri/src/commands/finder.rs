/// Finder 操作 command
///
/// 提供在 macOS Finder 中展示文件的功能，
/// 用于任务完成后自动打开输出文件所在目录

use std::path::Path;

/// 在 Finder 中展示指定文件
///
/// 使用 macOS `open -R` 命令打开 Finder 并高亮选中文件。
/// 如果文件不存在，则打开其父目录
///
/// # 参数
/// - `path` - 文件的完整路径
///
/// # 返回
/// - `Ok(())` - 操作成功
/// - `Err(String)` - 路径无效或命令执行失败
#[tauri::command]
pub async fn reveal_in_finder(path: String) -> Result<(), String> {
    let file_path = Path::new(&path);

    if file_path.exists() {
        // 文件存在：使用 open -R 在 Finder 中高亮显示
        std::process::Command::new("open")
            .arg("-R")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("打开 Finder 失败: {}", e))?;
    } else if let Some(parent) = file_path.parent() {
        // 文件不存在但目录存在：打开父目录
        if parent.exists() {
            std::process::Command::new("open")
                .arg(parent)
                .spawn()
                .map_err(|e| format!("打开目录失败: {}", e))?;
        } else {
            return Err(format!("路径不存在: {}", path));
        }
    } else {
        return Err(format!("无效路径: {}", path));
    }

    Ok(())
}
