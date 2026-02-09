/**
 * @file 格式转换页面
 * @description 视频格式转换功能页面，支持预设选择和自定义参数
 */
import { useState, useCallback } from 'react';
import { FeatureLayout } from '@/components/layout/FeatureLayout';
import { PresetSelector } from '@/components/shared/PresetSelector';
import { useTask } from '@/hooks/useTask';
import { useAppStore } from '@/stores/useAppStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { convertVideo } from '@/services/ffmpeg';
import { CONVERT_PRESETS, VIDEO_FORMATS, VIDEO_CODECS, AUDIO_CODECS } from '@/lib/constants';
import { generateOutputName } from '@/lib/format';
import { buildOutputPath } from '@/lib/output';
import { useT } from '@/i18n';

/**
 * 格式转换页面组件
 *
 * 提供格式转换功能，包含：
 * - 预设选择（社交媒体、网页优化、高质量存档等）
 * - 输出格式选择
 * - 视频/音频编码器选择
 * - 质量级别滑块
 * - 高级选项折叠面板
 */
export function ConvertPage() {
  const { status, progress, error, execute, cancel, reset } = useTask();
  const files = useAppStore((s) => s.files);
  const selectedIndex = useAppStore((s) => s.selectedFileIndex);
  const clearFiles = useAppStore((s) => s.clearFiles);
  const outputSuffix = useSettingsStore((s) => s.outputSuffix);
  const t = useT();

  /* 参数状态 */
  const [presetId, setPresetId] = useState(CONVERT_PRESETS[0].id);
  const [outputFormat, setOutputFormat] = useState('mp4');
  const [videoCodec, setVideoCodec] = useState('libx264');
  const [audioCodec, setAudioCodec] = useState('aac');
  const [quality, setQuality] = useState(23);
  const [showAdvanced, setShowAdvanced] = useState(false);

  /** 应用预设参数 */
  const applyPreset = useCallback((id: string) => {
    setPresetId(id);
    const preset = CONVERT_PRESETS.find((p) => p.id === id);
    if (preset) {
      setOutputFormat(preset.outputFormat);
      setVideoCodec(preset.videoCodec);
      setAudioCodec(preset.audioCodec);
      setQuality(preset.quality);
    }
  }, []);

  /** 开始转换 */
  const handleStart = useCallback(() => {
    const file = files[selectedIndex];
    if (!file) return;

    const outputName = generateOutputName(file.name, outputSuffix, outputFormat);

    execute(convertVideo, {
      inputPath: file.path,
      outputPath: buildOutputPath(file.path, outputName),
      outputFormat,
      videoCodec,
      audioCodec,
      quality: videoCodec === 'copy' ? undefined : quality,
      preset: 'medium',
    });
  }, [files, selectedIndex, outputFormat, videoCodec, audioCodec, quality, outputSuffix, execute]);

  /** 重置所有状态 */
  const handleReset = useCallback(() => {
    reset();
    clearFiles();
  }, [reset, clearFiles]);

  return (
    <FeatureLayout
      title={t('features.convert.name')}
      description={t('features.convert.description')}
      taskStatus={status}
      taskProgress={progress}
      taskError={error}
      onStart={handleStart}
      onCancel={cancel}
      onReset={handleReset}
    >
      {/* 预设选择 */}
      <PresetSelector
        presets={CONVERT_PRESETS}
        selectedId={presetId}
        onSelect={applyPreset}
        className="mb-6"
      />

      {/* 输出格式 */}
      <div className="mb-4">
        <label
          className="block mb-2 font-medium"
          style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)' }}
        >
          {t('convert.outputFormat')}
        </label>
        <select
          value={outputFormat}
          onChange={(e) => setOutputFormat(e.target.value)}
          className="w-full px-3 py-2 rounded-lg"
          style={{
            backgroundColor: 'var(--color-bg-tertiary)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-primary)',
            fontSize: 'var(--font-size-sm)',
          }}
        >
          {VIDEO_FORMATS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label} - {t(f.descKey as any)}
            </option>
          ))}
        </select>
      </div>

      {/* 视频编码器 */}
      <div className="mb-4">
        <label
          className="block mb-2 font-medium"
          style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)' }}
        >
          {t('convert.videoCodec')}
        </label>
        <select
          value={videoCodec}
          onChange={(e) => setVideoCodec(e.target.value)}
          className="w-full px-3 py-2 rounded-lg"
          style={{
            backgroundColor: 'var(--color-bg-tertiary)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-primary)',
            fontSize: 'var(--font-size-sm)',
          }}
        >
          {VIDEO_CODECS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label} - {t(c.descKey as any)}
            </option>
          ))}
        </select>
      </div>

      {/* 画质级别（非 copy 模式） */}
      {videoCodec !== 'copy' && (
        <div className="mb-4">
          <label
            className="block mb-2 font-medium"
            style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)' }}
          >
            {t('convert.qualityLevel', { value: quality })}
          </label>
          <input
            type="range"
            min={0}
            max={51}
            value={quality}
            onChange={(e) => setQuality(Number(e.target.value))}
            className="w-full"
            style={{ accentColor: 'var(--color-accent)' }}
          />
          <div
            className="flex justify-between mt-1"
            style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}
          >
            <span>{t('convert.highQuality')}</span>
            <span>{t('convert.lowQuality')}</span>
          </div>
        </div>
      )}

      {/* 高级选项 */}
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center gap-1 mb-3 cursor-pointer"
        style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-accent)' }}
      >
        <span>{t('convert.advancedToggle', { action: showAdvanced ? t('convert.collapse') : t('convert.expand') })}</span>
      </button>

      {showAdvanced && (
        <div
          className="p-4 rounded-xl mb-4"
          style={{ backgroundColor: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)' }}
        >
          {/* 音频编码器 */}
          <div className="mb-4">
            <label
              className="block mb-2 font-medium"
              style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)' }}
            >
              {t('convert.audioCodec')}
            </label>
            <select
              value={audioCodec}
              onChange={(e) => setAudioCodec(e.target.value)}
              className="w-full px-3 py-2 rounded-lg"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
                fontSize: 'var(--font-size-sm)',
              }}
            >
              {AUDIO_CODECS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label} - {t(c.descKey as any)}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </FeatureLayout>
  );
}
