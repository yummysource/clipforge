/**
 * @file 视频播放器控制 Hook
 * @description 封装 HTML5 video 元素的播放控制逻辑
 */
import { useState, useCallback, useRef, useEffect } from 'react';

/** 播放器状态 */
export interface VideoPlayerState {
  /** 是否正在播放 */
  isPlaying: boolean;
  /** 当前播放时间（秒） */
  currentTime: number;
  /** 视频总时长（秒） */
  duration: number;
  /** 当前音量 (0-1) */
  volume: number;
  /** 是否静音 */
  isMuted: boolean;
}

/** 视频播放器 Hook 返回值 */
export interface UseVideoPlayerReturn {
  /** video 元素 ref */
  videoRef: React.RefObject<HTMLVideoElement | null>;
  /** 当前播放器状态 */
  state: VideoPlayerState;
  /** 播放 */
  play: () => void;
  /** 暂停 */
  pause: () => void;
  /** 切换播放/暂停 */
  togglePlay: () => void;
  /** 跳转到指定时间 */
  seek: (time: number) => void;
  /** 设置音量 */
  setVolume: (vol: number) => void;
  /** 切换静音 */
  toggleMute: () => void;
  /** 向前跳帧（默认 1/30 秒） */
  stepForward: (fps?: number) => void;
  /** 向后跳帧（默认 1/30 秒） */
  stepBackward: (fps?: number) => void;
}

/**
 * 管理视频播放器控制的自定义 Hook
 *
 * 提供对 HTML5 video 元素的完整播放控制接口。
 * 通过 ref 绑定到 video 元素，自动同步播放状态。
 *
 * @param triggerKey - Optional dependency that triggers listener re-attachment.
 *   Pass the file path so that when the video element appears in the DOM
 *   (e.g. filePath changes from null to a value), the effect re-runs and
 *   correctly binds event listeners to the now-available video element.
 * @returns 播放器引用、状态和控制函数
 */
export function useVideoPlayer(triggerKey?: unknown): UseVideoPlayerReturn {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [state, setState] = useState<VideoPlayerState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    isMuted: false,
  });

  /* Bind video element event listeners.
   * Re-runs when triggerKey changes (typically filePath), ensuring listeners
   * are attached even when the <video> element is conditionally rendered. */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Reset state when source changes
    setState({
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      volume: video.volume,
      isMuted: video.muted,
    });

    /** 安全读取时长（过滤 NaN/Infinity） */
    const safeDuration = () => {
      const d = video.duration;
      return Number.isFinite(d) ? d : 0;
    };

    const onTimeUpdate = () => {
      setState((prev) => ({
        ...prev,
        currentTime: video.currentTime,
        // timeupdate 时也同步时长（兜底：某些协议下时长延迟可用）
        duration: safeDuration() || prev.duration,
      }));
    };
    const onDurationAvailable = () => {
      const d = safeDuration();
      if (d > 0) {
        setState((prev) => ({ ...prev, duration: d }));
      }
    };
    const onPlay = () => {
      setState((prev) => ({ ...prev, isPlaying: true }));
    };
    const onPause = () => {
      setState((prev) => ({ ...prev, isPlaying: false }));
    };
    const onVolumeChange = () => {
      setState((prev) => ({ ...prev, volume: video.volume, isMuted: video.muted }));
    };

    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('loadedmetadata', onDurationAvailable);
    video.addEventListener('durationchange', onDurationAvailable);
    video.addEventListener('loadeddata', onDurationAvailable);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('volumechange', onVolumeChange);

    // 如果 video 元素已经有 duration（事件在绑定前已触发），立即读取
    if (safeDuration() > 0) {
      setState((prev) => ({ ...prev, duration: safeDuration() }));
    }

    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('loadedmetadata', onDurationAvailable);
      video.removeEventListener('durationchange', onDurationAvailable);
      video.removeEventListener('loadeddata', onDurationAvailable);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('volumechange', onVolumeChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerKey]);

  const play = useCallback(() => { videoRef.current?.play(); }, []);
  const pause = useCallback(() => { videoRef.current?.pause(); }, []);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.paused ? video.play() : video.pause();
  }, []);

  /** 跳转到指定时间位置 */
  const seek = useCallback((time: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(time, video.duration || 0));
  }, []);

  /** 设置音量 (0-1) */
  const setVolume = useCallback((vol: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = Math.max(0, Math.min(1, vol));
  }, []);

  /** 切换静音状态 */
  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
  }, []);

  /** 向前跳一帧 */
  const stepForward = useCallback((fps: number = 30) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.min(video.currentTime + 1 / fps, video.duration || 0);
  }, []);

  /** 向后跳一帧 */
  const stepBackward = useCallback((fps: number = 30) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(video.currentTime - 1 / fps, 0);
  }, []);

  return {
    videoRef,
    state,
    play,
    pause,
    togglePlay,
    seek,
    setVolume,
    toggleMute,
    stepForward,
    stepBackward,
  };
}
