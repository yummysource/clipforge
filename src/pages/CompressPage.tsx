/**
 * @file 视频压缩页面
 * @description 视频压缩功能页面，支持按目标大小、压缩比、画质等级三种模式
 */
import { useState, useCallback } from 'react';
import { FeatureLayout } from '@/components/layout/FeatureLayout';
import { PresetSelector } from '@/components/shared/PresetSelector';
import { useTask } from '@/hooks/useTask';
import { useAppStore } from '@/stores/useAppStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { compressVideo } from '@/services/ffmpeg';
import { COMPRESS_PRESETS } from '@/lib/constants';
import { generateOutputName } from '@/lib/format';
import { buildOutputPath } from '@/lib/output';
import type { CompressMode } from '@/types/presets';
import { useT } from '@/i18n';

/**
 * 视频压缩页面组件
 *
 * 三种压缩模式：
 * - 按目标大小：输入目标 MB 数
 * - 按压缩比：选择 30%/50%/70% 等
 * - 按画质等级：1-10 档位滑块
 */
export function CompressPage() {
  const { status, progress, error, execute, cancel, reset } = useTask();
  const files = useAppStore((s) => s.files);
  const selectedIndex = useAppStore((s) => s.selectedFileIndex);
  const clearFiles = useAppStore((s) => s.clearFiles);
  const outputSuffix = useSettingsStore((s) => s.outputSuffix);
  const t = useT();

  /* 参数状态 */
  const [presetId, setPresetId] = useState(COMPRESS_PRESETS[0].id);
  const [mode, setMode] = useState<CompressMode>('byQuality');
  const [targetSizeMb, setTargetSizeMb] = useState(50);
  const [compressRatio, setCompressRatio] = useState(0.5);
  const [qualityLevel, setQualityLevel] = useState(5);

  /** 应用预设 */
  const applyPreset = useCallback((id: string) => {
    setPresetId(id);
    const preset = COMPRESS_PRESETS.find((p) => p.id === id);
    if (preset) {
      setMode(preset.mode);
      if (preset.qualityLevel !== null) setQualityLevel(preset.qualityLevel);
    }
  }, []);

  /** 开始压缩 */
  const handleStart = useCallback(() => {
    const file = files[selectedIndex];
    if (!file) return;

    const outputName = generateOutputName(file.name, outputSuffix);

    execute(compressVideo, {
      inputPath: file.path,
      outputPath: buildOutputPath(file.path, outputName),
      mode,
      targetSizeMb: mode === 'bySize' ? targetSizeMb : undefined,
      compressRatio: mode === 'byRatio' ? compressRatio : undefined,
      qualityLevel: mode === 'byQuality' ? qualityLevel : undefined,
    });
  }, [files, selectedIndex, mode, targetSizeMb, compressRatio, qualityLevel, outputSuffix, execute]);

  const handleReset = useCallback(() => {
    reset();
    clearFiles();
  }, [reset, clearFiles]);

  /** 压缩模式标签按钮 */
  const modeOptions: Array<{ value: CompressMode; label: string }> = [
    { value: 'bySize', label: t('compress.bySize') },
    { value: 'byRatio', label: t('compress.byRatio') },
    { value: 'byQuality', label: t('compress.byQuality') },
  ];

  return (
    <FeatureLayout
      title={t('features.compress.name')}
      description={t('features.compress.description')}
      taskStatus={status}
      taskProgress={progress}
      taskError={error}
      onStart={handleStart}
      onCancel={cancel}
      onReset={handleReset}
    >
      {/* 预设选择 */}
      <PresetSelector
        presets={COMPRESS_PRESETS}
        selectedId={presetId}
        onSelect={applyPreset}
        className="mb-6"
      />

      {/* 压缩模式切换 */}
      <div className="mb-6">
        <label
          className="block mb-2 font-medium"
          style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)' }}
        >
          {t('compress.mode')}
        </label>
        <div className="flex gap-2">
          {modeOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setMode(opt.value)}
              className="px-3 py-1.5 rounded-lg transition-all cursor-pointer"
              style={{
                fontSize: 'var(--font-size-sm)',
                backgroundColor: mode === opt.value ? 'var(--color-accent)' : 'var(--color-bg-tertiary)',
                color: mode === opt.value ? 'var(--color-text-inverse)' : 'var(--color-text-primary)',
                border: mode === opt.value ? '1px solid var(--color-accent)' : '1px solid var(--color-border)',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* 按目标大小模式 */}
      {mode === 'bySize' && (
        <div className="mb-4">
          <label
            className="block mb-2 font-medium"
            style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)' }}
          >
            {t('compress.targetSize', { value: targetSizeMb })}
          </label>
          <input
            type="range"
            min={1}
            max={500}
            value={targetSizeMb}
            onChange={(e) => setTargetSizeMb(Number(e.target.value))}
            className="w-full"
            style={{ accentColor: 'var(--color-accent)' }}
          />
        </div>
      )}

      {/* 按压缩比模式 */}
      {mode === 'byRatio' && (
        <div className="mb-4">
          <label
            className="block mb-2 font-medium"
            style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)' }}
          >
            {t('compress.ratio', { value: Math.round(compressRatio * 100) })}
          </label>
          <input
            type="range"
            min={10}
            max={90}
            value={compressRatio * 100}
            onChange={(e) => setCompressRatio(Number(e.target.value) / 100)}
            className="w-full"
            style={{ accentColor: 'var(--color-accent)' }}
          />
          <div
            className="flex justify-between mt-1"
            style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}
          >
            <span>{t('compress.ratioMin')}</span>
            <span>{t('compress.ratioMax')}</span>
          </div>
        </div>
      )}

      {/* 按画质等级模式 */}
      {mode === 'byQuality' && (
        <div className="mb-4">
          <label
            className="block mb-2 font-medium"
            style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)' }}
          >
            {t('compress.qualityLevel', { value: qualityLevel })}
          </label>
          <input
            type="range"
            min={1}
            max={10}
            value={qualityLevel}
            onChange={(e) => setQualityLevel(Number(e.target.value))}
            className="w-full"
            style={{ accentColor: 'var(--color-accent)' }}
          />
          <div
            className="flex justify-between mt-1"
            style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}
          >
            <span>{t('compress.qualityMin')}</span>
            <span>{t('compress.qualityMax')}</span>
          </div>
        </div>
      )}
    </FeatureLayout>
  );
}
