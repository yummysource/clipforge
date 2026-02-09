# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.3] - 2025-02-09

### Changed

- **App Logo** — Redesigned with cyberpunk-style film strip infinity motif, applied macOS-compliant squircle mask with standard padding
- **Favicon** — Added `public/favicon.png` and updated `index.html` reference from `vite.svg`
- **Version Management** — Added `scripts/bump-version.sh` to sync version across `package.json`, `tauri.conf.json`, and `Cargo.toml` in one command
- **Changelog** — Translated to English, added v0.1.1 and v0.1.2 entries

## [0.1.2] - 2025-02-09

### Added

- **i18n Support** — Full English/Chinese bilingual switching with 250+ translation keys covering all pages and components
- **Language Selector** — Added language picker in settings page, defaulting to English

### Changed

- Translated CONTRIBUTING.md to English
- Updated app screenshots

## [0.1.1] - 2025-02-08

### Fixed

- **Settings Overhaul** — Merged default output directory and same-as-source into a single toggle; empty `outputDirectory` now means same-as-source
- **Output Path** — All 9 feature pages now correctly respect the `outputDirectory` setting via `buildOutputPath()` utility
- **Overwrite Protection** — Timestamp-based filename deduplication when `overwriteExisting` is off, preventing silent overwrites
- **Open on Complete** — Implemented `reveal_in_finder` Rust command and wired it into `useTask` hook so `openOnComplete` actually works

### Changed

- Synced Rust `AppSettings` with frontend types (added serde defaults, removed orphan fields)
- Extracted `SettingSwitch` / `SettingRow` / `SectionTitle` components and deduplicated store helpers

## [0.1.0] - 2025-02-08

### Added

- **Format Conversion** — Convert between MP4 / MKV / MOV / WebM / AVI / TS / FLV with built-in presets for social media, web optimization, and high-quality archiving
- **Video Compression** — Light / Medium / Heavy compression presets with quality-level control
- **Trim & Cut** — Visual timeline selector with multi-segment extraction support
- **Merge & Concat** — Drag-and-drop reorder multiple videos, one-click merge
- **Audio Processing** — Extract audio (MP3/AAC/WAV/FLAC/OGG), replace audio track, adjust volume
- **Watermark** — Text and image watermarks with customizable position, size, and opacity
- **Resolution Adjustment** — 4K/2K/1080p/720p/480p/360p presets with Lanczos/Bicubic/Bilinear scaling algorithms
- **GIF Creator** — Convert video clips to GIF with adjustable frame rate, width, and dithering algorithm
- **Subtitle Processing** — Embed SRT/ASS/VTT subtitles, extract subtitles, adjust timeline offset
- **Video Download** — Download videos from YouTube / X (Twitter) / Instagram and more, auto-merge best audio and video streams
- **Settings** — Customizable output directory, FFmpeg path, and theme switching
- **Dark Mode** — Light / Dark theme toggle

### Technical

- Built with Tauri 2 + React 19 + TypeScript
- FFmpeg / FFprobe / yt-dlp bundled as Sidecar binaries
- Zustand for state management
- Tailwind CSS + Radix UI component library
- macOS (Apple Silicon) support

[0.1.3]: https://github.com/yummysource/clipforge/releases/tag/v0.1.3
[0.1.2]: https://github.com/yummysource/clipforge/releases/tag/v0.1.2
[0.1.1]: https://github.com/yummysource/clipforge/releases/tag/v0.1.1
[0.1.0]: https://github.com/yummysource/clipforge/releases/tag/v0.1.0
