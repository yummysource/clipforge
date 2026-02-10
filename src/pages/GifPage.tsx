/**
 * @file GIF 制作页面
 * @description 视频转 GIF 动图功能页面，支持时间选择和 GIF 参数配置
 */
import { useState, useCallback } from 'react';
import { FeatureLayout } from '@/components/layout/FeatureLayout';
import { TimelineSelector, type TimeSegment } from '@/components/shared/TimelineSelector';
import { useTask } from '@/hooks/useTask';
import { useAppStore } from '@/stores/useAppStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { createGif } from '@/services/ffmpeg';
import { FRAME_RATE_PRESETS, GIF_DITHER_ALGORITHMS } from '@/lib/constants';
import { generateOutputName } from '@/lib/format';
import { buildOutputPath } from '@/lib/output';
import { useT } from '@/i18n';

/**
 * GIF 制作页面组件
 *
 * 功能特点：
 * - 时间轴选择 GIF 片段范围
 * - 宽度和帧率设置
 * - 色彩质量和抖动算法
 * - 循环设置
 * - 预估文件大小
 */
export function GifPage() {
  const t = useT();
  const { status, progress, result, error, execute, cancel, reset } = useTask('gif');
  const files = useAppStore((s) => s.files);
  const selectedIndex = useAppStore((s) => s.selectedFileIndex);
  const clearFiles = useAppStore((s) => s.clearFiles);
  const outputSuffix = useSettingsStore((s) => s.outputSuffix);

  /* 参数状态 */
  const [segments, setSegments] = useState<TimeSegment[]>([
    { id: '1', start: 0, end: 0 },
  ]);
  const [gifWidth, setGifWidth] = useState(480);
  const [gifFps, setGifFps] = useState(15);
  const [loopCount, setLoopCount] = useState(0);
  const [dither, setDither] = useState('floyd_steinberg');

  const currentFile = files[selectedIndex];
  const duration = currentFile?.mediaInfo?.duration ?? 0;

  /* 初始化片段 */
  if (segments[0].end === 0 && duration > 0) {
    setSegments([{ id: '1', start: 0, end: Math.min(duration, 10) }]);
  }

  /** 计算 GIF 时长 */
  const gifDuration = segments[0].end - segments[0].start;

  /** 开始制作 */
  const handleStart = useCallback(() => {
    if (!currentFile) return;

    const outputName = generateOutputName(currentFile.name, outputSuffix, 'gif');

    execute(createGif, {
      inputPath: currentFile.path,
      outputPath: buildOutputPath(currentFile.path, outputName),
      startTime: segments[0].start,
      duration: gifDuration,
      width: gifWidth,
      fps: gifFps,
      loopCount,
      dither,
    });
  }, [currentFile, segments, gifDuration, gifWidth, gifFps, loopCount, dither, outputSuffix, execute]);

  const handleReset = useCallback(() => {
    reset();
    clearFiles();
    setSegments([{ id: '1', start: 0, end: 0 }]);
  }, [reset, clearFiles]);

  return (
    <FeatureLayout
      title={t('features.gif.name')}
      description={t('features.gif.description')}
      taskStatus={status}
      taskProgress={progress}
      taskError={error}
      onStart={handleStart}
      onCancel={cancel}
      onReset={handleReset}
      taskResult={result}
      startLabel={t('gif.generateGif')}
    >
      {/* 时间轴选择器 */}
      <TimelineSelector
        duration={duration}
        segments={segments}
        onSegmentsChange={setSegments}
        className="mb-6"
      />

      {/* GIF 宽度 */}
      <div className="mb-4">
        <label className="block mb-2 font-medium text-sm" style={{ color: 'var(--color-text-primary)' }}>
          {t('gif.outputWidth', { value: gifWidth })}
        </label>
        <input type="range" min={120} max={1280} step={10} value={gifWidth}
          onChange={(e) => setGifWidth(Number(e.target.value))}
          className="w-full" style={{ accentColor: 'var(--color-accent)' }} />
        <div className="flex justify-between mt-1"
          style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
          <span>120px</span><span>1280px</span>
        </div>
      </div>

      {/* 帧率选择 */}
      <div className="mb-4">
        <label className="block mb-2 font-medium text-sm" style={{ color: 'var(--color-text-primary)' }}>
          {t('gif.fps')}
        </label>
        <div className="flex flex-wrap gap-2">
          {FRAME_RATE_PRESETS.filter((p) => p.value <= 30).map((preset) => (
            <button key={preset.value} onClick={() => setGifFps(preset.value)}
              className="px-3 py-1.5 rounded-lg cursor-pointer"
              style={{
                fontSize: 'var(--font-size-sm)',
                backgroundColor: gifFps === preset.value ? 'var(--color-accent)' : 'var(--color-bg-tertiary)',
                color: gifFps === preset.value ? 'var(--color-text-inverse)' : 'var(--color-text-primary)',
                border: '1px solid var(--color-border)',
              }}>
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* 抖动算法 */}
      <div className="mb-4">
        <label className="block mb-2 font-medium text-sm" style={{ color: 'var(--color-text-primary)' }}>
          {t('gif.ditherAlgorithm')}
        </label>
        <select value={dither} onChange={(e) => setDither(e.target.value)}
          className="w-full px-3 py-2 rounded-lg"
          style={{ backgroundColor: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', fontSize: 'var(--font-size-sm)' }}>
          {GIF_DITHER_ALGORITHMS.map((a) => (
            <option key={a.value} value={a.value}>{a.label} - {t(a.descKey as any)}</option>
          ))}
        </select>
      </div>

      {/* 循环设置 */}
      <div className="flex items-center justify-between mb-6">
        <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{t('gif.infiniteLoop')}</span>
        <button
          onClick={() => setLoopCount(loopCount === 0 ? -1 : 0)}
          className="relative w-10 h-6 rounded-full transition-colors cursor-pointer"
          style={{
            backgroundColor: loopCount === 0 ? 'var(--color-accent)' : 'var(--color-bg-tertiary)',
            border: '1px solid var(--color-border)',
          }}>
          <span className="absolute top-0.5 w-4 h-4 rounded-full transition-transform"
            style={{
              left: loopCount === 0 ? '20px' : '2px',
              backgroundColor: loopCount === 0 ? 'white' : 'var(--color-text-placeholder)',
            }} />
        </button>
      </div>

      {/* 预估信息 */}
      <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--color-bg-tertiary)', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
        <p>{t('gif.gifInfo', { duration: gifDuration.toFixed(1), frames: Math.ceil(gifDuration * gifFps) })}</p>
      </div>
    </FeatureLayout>
  );
}
