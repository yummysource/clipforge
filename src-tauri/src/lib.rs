/// ClipForge core library
///
/// Contains all Tauri commands, ffmpeg engine, data models,
/// and shared entry point for desktop and mobile builds.

// Module declarations
pub mod commands;
pub mod engine;
pub mod models;
pub mod utils;

use tauri::image::Image;
use tauri::menu::{AboutMetadata, MenuBuilder, SubmenuBuilder};

/// Build macOS application menu with custom About dialog icon
///
/// Creates the standard macOS menu structure:
/// - App submenu: About (with embedded app icon), Services, Hide, Quit
/// - Edit submenu: Undo, Redo, Cut, Copy, Paste, Select All
/// - Window submenu: Minimize, Maximize, Close Window
///
/// The app icon is embedded at compile time via `include_bytes!`
/// so it displays correctly in both dev and production modes.
fn build_app_menu(handle: &tauri::AppHandle) -> tauri::Result<tauri::menu::Menu<tauri::Wry>> {
    /* Decode embedded PNG icon into raw RGBA for Tauri Image */
    let icon_img = image::load_from_memory(include_bytes!("../icons/icon.png"))
        .expect("Failed to decode embedded app icon");
    let rgba = icon_img.to_rgba8();
    let (w, h) = rgba.dimensions();
    let icon = Image::new_owned(rgba.into_raw(), w, h);

    let app_submenu = SubmenuBuilder::new(handle, "ClipForge")
        .about(Some(AboutMetadata {
            icon: Some(icon),
            ..Default::default()
        }))
        .separator()
        .services()
        .separator()
        .hide()
        .hide_others()
        .show_all()
        .separator()
        .quit()
        .build()?;

    let edit_submenu = SubmenuBuilder::new(handle, "Edit")
        .undo()
        .redo()
        .separator()
        .cut()
        .copy()
        .paste()
        .select_all()
        .build()?;

    let window_submenu = SubmenuBuilder::new(handle, "Window")
        .minimize()
        .maximize()
        .separator()
        .close_window()
        .build()?;

    MenuBuilder::new(handle)
        .items(&[&app_submenu, &edit_submenu, &window_submenu])
        .build()
}

/// Run the Tauri application
///
/// Registers all plugins and commands, configures the custom
/// macOS menu with app icon, then starts the application main loop.
pub fn run() {
    tauri::Builder::default()
        // Register Tauri plugins
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init())
        // Custom macOS menu with app icon in About dialog
        .menu(|handle| build_app_menu(handle))
        // Register frontend-callable commands
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
            commands::finder::reveal_in_finder,
        ])
        .run(tauri::generate_context!())
        .expect("Failed to start ClipForge application");
}
