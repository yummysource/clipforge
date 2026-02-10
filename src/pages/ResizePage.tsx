/**
 * @file 分辨率/帧率调整页面
 * @description 分辨率和帧率调整功能页面，支持预设分辨率和自定义值
 */
import { useState, useCallback } from 'react';
import { FeatureLayout } from '@/components/layout/FeatureLayout';
import { useTask } from '@/hooks/useTask';
import { useAppStore } from '@/stores/useAppStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { resizeVideo } from '@/services/ffmpeg';
import { RESOLUTION_PRESETS, FRAME_RATE_PRESETS, SCALE_ALGORITHMS } from '@/lib/constants';
import { generateOutputName } from '@/lib/format';
import { buildOutputPath } from '@/lib/output';
import { useT } from '@/i18n';

/**
 * 分辨率/帧率调整页面组件
 *
 * 功能特点：
 * - 预设分辨率快捷选择（4K/1080p/720p 等）
 * - 自定义宽高，可锁定比例
 * - 帧率调整
 * - 缩放算法选择
 * - 画面比例适应模式（裁剪/加黑边/拉伸）
 */
export function ResizePage() {
  const t = useT();
  const { status, progress, result, error, execute, cancel, reset } = useTask('resize');
  const files = useAppStore((s) => s.files);
  const selectedIndex = useAppStore((s) => s.selectedFileIndex);
  const clearFiles = useAppStore((s) => s.clearFiles);
  const outputSuffix = useSettingsStore((s) => s.outputSuffix);

  /* 参数状态 */
  const [width, setWidth] = useState(1920);
  const [height, setHeight] = useState(1080);
  const [keepAspectRatio, setKeepAspectRatio] = useState(true);
  const [fps, setFps] = useState<number | null>(null);
  const [scaleAlgorithm, setScaleAlgorithm] = useState('lanczos');
  const [aspectMode, setAspectMode] = useState('crop');

  /** 选择预设分辨率 */
  const selectResolution = useCallback((w: number, h: number) => {
    setWidth(w);
    setHeight(h);
  }, []);

  /** 开始处理 */
  const handleStart = useCallback(() => {
    const file = files[selectedIndex];
    if (!file) return;

    const outputName = generateOutputName(file.name, outputSuffix);

    execute(resizeVideo, {
      inputPath: file.path,
      outputPath: buildOutputPath(file.path, outputName),
      width,
      height,
      keepAspectRatio,
      scaleAlgorithm,
      fps: fps ?? undefined,
      aspectMode,
    });
  }, [files, selectedIndex, width, height, keepAspectRatio, fps, scaleAlgorithm, aspectMode, outputSuffix, execute]);

  const handleReset = useCallback(() => {
    reset();
    clearFiles();
  }, [reset, clearFiles]);

  return (
    <FeatureLayout
      title={t('features.resize.name')}
      description={t('features.resize.description')}
      taskStatus={status}
      taskProgress={progress}
      taskError={error}
      onStart={handleStart}
      onCancel={cancel}
      onReset={handleReset}
      taskResult={result}
    >
      {/* 预设分辨率 */}
      <div className="mb-6">
        <label className="block mb-2 font-medium text-sm" style={{ color: 'var(--color-text-primary)' }}>
          {t('resize.presetResolution')}
        </label>
        <div className="flex flex-wrap gap-2">
          {RESOLUTION_PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => selectResolution(preset.width, preset.height)}
              className="px-3 py-1.5 rounded-lg cursor-pointer"
              style={{
                fontSize: 'var(--font-size-sm)',
                backgroundColor: width === preset.width && height === preset.height
                  ? 'var(--color-accent)' : 'var(--color-bg-tertiary)',
                color: width === preset.width && height === preset.height
                  ? 'var(--color-text-inverse)' : 'var(--color-text-primary)',
                border: '1px solid var(--color-border)',
              }}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* 自定义分辨率 */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1">
          <label className="block mb-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{t('resize.width')}</label>
          <input type="number" value={width} onChange={(e) => setWidth(Number(e.target.value))}
            min={16} max={7680}
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{ backgroundColor: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }} />
        </div>
        <span className="mt-5" style={{ color: 'var(--color-text-placeholder)' }}>x</span>
        <div className="flex-1">
          <label className="block mb-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{t('resize.height')}</label>
          <input type="number" value={height} onChange={(e) => setHeight(Number(e.target.value))}
            min={16} max={4320}
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{ backgroundColor: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }} />
        </div>
      </div>

      {/* 保持比例开关 */}
      <div className="flex items-center justify-between mb-6">
        <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{t('resize.keepAspectRatio')}</span>
        <button
          onClick={() => setKeepAspectRatio(!keepAspectRatio)}
          className="relative w-10 h-6 rounded-full transition-colors cursor-pointer"
          style={{
            backgroundColor: keepAspectRatio ? 'var(--color-accent)' : 'var(--color-bg-tertiary)',
            border: '1px solid var(--color-border)',
          }}
        >
          <span className="absolute top-0.5 w-4 h-4 rounded-full transition-transform"
            style={{
              left: keepAspectRatio ? '20px' : '2px',
              backgroundColor: keepAspectRatio ? 'white' : 'var(--color-text-placeholder)',
            }} />
        </button>
      </div>

      {/* 帧率设置 */}
      <div className="mb-6">
        <label className="block mb-2 font-medium text-sm" style={{ color: 'var(--color-text-primary)' }}>
          {t('resize.targetFps')}
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFps(null)}
            className="px-3 py-1.5 rounded-lg cursor-pointer"
            style={{
              fontSize: 'var(--font-size-sm)',
              backgroundColor: fps === null ? 'var(--color-accent)' : 'var(--color-bg-tertiary)',
              color: fps === null ? 'var(--color-text-inverse)' : 'var(--color-text-primary)',
              border: '1px solid var(--color-border)',
            }}
          >
            {t('resize.keepOriginal')}
          </button>
          {FRAME_RATE_PRESETS.map((preset) => (
            <button
              key={preset.value}
              onClick={() => setFps(preset.value)}
              className="px-3 py-1.5 rounded-lg cursor-pointer"
              style={{
                fontSize: 'var(--font-size-sm)',
                backgroundColor: fps === preset.value ? 'var(--color-accent)' : 'var(--color-bg-tertiary)',
                color: fps === preset.value ? 'var(--color-text-inverse)' : 'var(--color-text-primary)',
                border: '1px solid var(--color-border)',
              }}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* 缩放算法 */}
      <div className="mb-4">
        <label className="block mb-2 font-medium text-sm" style={{ color: 'var(--color-text-primary)' }}>
          {t('resize.scaleAlgorithm')}
        </label>
        <select value={scaleAlgorithm} onChange={(e) => setScaleAlgorithm(e.target.value)}
          className="w-full px-3 py-2 rounded-lg"
          style={{ backgroundColor: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', fontSize: 'var(--font-size-sm)' }}>
          {SCALE_ALGORITHMS.map((a) => (
            <option key={a.value} value={a.value}>{a.label} - {t(a.descKey as any)}</option>
          ))}
        </select>
      </div>

      {/* 画面适应模式 */}
      <div className="mb-4">
        <label className="block mb-2 font-medium text-sm" style={{ color: 'var(--color-text-primary)' }}>
          {t('resize.aspectMode')}
        </label>
        <div className="flex gap-2">
          {[
            { value: 'crop', label: t('resize.crop') },
            { value: 'pad', label: t('resize.pad') },
            { value: 'stretch', label: t('resize.stretch') },
          ].map((opt) => (
            <button key={opt.value} onClick={() => setAspectMode(opt.value)}
              className="px-3 py-1.5 rounded-lg cursor-pointer"
              style={{
                fontSize: 'var(--font-size-sm)',
                backgroundColor: aspectMode === opt.value ? 'var(--color-accent)' : 'var(--color-bg-tertiary)',
                color: aspectMode === opt.value ? 'var(--color-text-inverse)' : 'var(--color-text-primary)',
                border: '1px solid var(--color-border)',
              }}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </FeatureLayout>
  );
}
