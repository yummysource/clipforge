/**
 * @file 本地 HTTP 文件服务器
 * @description 通过 axum + tower-http 提供支持 HTTP Range 请求的本地文件服务。
 *
 * 背景：Tauri 的 asset:// 协议基于 WKURLSchemeHandler 实现，该接口不支持
 * HTTP Range 请求（部分内容响应）。浏览器播放大视频文件（数 GB）必须依赖
 * Range 请求进行分段加载，导致 WKWebView 返回 MEDIA_ERR_SRC_NOT_SUPPORTED(4)。
 *
 * 解决方案：在 127.0.0.1 上启动一个标准 HTTP 服务器，tower-http 的 ServeDir
 * 原生支持 Range 请求和 ETag 缓存，视频文件通过 http://127.0.0.1:PORT/path
 * 提供服务，彻底解决大文件播放问题。
 */
use axum::Router;
use tower_http::{
    cors::{Any, CorsLayer},
    services::ServeDir,
};

/// 本地文件 HTTP 服务器的固定端口
///
/// 选择 14200 作为固定端口（非系统保留范围，冲突概率低）。
/// 前端 VideoPreview 使用相同的常量构造视频 URL。
pub const PORT: u16 = 14200;

/// 启动本地 HTTP 文件服务器
///
/// 创建独立 OS 线程并在其中运行专属 tokio runtime，
/// 完全不依赖 Tauri 运行时的启动时序，可在 setup 回调中安全调用。
///
/// 服务特性：
/// - 从文件系统根目录 `/` 提供文件服务，支持任意本地路径
/// - 支持 HTTP Range 请求，允许视频流式加载和 seek
/// - 添加 CORS 通配符响应头，兼容 tauri:// 和 http://localhost 两种前端源
pub fn start() {
    std::thread::spawn(|| {
        tokio::runtime::Builder::new_multi_thread()
            .enable_all()
            .build()
            .expect("本地文件服务器 tokio runtime 创建失败")
            .block_on(serve());
    });
}

/// 异步服务器主循环
async fn serve() {
    /* 从文件系统根目录服务，支持任意绝对路径 */
    let file_service = ServeDir::new("/");

    /* 添加 CORS 头，允许来自 tauri:// 和 localhost 的请求 */
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        .fallback_service(file_service)
        .layer(cors);

    let listener = tokio::net::TcpListener::bind(format!("127.0.0.1:{}", PORT))
        .await
        .unwrap_or_else(|e| panic!("本地文件服务器端口 {} 绑定失败: {}", PORT, e));

    log::info!("本地文件服务器已启动，端口: {}", PORT);

    axum::serve(listener, app)
        .await
        .expect("本地文件服务器异常退出");
}
