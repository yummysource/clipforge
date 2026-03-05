/**
 * @file 裁剪剪切页面（锚点式分割版本）
 * @description 用户在时间轴放置锚点分割视频，选择保留哪些片段，拖动锚点时实时预览。
 *
 * 数据流：
 * - VideoPreview (内嵌于 FeatureLayout) → onSeekReady → seekRef
 * - SplitTimeline → onSeek → seekRef.current(time)
 * - anchors + segmentIncluded → computeSegments() → ffmpeg segments
 */
import { useState, useCallback, useRef } from 'react';
import { FeatureLayout } from '@/components/layout/FeatureLayout';
import { SplitTimeline, type Anchor } from '@/components/shared/SplitTimeline';
import { useTask } from '@/hooks/useTask';
import { useAppStore } from '@/stores/useAppStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { trimVideo } from '@/services/ffmpeg';
import { generateOutputName } from '@/lib/format';
import { buildOutputPath } from '@/lib/output';
import { useT } from '@/i18n';

/**
 * 裁剪剪切页面组件（锚点式分割）
 *
 * 功能特点：
 * - 时间轴上放置倒三角锚点来精确分割视频
 * - 每段可独立选择「保留」或「跳过」
 * - 拖动锚点时右侧视频实时 seek 到对应帧
 * - 精确切割（重编码）开关
 * - 至少保留一段才能开始处理
 */
export function TrimPage() {
  const { status, progress, result, error, execute, cancel, reset } = useTask('trim');
  const files = useAppStore((s) => s.files);
  const selectedIndex = useAppStore((s) => s.selectedFileIndex);
  const clearFiles = useAppStore((s) => s.clearFiles);
  const outputSuffix = useSettingsStore((s) => s.outputSuffix);
  const t = useT();

  const currentFile = files[selectedIndex];
  const duration = currentFile?.mediaInfo?.duration ?? 0;
  /** 视频帧率，用于时间轴帧格式显示；无视频流时 fallback 到 undefined */
  const fps = currentFile?.mediaInfo?.videoStreams[0]?.frameRate;

  /** 锚点列表（空 = 无分割，整段视频） */
  const [anchors, setAnchors] = useState<Anchor[]>([]);

  /** 每段的保留状态（长度 = anchors.length + 1），初始为整段保留 */
  const [segmentIncluded, setSegmentIncluded] = useState<boolean[]>([true]);

  /** 是否启用精确切割（重编码，帧级精确但较慢） */
  const [preciseCut, setPreciseCut] = useState(false);

  /** 多段时是否合并为单文件（false = 拆分为独立文件，默认） */
  const [mergeSegments, setMergeSegments] = useState(false);

  /**
   * seek 函数 ref，由 VideoPreview 通过 FeatureLayout.onVideoSeekReady 注入。
   * 使用 ref 而非 state，避免注入时触发不必要的重渲染。
   */
  const seekRef = useRef<((time: number) => void) | null>(null);

  /**
   * 接收 VideoPreview 注入的 seek 函数，存入 ref
   *
   * @param seekFn - 视频播放器的 seek 函数
   */
  const handleVideoSeekReady = useCallback((seekFn: (time: number) => void) => {
    seekRef.current = seekFn;
  }, []);

  /**
   * 传给 SplitTimeline 的 seek 回调，稳定引用（通过 ref 读取最新 seek 函数）。
   * 使用 useCallback 避免每次渲染产生新函数引用，减少 SplitTimeline 不必要的重渲染。
   */
  const handleSeek = useCallback((time: number) => {
    seekRef.current?.(time);
  }, []);

  /**
   * 计算最终要传给 ffmpeg 的片段列表（仅 included=true 的段）
   *
   * @returns 过滤后的 start/end 片段数组
   */
  const computeSegments = useCallback(() => {
    const sorted = [...anchors].sort((a, b) => a.time - b.time);
    const points = [0, ...sorted.map((a) => a.time), duration];
    return points
      .slice(0, -1)
      .map((start, i) => ({ start, end: points[i + 1] }))
      .filter((_, i) => segmentIncluded[i] ?? true);
  }, [anchors, segmentIncluded, duration]);

  /**
   * 开始处理：将保留的片段提交给 ffmpeg trimVideo
   */
  const handleStart = useCallback(() => {
    if (!currentFile) return;
    const segments = computeSegments();
    if (segments.length === 0) return; // 至少保留一段，防御性检查
    execute(trimVideo, {
      inputPath: currentFile.path,
      outputPath: buildOutputPath(
        currentFile.path,
        generateOutputName(currentFile.name, outputSuffix),
      ),
      segments,
      preciseCut,
      mergeSegments,
    });
  }, [currentFile, computeSegments, preciseCut, mergeSegments, outputSuffix, execute]);

  /**
   * 全量重置：清除文件、任务状态、锚点和片段状态
   */
  const handleReset = useCallback(() => {
    reset();
    clearFiles();
    setAnchors([]);
    setSegmentIncluded([true]);
    setMergeSegments(false);
  }, [reset, clearFiles]);

  /** 当前保留的段数，用于判断开始按钮是否可用 */
  const keptCount = segmentIncluded.filter(Boolean).length;
  const startDisabled = keptCount === 0;

  return (
    <FeatureLayout
      title={t('features.trim.name')}
      description={t('features.trim.description')}
      taskStatus={status}
      taskProgress={progress}
      taskError={error}
      onStart={handleStart}
      onCancel={cancel}
      onReset={handleReset}
      taskResult={result}
      startDisabled={startDisabled}
      onVideoSeekReady={handleVideoSeekReady}
    >
      {/* 锚点式分割时间轴 */}
      <SplitTimeline
        duration={duration}
        anchors={anchors}
        segmentIncluded={segmentIncluded}
        onAnchorsChange={setAnchors}
        onSegmentIncludedChange={setSegmentIncluded}
        onSeek={handleSeek}
        fps={fps}
        className="mb-6"
      />

      {/* 全部跳过时的警告提示 */}
      {startDisabled && duration > 0 && (
        <p
          style={{
            fontSize: 'var(--font-size-xs)',
            color: 'var(--color-error)',
            marginBottom: '8px',
          }}
        >
          {t('trim.allSegmentsSkipped')}
        </p>
      )}

      {/* 合并/拆分开关：仅当存在锚点（多段）时显示 */}
      {anchors.length > 0 && (
        <div className="flex items-center justify-between mb-4">
          <div>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)' }}>
              {t('trim.mergeSegments')}
            </p>
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
              {t('trim.mergeSegmentsDesc')}
            </p>
          </div>
          <button
            onClick={() => setMergeSegments(!mergeSegments)}
            className="relative w-10 h-6 rounded-full transition-colors cursor-pointer"
            style={{
              backgroundColor: mergeSegments ? 'var(--color-accent)' : 'var(--color-bg-tertiary)',
              border: '1px solid var(--color-border)',
            }}
          >
            <span
              className="absolute top-0.5 w-4 h-4 rounded-full transition-transform"
              style={{
                left: mergeSegments ? '20px' : '2px',
                backgroundColor: mergeSegments ? 'white' : 'var(--color-text-placeholder)',
              }}
            />
          </button>
        </div>
      )}

      {/* 精确切割开关 */}
      <div className="flex items-center justify-between">
        <div>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)' }}>
            {t('trim.preciseCut')}
          </p>
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
            {t('trim.preciseCutDesc')}
          </p>
        </div>
        <button
          onClick={() => setPreciseCut(!preciseCut)}
          className="relative w-10 h-6 rounded-full transition-colors cursor-pointer"
          style={{
            backgroundColor: preciseCut ? 'var(--color-accent)' : 'var(--color-bg-tertiary)',
            border: '1px solid var(--color-border)',
          }}
        >
          <span
            className="absolute top-0.5 w-4 h-4 rounded-full transition-transform"
            style={{
              left: preciseCut ? '20px' : '2px',
              backgroundColor: preciseCut ? 'white' : 'var(--color-text-placeholder)',
            }}
          />
        </button>
      </div>
    </FeatureLayout>
  );
}
