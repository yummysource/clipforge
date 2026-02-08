/// ClipForge 核心库
///
/// 包含所有 Tauri commands、ffmpeg 引擎、数据模型等核心模块
/// 同时作为桌面端和移动端的共享入口

// 子模块声明
pub mod commands;
pub mod engine;
pub mod models;
pub mod utils;

/// 运行 Tauri 应用
///
/// 注册所有插件和 commands，配置窗口和事件处理，
/// 然后启动应用主循环
pub fn run() {
    tauri::Builder::default()
        // 注册 Tauri 插件
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init())
        // 注册前端可调用的 commands
        .invoke_handler(tauri::generate_handler![
            commands::media_info::get_media_info,
            commands::convert::convert_video,
            commands::compress::compress_video,
            commands::trim::trim_video,
            commands::merge::merge_videos,
            commands::audio::process_audio,
            commands::watermark::add_watermark,
            commands::resize::resize_video,
            commands::gif::create_gif,
            commands::subtitle::process_subtitle,
            commands::download::parse_video_url,
            commands::download::download_video,
            commands::task::cancel_task,
            commands::settings::get_settings,
            commands::settings::save_settings,
        ])
        .run(tauri::generate_context!())
        .expect("启动 ClipForge 应用失败");
}
