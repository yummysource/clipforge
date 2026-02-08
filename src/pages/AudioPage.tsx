/**
 * @file 音频处理页面
 * @description 音频处理功能页面，支持提取/替换/静音/调节四种模式
 */
import { useState, useCallback } from 'react';
import { FeatureLayout } from '@/components/layout/FeatureLayout';
import { useTask } from '@/hooks/useTask';
import { useAppStore } from '@/stores/useAppStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { processAudio } from '@/services/ffmpeg';
import { openAudioFile } from '@/services/files';
import { AUDIO_FORMATS } from '@/lib/constants';
import { generateOutputName } from '@/lib/format';
import type { AudioMode } from '@/types/presets';

/**
 * 音频处理页面组件
 *
 * 四种处理模式：
 * - 提取音频：从视频中提取音频为独立文件
 * - 替换配音：用新音频替换原有音轨
 * - 静音消音：移除视频中的音频
 * - 调节音量：增减音量 dB 值
 */
export function AudioPage() {
  const { status, progress, error, execute, cancel, reset } = useTask();
  const files = useAppStore((s) => s.files);
  const selectedIndex = useAppStore((s) => s.selectedFileIndex);
  const clearFiles = useAppStore((s) => s.clearFiles);
  const outputSuffix = useSettingsStore((s) => s.outputSuffix);

  /* 参数状态 */
  const [mode, setMode] = useState<AudioMode>('extract');
  const [outputFormat, setOutputFormat] = useState('mp3');
  const [replaceAudioPath, setReplaceAudioPath] = useState('');
  const [volumeDb, setVolumeDb] = useState(0);

  /** 选择替换音频文件 */
  const handleSelectAudio = useCallback(async () => {
    const path = await openAudioFile();
    if (path) setReplaceAudioPath(path);
  }, []);

  /** 开始处理 */
  const handleStart = useCallback(() => {
    const file = files[selectedIndex];
    if (!file) return;

    const ext = mode === 'extract' ? outputFormat : undefined;
    const outputName = generateOutputName(file.name, outputSuffix, ext);
    const outputDir = file.path.substring(0, file.path.lastIndexOf('/'));

    execute(processAudio, {
      inputPath: file.path,
      outputPath: `${outputDir}/${outputName}`,
      mode,
      outputFormat: mode === 'extract' ? outputFormat : undefined,
      replaceAudioPath: mode === 'replace' ? replaceAudioPath : undefined,
      volumeDb: mode === 'adjust' ? volumeDb : undefined,
    });
  }, [files, selectedIndex, mode, outputFormat, replaceAudioPath, volumeDb, outputSuffix, execute]);

  const handleReset = useCallback(() => {
    reset();
    clearFiles();
  }, [reset, clearFiles]);

  /** 模式选项 */
  const modeOptions: Array<{ value: AudioMode; label: string; desc: string }> = [
    { value: 'extract', label: '提取音频', desc: '导出音轨' },
    { value: 'replace', label: '替换配音', desc: '替换音轨' },
    { value: 'mute', label: '静音消音', desc: '移除音频' },
    { value: 'adjust', label: '调节音量', desc: '增减音量' },
  ];

  return (
    <FeatureLayout
      title="音频处理"
      description="提取音频、替换配音、调节音量"
      taskStatus={status}
      taskProgress={progress}
      taskError={error}
      onStart={handleStart}
      onCancel={cancel}
      onReset={handleReset}
    >
      {/* 模式选择 */}
      <div className="mb-6">
        <label
          className="block mb-2 font-medium"
          style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)' }}
        >
          处理模式
        </label>
        <div className="grid grid-cols-4 gap-2">
          {modeOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setMode(opt.value)}
              className="flex flex-col items-center gap-1 px-3 py-3 rounded-lg cursor-pointer transition-all"
              style={{
                backgroundColor: mode === opt.value ? 'var(--color-accent)' : 'var(--color-bg-tertiary)',
                color: mode === opt.value ? 'var(--color-text-inverse)' : 'var(--color-text-primary)',
                border: mode === opt.value ? '1px solid var(--color-accent)' : '1px solid var(--color-border)',
              }}
            >
              <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500 }}>{opt.label}</span>
              <span style={{ fontSize: 'var(--font-size-xs)', opacity: 0.8 }}>{opt.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 提取模式 — 输出格式选择 */}
      {mode === 'extract' && (
        <div className="mb-4">
          <label
            className="block mb-2 font-medium"
            style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)' }}
          >
            输出格式
          </label>
          <div className="flex gap-2">
            {AUDIO_FORMATS.map((f) => (
              <button
                key={f.value}
                onClick={() => setOutputFormat(f.value)}
                className="px-3 py-1.5 rounded-lg cursor-pointer"
                style={{
                  fontSize: 'var(--font-size-sm)',
                  backgroundColor: outputFormat === f.value ? 'var(--color-accent)' : 'var(--color-bg-tertiary)',
                  color: outputFormat === f.value ? 'var(--color-text-inverse)' : 'var(--color-text-primary)',
                  border: '1px solid var(--color-border)',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 替换模式 — 音频文件选择 */}
      {mode === 'replace' && (
        <div className="mb-4">
          <label
            className="block mb-2 font-medium"
            style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)' }}
          >
            替换音频文件
          </label>
          <button
            onClick={handleSelectAudio}
            className="w-full px-4 py-3 rounded-lg border-2 border-dashed text-sm cursor-pointer"
            style={{
              borderColor: replaceAudioPath ? 'var(--color-accent)' : 'var(--color-border)',
              color: replaceAudioPath ? 'var(--color-text-primary)' : 'var(--color-text-placeholder)',
              backgroundColor: 'var(--color-bg-tertiary)',
            }}
          >
            {replaceAudioPath ? replaceAudioPath.split('/').pop() : '点击选择音频文件...'}
          </button>
        </div>
      )}

      {/* 调节模式 — 音量滑块 */}
      {mode === 'adjust' && (
        <div className="mb-4">
          <label
            className="block mb-2 font-medium"
            style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)' }}
          >
            音量调节: {volumeDb > 0 ? '+' : ''}{volumeDb} dB
          </label>
          <input
            type="range"
            min={-20}
            max={20}
            step={0.5}
            value={volumeDb}
            onChange={(e) => setVolumeDb(Number(e.target.value))}
            className="w-full"
            style={{ accentColor: 'var(--color-accent)' }}
          />
          <div
            className="flex justify-between mt-1"
            style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}
          >
            <span>-20 dB (减小)</span>
            <span>0 dB</span>
            <span>+20 dB (增大)</span>
          </div>
        </div>
      )}
    </FeatureLayout>
  );
}
