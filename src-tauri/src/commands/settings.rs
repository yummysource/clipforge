/// 设置管理 command
///
/// 读取和保存应用设置，使用 JSON 文件持久化存储。
/// 设置文件位于 $APPDATA/com.clipforge.app/settings.json

use tauri::Manager;

use crate::models::settings::AppSettings;

/// 设置文件名
const SETTINGS_FILE: &str = "settings.json";

/// 获取应用设置
///
/// 从应用数据目录读取设置 JSON 文件并反序列化。
/// 如果文件不存在或解析失败，返回默认设置
///
/// # 参数
/// - `app` - Tauri AppHandle，用于获取应用数据目录路径
///
/// # 返回
/// - `Ok(AppSettings)` - 当前设置（或默认设置）
/// - `Err(String)` - 读取失败（通常不会发生，因为有默认值兜底）
#[tauri::command]
pub async fn get_settings(app: tauri::AppHandle) -> Result<AppSettings, String> {
    let settings_path = get_settings_path(&app)?;

    // 文件不存在时返回默认设置
    if !settings_path.exists() {
        return Ok(AppSettings::default());
    }

    // 读取并解析设置文件
    let content = std::fs::read_to_string(&settings_path)
        .map_err(|e| format!("读取设置文件失败: {}", e))?;

    // 解析失败时返回默认设置（容错处理，避免损坏的文件导致应用无法启动）
    let settings: AppSettings = serde_json::from_str(&content)
        .unwrap_or_else(|_| {
            log::warn!("设置文件解析失败，使用默认设置");
            AppSettings::default()
        });

    Ok(settings)
}

/// 保存应用设置
///
/// 将设置序列化为 JSON 并写入应用数据目录。
/// 如果目录不存在则自动创建
///
/// # 参数
/// - `app` - Tauri AppHandle
/// - `settings` - 要保存的设置对象
///
/// # 返回
/// - `Ok(())` - 保存成功
/// - `Err(String)` - 序列化或写入失败
#[tauri::command]
pub async fn save_settings(
    app: tauri::AppHandle,
    settings: AppSettings,
) -> Result<(), String> {
    let settings_path = get_settings_path(&app)?;

    // 确保目录存在
    if let Some(parent) = settings_path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("创建设置目录失败: {}", e))?;
    }

    // 序列化为格式化的 JSON（便于手动查看和编辑）
    let json = serde_json::to_string_pretty(&settings)
        .map_err(|e| format!("序列化设置失败: {}", e))?;

    // 写入文件
    std::fs::write(&settings_path, json)
        .map_err(|e| format!("写入设置文件失败: {}", e))?;

    Ok(())
}

/// 获取设置文件的完整路径
///
/// 使用 Tauri 的 app_data_dir() 获取应用数据目录，
/// 然后拼接设置文件名
fn get_settings_path(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("获取应用数据目录失败: {}", e))?;
    Ok(app_data.join(SETTINGS_FILE))
}
