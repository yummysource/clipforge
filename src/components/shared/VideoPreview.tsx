/**
 * @file 视频预览播放器组件
 * @description 内嵌视频播放器，支持播放控制、进度条、音量调节
 */
import { useEffect } from 'react';
import { convertFileSrc } from '@tauri-apps/api/core';
import {
  Play, Pause, Volume2, VolumeX,
  SkipBack, SkipForward,
} from 'lucide-react';
import { useVideoPlayer } from '@/hooks/useVideoPlayer';
import { formatDuration } from '@/lib/format';
import { useT } from '@/i18n';

/** VideoPreview 组件 Props */
interface VideoPreviewProps {
  /** 视频文件的本地绝对路径 */
  filePath: string | null;
  /** 自定义 CSS class */
  className?: string;
}

/**
 * 视频预览播放器组件
 *
 * 使用 Tauri convertFileSrc 将本地路径转为 asset:// URL。
 * 内置播放控制栏：播放/暂停、进度条、时间显示、逐帧前进/后退、音量控制。
 *
 * @param props - 视频路径和样式配置
 */
export function VideoPreview({ filePath, className }: VideoPreviewProps) {
  const t = useT();
  const {
    videoRef,
    state,
    togglePlay,
    seek,
    toggleMute,
    stepForward,
    stepBackward,
  } = useVideoPlayer();

  /** 将本地路径转为 Tauri asset URL */
  const videoSrc = filePath ? convertFileSrc(filePath) : '';

  /** 文件路径变化时重置播放器并重新加载 */
  useEffect(() => {
    const video = videoRef.current;
    if (video && filePath) {
      video.load();
      // 某些协议下 load() 后 duration 延迟可用，轮询兜底
      const checkDuration = () => {
        if (video.duration && Number.isFinite(video.duration)) {
          video.dispatchEvent(new Event('durationchange'));
        }
      };
      const timer = setTimeout(checkDuration, 500);
      return () => clearTimeout(timer);
    }
  }, [filePath, videoRef]);

  /** 无文件时显示占位 */
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

  /** 进度条点击跳转 */
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    seek(ratio * state.duration);
  };

  const progressPercent = state.duration > 0 ? (state.currentTime / state.duration) * 100 : 0;

  return (
    <div className={`flex flex-col rounded-xl overflow-hidden ${className ?? ''}`}
         style={{ backgroundColor: '#000' }}>
      {/* 视频画面 */}
      <video
        ref={videoRef}
        src={videoSrc}
        className="w-full aspect-video object-contain"
        onClick={togglePlay}
        preload="metadata"
      />

      {/* 播放控制栏 */}
      <div className="flex flex-col gap-1 px-3 py-2"
           style={{ backgroundColor: 'var(--player-controls-bg)' }}>
        {/* 进度条 */}
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

        {/* 控制按钮行 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* 逐帧后退 */}
            <button onClick={() => stepBackward()} className="p-1 text-white/80 hover:text-white cursor-pointer">
              <SkipBack size={14} />
            </button>
            {/* 播放/暂停 */}
            <button onClick={togglePlay} className="p-1 text-white/80 hover:text-white cursor-pointer">
              {state.isPlaying ? <Pause size={16} /> : <Play size={16} />}
            </button>
            {/* 逐帧前进 */}
            <button onClick={() => stepForward()} className="p-1 text-white/80 hover:text-white cursor-pointer">
              <SkipForward size={14} />
            </button>
            {/* 静音切换 */}
            <button onClick={toggleMute} className="p-1 text-white/80 hover:text-white cursor-pointer">
              {state.isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>
          </div>

          {/* 时间显示 */}
          <span className="text-xs text-white/70">
            {formatDuration(state.currentTime)} / {formatDuration(state.duration)}
          </span>
        </div>
      </div>
    </div>
  );
}
