/**
 * @file Media preview component
 * @description Renders preview based on file type: video player for videos,
 * animated img for GIFs, audio player for audio files, and placeholder for others.
 */
import { useEffect } from 'react';
import { convertFileSrc } from '@tauri-apps/api/core';
import {
  Play, Pause, Volume2, VolumeX,
  SkipBack, SkipForward, Music, FileText,
} from 'lucide-react';
import { useVideoPlayer } from '@/hooks/useVideoPlayer';
import { formatDuration } from '@/lib/format';
import { useT } from '@/i18n';

/** File type categories for preview rendering */
type MediaType = 'video' | 'gif' | 'audio' | 'unsupported' | 'other';

/** Audio file extensions */
const AUDIO_EXTENSIONS = new Set(['mp3', 'aac', 'wav', 'flac', 'ogg', 'm4a', 'wma', 'opus']);

/** Subtitle / text file extensions that cannot be previewed */
const TEXT_EXTENSIONS = new Set(['srt', 'ass', 'vtt', 'ssa', 'sub', 'txt']);

/**
 * Video formats not supported by browser's native video tag
 * These formats can be converted by ffmpeg but cannot be previewed in browser
 */
const UNSUPPORTED_VIDEO_EXTENSIONS = new Set([
  'flv',  // Flash Video - requires Flash player
  'mkv',  // Matroska - not supported by HTML5 video
  'avi',  // AVI container - limited codec support
  'ts',   // MPEG-TS - streaming format, not for direct playback
  'wmv',  // Windows Media - proprietary format
  'm2ts', 'mts', // MPEG-2 TS variants
  'vob',  // DVD Video Object
  'f4v',  // Flash MP4
]);

/**
 * Determine media type from file extension
 *
 * @param filePath - Absolute file path
 * @returns The detected media type category
 */
function getMediaType(filePath: string): MediaType {
  const ext = filePath.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'gif') return 'gif';
  if (AUDIO_EXTENSIONS.has(ext)) return 'audio';
  if (TEXT_EXTENSIONS.has(ext)) return 'other';
  if (UNSUPPORTED_VIDEO_EXTENSIONS.has(ext)) return 'unsupported';
  return 'video';
}

/** VideoPreview component Props */
interface VideoPreviewProps {
  /** Local absolute path of the media file */
  filePath: string | null;
  /** Custom CSS class */
  className?: string;
}

/**
 * Media preview component
 *
 * Uses Tauri convertFileSrc to convert local paths to asset:// URLs.
 * Renders different UI based on file type:
 * - Video: full player with controls (play/pause, progress, volume, frame step)
 * - GIF: animated img tag with auto-play
 * - Audio: simple audio player with play/pause and progress
 * - Other (text/subtitle): placeholder icon
 *
 * @param props - File path and style config
 */
export function VideoPreview({ filePath, className }: VideoPreviewProps) {
  const t = useT();

  const mediaType = filePath ? getMediaType(filePath) : null;

  /** Only use video player hook for actual video files */
  const {
    videoRef,
    state,
    togglePlay,
    seek,
    toggleMute,
    stepForward,
    stepBackward,
  } = useVideoPlayer(mediaType === 'video' ? filePath : null);

  /** Convert local path to Tauri asset URL */
  const mediaSrc = filePath ? convertFileSrc(filePath) : '';

  /** Reset and reload video player when file path changes */
  useEffect(() => {
    const video = videoRef.current;
    if (video && filePath && mediaType === 'video') {
      video.load();
      const checkDuration = () => {
        if (video.duration && Number.isFinite(video.duration)) {
          video.dispatchEvent(new Event('durationchange'));
        }
      };
      const timer = setTimeout(checkDuration, 500);
      return () => clearTimeout(timer);
    }
  }, [filePath, videoRef, mediaType]);

  /** No file — show placeholder */
  if (!filePath) {
    return (
      <div
        className={`flex items-center justify-center rounded-xl ${className ?? ''}`}
        style={{
          backgroundColor: 'var(--color-bg-tertiary)',
          aspectRatio: '16/9',
          color: 'var(--color-text-placeholder)',
          fontSize: 'var(--font-size-sm)',
        }}
      >
        {t('file.selectFileToPreview')}
      </div>
    );
  }

  /** GIF preview — use <img> for native animated GIF support */
  if (mediaType === 'gif') {
    return (
      <div className={`flex flex-col rounded-xl overflow-hidden ${className ?? ''}`}
           style={{ backgroundColor: '#000' }}>
        <img
          src={mediaSrc}
          alt="GIF preview"
          className="w-full object-contain"
          style={{ maxHeight: '300px' }}
        />
      </div>
    );
  }

  /** Audio preview — simple player with icon */
  if (mediaType === 'audio') {
    return (
      <div className={`flex flex-col rounded-xl overflow-hidden ${className ?? ''}`}
           style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
        {/* Audio icon area */}
        <div
          className="flex items-center justify-center"
          style={{ aspectRatio: '16/9', color: 'var(--color-text-placeholder)' }}
        >
          <Music size={48} strokeWidth={1.5} />
        </div>
        {/* Native audio player */}
        <div className="px-3 py-2">
          <audio
            src={mediaSrc}
            controls
            className="w-full"
            style={{ height: '32px' }}
            preload="metadata"
          />
        </div>
      </div>
    );
  }

  /** Unsupported video format — show helpful message */
  if (mediaType === 'unsupported') {
    const fileName = filePath.split('/').pop() ?? '';
    const ext = fileName.split('.').pop()?.toUpperCase() ?? '';
    return (
      <div
        className={`flex flex-col items-center justify-center gap-3 rounded-xl p-6 ${className ?? ''}`}
        style={{
          backgroundColor: 'var(--color-bg-tertiary)',
          aspectRatio: '16/9',
          color: 'var(--color-text-secondary)',
          fontSize: 'var(--font-size-sm)',
        }}
      >
        <Play size={48} strokeWidth={1.5} style={{ color: 'var(--color-text-placeholder)' }} />
        <div className="text-center">
          <div style={{ color: 'var(--color-text-primary)', fontWeight: 500, marginBottom: '4px' }}>
            {t('preview.unsupportedFormat')}
          </div>
          <div style={{ fontSize: 'var(--font-size-xs)' }}>
            {t('preview.unsupportedFormatDesc', { format: ext })}
          </div>
        </div>
        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-placeholder)' }}>
          {fileName}
        </div>
      </div>
    );
  }

  /** Other (subtitle/text) — non-previewable placeholder */
  if (mediaType === 'other') {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-2 rounded-xl ${className ?? ''}`}
        style={{
          backgroundColor: 'var(--color-bg-tertiary)',
          aspectRatio: '16/9',
          color: 'var(--color-text-placeholder)',
          fontSize: 'var(--font-size-sm)',
        }}
      >
        <FileText size={36} strokeWidth={1.5} />
        <span>{filePath.split('/').pop()}</span>
      </div>
    );
  }

  /** Video preview — full player with controls */
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    seek(ratio * state.duration);
  };

  const progressPercent = state.duration > 0 ? (state.currentTime / state.duration) * 100 : 0;

  return (
    <div className={`flex flex-col rounded-xl overflow-hidden ${className ?? ''}`}
         style={{ backgroundColor: '#000' }}>
      {/* Video element */}
      <video
        ref={videoRef}
        src={mediaSrc}
        className="w-full aspect-video object-contain"
        onClick={togglePlay}
        preload="metadata"
      />

      {/* Playback controls */}
      <div className="flex flex-col gap-1 px-3 py-2"
           style={{ backgroundColor: 'var(--player-controls-bg)' }}>
        {/* Progress bar */}
        <div
          className="w-full h-1.5 rounded-full cursor-pointer group"
          style={{ backgroundColor: 'var(--progress-bg)' }}
          onClick={handleProgressClick}
        >
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${progressPercent}%`,
              backgroundColor: 'var(--color-accent)',
            }}
          />
        </div>

        {/* Control buttons row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Step backward */}
            <button onClick={() => stepBackward()} className="p-1 text-white/80 hover:text-white cursor-pointer">
              <SkipBack size={14} />
            </button>
            {/* Play/Pause */}
            <button onClick={togglePlay} className="p-1 text-white/80 hover:text-white cursor-pointer">
              {state.isPlaying ? <Pause size={16} /> : <Play size={16} />}
            </button>
            {/* Step forward */}
            <button onClick={() => stepForward()} className="p-1 text-white/80 hover:text-white cursor-pointer">
              <SkipForward size={14} />
            </button>
            {/* Mute toggle */}
            <button onClick={toggleMute} className="p-1 text-white/80 hover:text-white cursor-pointer">
              {state.isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>
          </div>

          {/* Time display */}
          <span className="text-xs text-white/70">
            {formatDuration(state.currentTime)} / {formatDuration(state.duration)}
          </span>
        </div>
      </div>
    </div>
  );
}
