/// 内置预设管理
///
/// 提供各功能模块的预置方案列表，
/// 前端通过此模块获取可选的预设选项

use crate::models::preset::PresetInfo;

/// 获取所有内置预设信息列表
///
/// 返回全部功能模块的预设方案，按功能分类。
/// 前端在预设选择器中使用这些信息展示给用户
pub fn get_all_presets() -> Vec<PresetInfo> {
    let mut presets = Vec::new();

    // 格式转换预设
    presets.extend(get_convert_presets());
    // 视频压缩预设
    presets.extend(get_compress_presets());
    // GIF 制作预设
    presets.extend(get_gif_presets());
    // 分辨率预设
    presets.extend(get_resize_presets());

    presets
}

/// 获取格式转换预设
fn get_convert_presets() -> Vec<PresetInfo> {
    vec![
        PresetInfo {
            id: "convert_mp4_h264".to_string(),
            name: "MP4 (H.264)".to_string(),
            description: "通用格式，兼容性最好，适合社交媒体分享".to_string(),
            category: "convert".to_string(),
        },
        PresetInfo {
            id: "convert_mp4_h265".to_string(),
            name: "MP4 (H.265/HEVC)".to_string(),
            description: "高效压缩，同等质量下文件更小，Apple 设备友好".to_string(),
            category: "convert".to_string(),
        },
        PresetInfo {
            id: "convert_mkv".to_string(),
            name: "MKV (万能容器)".to_string(),
            description: "支持几乎所有编码格式，适合存档".to_string(),
            category: "convert".to_string(),
        },
        PresetInfo {
            id: "convert_webm".to_string(),
            name: "WebM (VP9)".to_string(),
            description: "开放格式，适合 Web 播放".to_string(),
            category: "convert".to_string(),
        },
        PresetInfo {
            id: "convert_mov_prores".to_string(),
            name: "MOV (ProRes)".to_string(),
            description: "专业编辑格式，适合 Final Cut Pro 等后期软件".to_string(),
            category: "convert".to_string(),
        },
        PresetInfo {
            id: "convert_copy".to_string(),
            name: "快速封装（不重新编码）".to_string(),
            description: "仅改变容器格式，速度极快，无质量损失".to_string(),
            category: "convert".to_string(),
        },
    ]
}

/// 获取视频压缩预设
fn get_compress_presets() -> Vec<PresetInfo> {
    vec![
        PresetInfo {
            id: "compress_social".to_string(),
            name: "社交媒体优化".to_string(),
            description: "适中文件大小，广泛兼容，适合微信/抖音/B站".to_string(),
            category: "compress".to_string(),
        },
        PresetInfo {
            id: "compress_wechat".to_string(),
            name: "微信朋友圈（25MB 限制）".to_string(),
            description: "压缩到 25MB 以内，适合微信分享".to_string(),
            category: "compress".to_string(),
        },
        PresetInfo {
            id: "compress_high_quality".to_string(),
            name: "高质量归档".to_string(),
            description: "接近无损质量，文件较大，适合长期保存".to_string(),
            category: "compress".to_string(),
        },
        PresetInfo {
            id: "compress_preview".to_string(),
            name: "快速预览".to_string(),
            description: "小文件低画质，适合快速预览和传输".to_string(),
            category: "compress".to_string(),
        },
        PresetInfo {
            id: "compress_bilibili".to_string(),
            name: "B站投稿优化".to_string(),
            description: "高码率上传，经 B 站二压后仍保持较好画质".to_string(),
            category: "compress".to_string(),
        },
        PresetInfo {
            id: "compress_youtube".to_string(),
            name: "YouTube 上传".to_string(),
            description: "YouTube 推荐参数，高码率高质量".to_string(),
            category: "compress".to_string(),
        },
    ]
}

/// 获取 GIF 制作预设
fn get_gif_presets() -> Vec<PresetInfo> {
    vec![
        PresetInfo {
            id: "gif_chat".to_string(),
            name: "聊天表情".to_string(),
            description: "320px 宽，10fps，小体积适合聊天发送".to_string(),
            category: "gif".to_string(),
        },
        PresetInfo {
            id: "gif_social".to_string(),
            name: "社交分享".to_string(),
            description: "480px 宽，12fps，适合微博/Twitter 分享".to_string(),
            category: "gif".to_string(),
        },
        PresetInfo {
            id: "gif_tutorial".to_string(),
            name: "教程演示".to_string(),
            description: "640px 宽，15fps，清晰展示操作步骤".to_string(),
            category: "gif".to_string(),
        },
        PresetInfo {
            id: "gif_high_quality".to_string(),
            name: "高质量".to_string(),
            description: "800px 宽，15fps，高清大图".to_string(),
            category: "gif".to_string(),
        },
    ]
}

/// 获取分辨率预设
fn get_resize_presets() -> Vec<PresetInfo> {
    vec![
        PresetInfo {
            id: "resize_4k".to_string(),
            name: "4K UHD (3840x2160)".to_string(),
            description: "超高清，适合大屏展示".to_string(),
            category: "resize".to_string(),
        },
        PresetInfo {
            id: "resize_1080p".to_string(),
            name: "1080p FHD (1920x1080)".to_string(),
            description: "全高清，最常用的分辨率".to_string(),
            category: "resize".to_string(),
        },
        PresetInfo {
            id: "resize_720p".to_string(),
            name: "720p HD (1280x720)".to_string(),
            description: "高清，文件较小".to_string(),
            category: "resize".to_string(),
        },
        PresetInfo {
            id: "resize_480p".to_string(),
            name: "480p SD (854x480)".to_string(),
            description: "标清，适合低带宽场景".to_string(),
            category: "resize".to_string(),
        },
        PresetInfo {
            id: "resize_vertical_1080".to_string(),
            name: "竖屏 1080p (1080x1920)".to_string(),
            description: "抖音/快手/Reels 竖屏格式".to_string(),
            category: "resize".to_string(),
        },
        PresetInfo {
            id: "resize_square_1080".to_string(),
            name: "正方形 1080 (1080x1080)".to_string(),
            description: "Instagram 正方形格式".to_string(),
            category: "resize".to_string(),
        },
    ]
}
