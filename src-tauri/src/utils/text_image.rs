/// Text-to-PNG image renderer
///
/// Renders text with optional border/outline onto a transparent PNG image.
/// Used as a fallback for text watermarks when ffmpeg's drawtext filter
/// is unavailable (requires libfreetype which the bundled ffmpeg lacks).
///
/// The rendered PNG is then overlaid onto the video using ffmpeg's overlay filter,
/// achieving the same visual result as drawtext without the library dependency.

use ab_glyph::{Font, FontRef, PxScale, ScaleFont};
use image::{ImageBuffer, Rgba, RgbaImage};
use std::path::PathBuf;

/// macOS system font search paths (in priority order)
/// Hiragino Sans GB has excellent CJK coverage for Chinese text
const FONT_SEARCH_PATHS: &[&str] = &[
    "/System/Library/Fonts/Hiragino Sans GB.ttc",
    "/System/Library/Fonts/STHeiti Medium.ttc",
    "/System/Library/Fonts/AppleSDGothicNeo.ttc",
    "/System/Library/Fonts/Helvetica.ttc",
    "/System/Library/Fonts/HelveticaNeue.ttc",
];

/// Render text to a transparent PNG file
///
/// Creates a temporary PNG image with the specified text rendered on a
/// fully transparent background. Supports CJK characters via macOS system fonts.
/// Optionally renders a colored border/outline around the text for readability.
///
/// @param text - The text content to render
/// @param font_size - Font size in pixels
/// @param font_color_hex - Font color as hex string (e.g. "#FFFFFF")
/// @param border_width - Border/outline width in pixels (0 = no border)
/// @param border_color_hex - Border color as hex string (e.g. "#000000")
/// @returns Path to the generated temporary PNG file
pub fn render_text_to_png(
    text: &str,
    font_size: u32,
    font_color_hex: &str,
    border_width: u32,
    border_color_hex: &str,
) -> Result<PathBuf, String> {
    // Load the first available system font
    let font = load_system_font()?;
    let scale = PxScale::from(font_size as f32);
    let scaled_font = font.as_scaled(scale);

    // Measure text dimensions by summing glyph advances
    let (text_width, text_height) = measure_text(&scaled_font, text);

    // Add padding for border and a small margin
    let padding = border_width as i32 + 2;
    let img_width = (text_width as i32 + padding * 2).max(1) as u32;
    let img_height = (text_height as i32 + padding * 2).max(1) as u32;

    // Create transparent RGBA image
    let mut img: RgbaImage = ImageBuffer::from_pixel(img_width, img_height, Rgba([0, 0, 0, 0]));

    // Parse colors
    let font_color = parse_hex_color(font_color_hex);
    let border_color = parse_hex_color(border_color_hex);

    // Baseline offset: place text starting at padding, vertically centered
    let base_x = padding;
    let base_y = padding + scaled_font.ascent() as i32;

    // Render border/outline by drawing text at 8 cardinal offsets
    if border_width > 0 {
        let bw = border_width as i32;
        let offsets: [(i32, i32); 8] = [
            (-bw, 0),
            (bw, 0),
            (0, -bw),
            (0, bw),
            (-bw, -bw),
            (-bw, bw),
            (bw, -bw),
            (bw, bw),
        ];
        for (dx, dy) in &offsets {
            draw_text_on_image(
                &mut img,
                &scaled_font,
                text,
                base_x + dx,
                base_y + dy,
                border_color,
            );
        }
    }

    // Render main text on top of the border
    draw_text_on_image(&mut img, &scaled_font, text, base_x, base_y, font_color);

    // Save to a temporary PNG file
    let temp_dir = std::env::temp_dir();
    let temp_path = temp_dir.join(format!("clipforge_text_{}.png", uuid::Uuid::new_v4()));
    img.save(&temp_path)
        .map_err(|e| format!("Failed to save text image: {}", e))?;

    Ok(temp_path)
}

/// Load the first available macOS system font
///
/// Searches through FONT_SEARCH_PATHS and returns the first font
/// that can be successfully loaded. TTC files are loaded with index 0.
fn load_system_font() -> Result<FontRef<'static>, String> {
    for path in FONT_SEARCH_PATHS {
        if let Ok(data) = std::fs::read(path) {
            // Leak the data to get a 'static lifetime (acceptable for font data loaded once)
            let data: &'static [u8] = Box::leak(data.into_boxed_slice());
            // Try loading with collection index 0 (first face in TTC)
            if let Ok(font) = FontRef::try_from_slice_and_index(data, 0) {
                return Ok(font);
            }
            // Fallback: try without index (for single-font files)
            if let Ok(font) = FontRef::try_from_slice(data) {
                return Ok(font);
            }
        }
    }
    Err(
        "No suitable system font found. Checked: Hiragino Sans GB, STHeiti, Helvetica".to_string(),
    )
}

/// Measure the total pixel dimensions of a text string
///
/// Calculates width from the sum of horizontal advances of all glyphs,
/// and height from the font's ascent + descent metrics.
///
/// @param font - Scaled font reference
/// @param text - Text to measure
/// @returns (width, height) in pixels
fn measure_text(font: &ab_glyph::PxScaleFont<&FontRef<'static>>, text: &str) -> (u32, u32) {
    let mut total_width: f32 = 0.0;
    let mut prev_glyph_id = None;

    for ch in text.chars() {
        let glyph_id = font.glyph_id(ch);

        // Add kerning between consecutive glyphs
        if let Some(prev) = prev_glyph_id {
            total_width += font.kern(prev, glyph_id);
        }

        total_width += font.h_advance(glyph_id);
        prev_glyph_id = Some(glyph_id);
    }

    let height = font.ascent() - font.descent();
    (total_width.ceil() as u32, height.ceil() as u32)
}

/// Draw text onto an RGBA image at the specified position
///
/// Rasterizes each glyph and composites it onto the image with alpha blending.
/// Uses the font's coverage values for anti-aliased rendering.
///
/// @param img - Target RGBA image buffer
/// @param font - Scaled font reference
/// @param text - Text to render
/// @param start_x - X offset for the first glyph (pixels from left)
/// @param baseline_y - Y position of the text baseline (pixels from top)
/// @param color - RGBA color for the text
fn draw_text_on_image(
    img: &mut RgbaImage,
    font: &ab_glyph::PxScaleFont<&FontRef<'static>>,
    text: &str,
    start_x: i32,
    baseline_y: i32,
    color: Rgba<u8>,
) {
    let mut cursor_x: f32 = start_x as f32;
    let mut prev_glyph_id = None;

    for ch in text.chars() {
        let glyph_id = font.glyph_id(ch);

        // Apply kerning
        if let Some(prev) = prev_glyph_id {
            cursor_x += font.kern(prev, glyph_id);
        }

        // Position the glyph at the current cursor
        let glyph = glyph_id.with_scale_and_position(
            font.scale(),
            ab_glyph::point(cursor_x, baseline_y as f32),
        );

        // Rasterize and draw the glyph outline
        if let Some(outlined) = font.outline_glyph(glyph) {
            let bounds = outlined.px_bounds();
            outlined.draw(|px, py, coverage| {
                let x = (bounds.min.x as i32 + px as i32) as u32;
                let y = (bounds.min.y as i32 + py as i32) as u32;

                if x < img.width() && y < img.height() {
                    let alpha = (coverage * color[3] as f32) as u8;
                    if alpha > 0 {
                        // Alpha-blend the glyph pixel onto the image
                        let dst = img.get_pixel(x, y);
                        let blended = alpha_blend(color, alpha, *dst);
                        img.put_pixel(x, y, blended);
                    }
                }
            });
        }

        cursor_x += font.h_advance(glyph_id);
        prev_glyph_id = Some(glyph_id);
    }
}

/// Alpha-blend a source color (with coverage alpha) onto a destination pixel
///
/// Uses the standard "over" compositing operation:
/// result = src * src_alpha + dst * (1 - src_alpha)
fn alpha_blend(src: Rgba<u8>, src_alpha: u8, dst: Rgba<u8>) -> Rgba<u8> {
    let sa = src_alpha as f32 / 255.0;
    let da = dst[3] as f32 / 255.0;

    // "Over" operator
    let out_a = sa + da * (1.0 - sa);
    if out_a < 0.001 {
        return Rgba([0, 0, 0, 0]);
    }

    let blend = |s: u8, d: u8| -> u8 {
        ((s as f32 * sa + d as f32 * da * (1.0 - sa)) / out_a).round() as u8
    };

    Rgba([
        blend(src[0], dst[0]),
        blend(src[1], dst[1]),
        blend(src[2], dst[2]),
        (out_a * 255.0).round() as u8,
    ])
}

/// Parse a hex color string to RGBA
///
/// Supports formats: "#RRGGBB", "RRGGBB", "#RGB"
/// Returns fully opaque color (alpha = 255)
///
/// @param hex - Hex color string (e.g. "#FF0000" for red)
/// @returns RGBA pixel value
fn parse_hex_color(hex: &str) -> Rgba<u8> {
    let hex = hex.trim_start_matches('#');
    let (r, g, b) = match hex.len() {
        6 => (
            u8::from_str_radix(&hex[0..2], 16).unwrap_or(255),
            u8::from_str_radix(&hex[2..4], 16).unwrap_or(255),
            u8::from_str_radix(&hex[4..6], 16).unwrap_or(255),
        ),
        3 => {
            // Short form: #RGB → #RRGGBB
            let r = u8::from_str_radix(&hex[0..1], 16).unwrap_or(15);
            let g = u8::from_str_radix(&hex[1..2], 16).unwrap_or(15);
            let b = u8::from_str_radix(&hex[2..3], 16).unwrap_or(15);
            (r * 17, g * 17, b * 17)
        }
        _ => (255, 255, 255), // Default to white
    };
    Rgba([r, g, b, 255])
}

/// Clean up a temporary text image file
///
/// Called after ffmpeg has finished processing to remove the generated PNG.
/// Silently ignores errors (file may have already been cleaned up).
///
/// @param path - Path to the temporary PNG file
pub fn cleanup_text_image(path: &std::path::Path) {
    let _ = std::fs::remove_file(path);
}
