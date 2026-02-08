/**
 * @file 裁剪剪切页面
 * @description 视频裁剪功能页面，支持时间轴选择和多片段裁剪
 */
import { useState, useCallback } from 'react';
import { FeatureLayout } from '@/components/layout/FeatureLayout';
import { TimelineSelector, type TimeSegment } from '@/components/shared/TimelineSelector';
import { useTask } from '@/hooks/useTask';
import { useAppStore } from '@/stores/useAppStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { trimVideo } from '@/services/ffmpeg';
import { generateOutputName } from '@/lib/format';

/**
 * 裁剪剪切页面组件
 *
 * 功能特点：
 * - 时间轴可视化选择入点/出点
 * - 支持多片段裁剪
 * - 可选精确切割（重编码）或快速切割（流复制）
 * - 多片段可选合并为一个文件或分别导出
 */
export function TrimPage() {
  const { status, progress, error, execute, cancel, reset } = useTask();
  const files = useAppStore((s) => s.files);
  const selectedIndex = useAppStore((s) => s.selectedFileIndex);
  const clearFiles = useAppStore((s) => s.clearFiles);
  const outputSuffix = useSettingsStore((s) => s.outputSuffix);

  /* 参数状态 */
  const [segments, setSegments] = useState<TimeSegment[]>([
    { id: '1', start: 0, end: 0 },
  ]);
  const [preciseCut, setPreciseCut] = useState(false);
  const [mergeSegments, setMergeSegments] = useState(true);

  /** 当前文件的时长 */
  const currentFile = files[selectedIndex];
  const duration = currentFile?.mediaInfo?.duration ?? 0;

  /** 初始化片段（文件变化时） */
  if (segments[0].end === 0 && duration > 0) {
    setSegments([{ id: '1', start: 0, end: duration }]);
  }

  /** 开始裁剪 */
  const handleStart = useCallback(() => {
    if (!currentFile) return;

    const outputName = generateOutputName(currentFile.name, outputSuffix);
    const outputDir = currentFile.path.substring(0, currentFile.path.lastIndexOf('/'));

    execute(trimVideo, {
      inputPath: currentFile.path,
      outputPath: `${outputDir}/${outputName}`,
      segments: segments.map((s) => ({ start: s.start, end: s.end })),
      preciseCut,
      mergeSegments,
    });
  }, [currentFile, segments, preciseCut, mergeSegments, outputSuffix, execute]);

  const handleReset = useCallback(() => {
    reset();
    clearFiles();
    setSegments([{ id: '1', start: 0, end: 0 }]);
  }, [reset, clearFiles]);

  return (
    <FeatureLayout
      title="裁剪剪切"
      description="截取片段、去头去尾"
      taskStatus={status}
      taskProgress={progress}
      taskError={error}
      onStart={handleStart}
      onCancel={cancel}
      onReset={handleReset}
    >
      {/* 时间轴选择器 */}
      <TimelineSelector
        duration={duration}
        segments={segments}
        onSegmentsChange={setSegments}
        multiSegment
        className="mb-6"
      />

      {/* 裁剪选项 */}
      <div className="flex flex-col gap-4">
        {/* 精确切割开关 */}
        <div className="flex items-center justify-between">
          <div>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)' }}>
              精确切割
            </p>
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
              重新编码以实现帧级精确，速度较慢
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

        {/* 合并片段开关（多片段时显示） */}
        {segments.length > 1 && (
          <div className="flex items-center justify-between">
            <div>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)' }}>
                合并片段
              </p>
              <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                将多个片段合并为一个文件
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
      </div>
    </FeatureLayout>
  );
}
