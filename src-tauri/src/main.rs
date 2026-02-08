// ClipForge 桌面端入口
// 阻止 Windows 平台显示额外的控制台窗口
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

/// 桌面端应用入口点
///
/// 调用 lib.rs 中定义的 run() 函数启动 Tauri 应用
fn main() {
    clipforge_lib::run()
}
