/**
 * @file 字幕处理页面
 * @description 字幕处理功能页面，支持嵌入/提取/烧录三种模式
 */
import { useState, useCallback } from 'react';
import { FeatureLayout } from '@/components/layout/FeatureLayout';
import { useTask } from '@/hooks/useTask';
import { useAppStore } from '@/stores/useAppStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { processSubtitle } from '@/services/ffmpeg';
import { openSubtitleFile } from '@/services/files';
import { generateOutputName } from '@/lib/format';
import type { SubtitleMode } from '@/types/presets';

/**
 * 字幕处理页面组件
 *
 * 三种处理模式：
 * - 嵌入字幕：将外部字幕文件嵌入视频容器（软字幕）
 * - 提取字幕：从视频中提取字幕流到独立文件
 * - 烧录字幕：将字幕硬编码到视频画面（硬字幕）
 */
export function SubtitlePage() {
  const { status, progress, error, execute, cancel, reset } = useTask();
  const files = useAppStore((s) => s.files);
  const selectedIndex = useAppStore((s) => s.selectedFileIndex);
  const clearFiles = useAppStore((s) => s.clearFiles);
  const outputSuffix = useSettingsStore((s) => s.outputSuffix);

  /* 参数状态 */
  const [mode, setMode] = useState<SubtitleMode>('embed');
  const [subtitlePath, setSubtitlePath] = useState('');
  const [outputFormat, setOutputFormat] = useState('srt');
  const [fontSize, setFontSize] = useState(36);
  const [primaryColor, setPrimaryColor] = useState('#FFFFFF');
  const [outlineWidth, setOutlineWidth] = useState(2);
  const [marginV, setMarginV] = useState(50);

  /** 选择字幕文件 */
  const handleSelectSubtitle = useCallback(async () => {
    const path = await openSubtitleFile();
    if (path) setSubtitlePath(path);
  }, []);

  /** 开始处理 */
  const handleStart = useCallback(() => {
    const file = files[selectedIndex];
    if (!file) return;

    const ext = mode === 'extract' ? outputFormat : undefined;
    const outputName = generateOutputName(file.name, outputSuffix, ext);
    const outputDir = file.path.substring(0, file.path.lastIndexOf('/'));

    execute(processSubtitle, {
      inputPath: file.path,
      outputPath: `${outputDir}/${outputName}`,
      mode,
      subtitlePath: mode !== 'extract' ? subtitlePath : undefined,
      outputFormat: mode === 'extract' ? outputFormat : undefined,
      fontSize: mode === 'burnIn' ? fontSize : undefined,
      primaryColor: mode === 'burnIn' ? primaryColor : undefined,
      outlineWidth: mode === 'burnIn' ? outlineWidth : undefined,
      marginV: mode === 'burnIn' ? marginV : undefined,
    });
  }, [files, selectedIndex, mode, subtitlePath, outputFormat, fontSize, primaryColor, outlineWidth, marginV, outputSuffix, execute]);

  const handleReset = useCallback(() => {
    reset();
    clearFiles();
  }, [reset, clearFiles]);

  /** 模式选项 */
  const modeOptions: Array<{ value: SubtitleMode; label: string; desc: string }> = [
    { value: 'embed', label: '嵌入字幕', desc: '软字幕' },
    { value: 'extract', label: '提取字幕', desc: '导出文件' },
    { value: 'burnIn', label: '烧录字幕', desc: '硬字幕' },
  ];

  return (
    <FeatureLayout
      title="字幕处理"
      description="嵌入字幕、提取字幕、调整时间轴"
      taskStatus={status}
      taskProgress={progress}
      taskError={error}
      onStart={handleStart}
      onCancel={cancel}
      onReset={handleReset}
    >
      {/* 模式选择 */}
      <div className="mb-6">
        <label className="block mb-2 font-medium text-sm" style={{ color: 'var(--color-text-primary)' }}>
          处理模式
        </label>
        <div className="grid grid-cols-3 gap-2">
          {modeOptions.map((opt) => (
            <button key={opt.value} onClick={() => setMode(opt.value)}
              className="flex flex-col items-center gap-1 px-3 py-3 rounded-lg cursor-pointer"
              style={{
                backgroundColor: mode === opt.value ? 'var(--color-accent)' : 'var(--color-bg-tertiary)',
                color: mode === opt.value ? 'var(--color-text-inverse)' : 'var(--color-text-primary)',
                border: mode === opt.value ? '1px solid var(--color-accent)' : '1px solid var(--color-border)',
              }}>
              <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500 }}>{opt.label}</span>
              <span style={{ fontSize: 'var(--font-size-xs)', opacity: 0.8 }}>{opt.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 嵌入/烧录模式 — 字幕文件选择 */}
      {(mode === 'embed' || mode === 'burnIn') && (
        <div className="mb-4">
          <label className="block mb-1 text-sm" style={{ color: 'var(--color-text-primary)' }}>字幕文件</label>
          <button onClick={handleSelectSubtitle}
            className="w-full px-4 py-3 rounded-lg border-2 border-dashed text-sm cursor-pointer"
            style={{
              borderColor: subtitlePath ? 'var(--color-accent)' : 'var(--color-border)',
              color: subtitlePath ? 'var(--color-text-primary)' : 'var(--color-text-placeholder)',
              backgroundColor: 'var(--color-bg-tertiary)',
            }}>
            {subtitlePath ? subtitlePath.split('/').pop() : '点击选择 .srt / .ass / .vtt 文件...'}
          </button>
        </div>
      )}

      {/* 提取模式 — 输出格式选择 */}
      {mode === 'extract' && (
        <div className="mb-4">
          <label className="block mb-2 font-medium text-sm" style={{ color: 'var(--color-text-primary)' }}>
            输出格式
          </label>
          <div className="flex gap-2">
            {['srt', 'ass', 'vtt'].map((fmt) => (
              <button key={fmt} onClick={() => setOutputFormat(fmt)}
                className="px-3 py-1.5 rounded-lg cursor-pointer uppercase"
                style={{
                  fontSize: 'var(--font-size-sm)',
                  backgroundColor: outputFormat === fmt ? 'var(--color-accent)' : 'var(--color-bg-tertiary)',
                  color: outputFormat === fmt ? 'var(--color-text-inverse)' : 'var(--color-text-primary)',
                  border: '1px solid var(--color-border)',
                }}>
                {fmt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 烧录模式 — 样式设置 */}
      {mode === 'burnIn' && (
        <div className="flex flex-col gap-4 mt-4 p-4 rounded-xl"
          style={{ backgroundColor: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)' }}>
          <h4 className="font-medium text-sm" style={{ color: 'var(--color-text-primary)' }}>字幕样式</h4>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block mb-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>字号</label>
              <input type="number" value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))}
                min={12} max={120}
                className="w-full px-3 py-1.5 rounded-lg text-sm"
                style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }} />
            </div>
            <div className="flex-1">
              <label className="block mb-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>颜色</label>
              <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-full h-8 rounded-lg cursor-pointer" />
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block mb-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>描边宽度</label>
              <input type="number" value={outlineWidth} onChange={(e) => setOutlineWidth(Number(e.target.value))}
                min={0} max={10}
                className="w-full px-3 py-1.5 rounded-lg text-sm"
                style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }} />
            </div>
            <div className="flex-1">
              <label className="block mb-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>底部边距</label>
              <input type="number" value={marginV} onChange={(e) => setMarginV(Number(e.target.value))}
                min={0} max={200}
                className="w-full px-3 py-1.5 rounded-lg text-sm"
                style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }} />
            </div>
          </div>
        </div>
      )}
    </FeatureLayout>
  );
}
