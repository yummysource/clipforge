/**
 * @file 合并拼接页面
 * @description 多视频合并功能页面，支持拖拽排序和转场设置
 */
import { useState, useCallback } from 'react';
import { FeatureLayout } from '@/components/layout/FeatureLayout';
import { useTask } from '@/hooks/useTask';
import { useAppStore } from '@/stores/useAppStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { mergeVideos } from '@/services/ffmpeg';
import { formatDuration, generateOutputName } from '@/lib/format';
import { buildOutputPath } from '@/lib/output';
import { GripVertical, X } from 'lucide-react';

/**
 * 合并拼接页面组件
 *
 * 功能特点：
 * - 文件拖拽排序调整合并顺序
 * - 转场效果选择（无转场/淡入淡出/黑场过渡）
 * - 可选统一分辨率和帧率
 * - 预览时间轴按比例显示各片段
 */
export function MergePage() {
  const { status, progress, error, execute, cancel, reset } = useTask();
  const files = useAppStore((s) => s.files);
  const selectedIndex = useAppStore((s) => s.selectedFileIndex);
  const setSelectedIndex = useAppStore((s) => s.setSelectedFileIndex);
  const removeFile = useAppStore((s) => s.removeFile);
  const reorderFiles = useAppStore((s) => s.reorderFiles);
  const clearFiles = useAppStore((s) => s.clearFiles);
  const outputSuffix = useSettingsStore((s) => s.outputSuffix);

  /* 参数状态 */
  const [transitionType, setTransitionType] = useState('none');
  const [transitionDuration, setTransitionDuration] = useState(0.5);
  const [normalize, setNormalize] = useState(true);

  /** 计算总时长 */
  const totalDuration = files.reduce((sum, f) => sum + (f.mediaInfo?.duration ?? 0), 0);

  /** 简易排序 — 上移 */
  const moveUp = useCallback((index: number) => {
    if (index <= 0) return;
    reorderFiles(index, index - 1);
  }, [reorderFiles]);

  /** 简易排序 — 下移 */
  const moveDown = useCallback((index: number) => {
    if (index >= files.length - 1) return;
    reorderFiles(index, index + 1);
  }, [reorderFiles, files.length]);

  /** 开始合并 */
  const handleStart = useCallback(() => {
    if (files.length < 2) return;

    const firstFile = files[0];
    const outputName = generateOutputName(firstFile.name, `${outputSuffix}_merged`);

    execute(mergeVideos, {
      inputPaths: files.map((f) => f.path),
      outputPath: buildOutputPath(firstFile.path, outputName),
      transition: transitionType !== 'none'
        ? { transitionType, duration: transitionDuration }
        : undefined,
      normalize,
    });
  }, [files, transitionType, transitionDuration, normalize, outputSuffix, execute]);

  const handleReset = useCallback(() => {
    reset();
    clearFiles();
  }, [reset, clearFiles]);

  return (
    <FeatureLayout
      title="合并拼接"
      description="多个视频合为一个"
      taskStatus={status}
      taskProgress={progress}
      taskError={error}
      onStart={handleStart}
      onCancel={cancel}
      onReset={handleReset}
      startDisabled={files.length < 2}
      startLabel={`合并 ${files.length} 个文件`}
    >
      {/* 排序列表 */}
      <div className="mb-6">
        <label
          className="block mb-2 font-medium"
          style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)' }}
        >
          拖拽排列视频顺序
        </label>

        <div className="flex flex-col gap-1">
          {files.map((file, index) => (
            <div
              key={file.id}
              className="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors"
              style={{
                backgroundColor: index === selectedIndex
                  ? 'var(--color-accent-light)'
                  : 'var(--color-bg-tertiary)',
                border: '1px solid var(--color-border)',
              }}
              onClick={() => setSelectedIndex(index)}
            >
              {/* 拖拽手柄 */}
              <div className="flex flex-col gap-0.5 cursor-grab" style={{ color: 'var(--color-text-placeholder)' }}>
                <button onClick={() => moveUp(index)} className="cursor-pointer hover:opacity-70" title="上移">
                  <GripVertical size={14} />
                </button>
              </div>

              {/* 序号 */}
              <span
                className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium"
                style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}
              >
                {index + 1}
              </span>

              {/* 文件信息 */}
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm" style={{ color: 'var(--color-text-primary)' }}>
                  {file.name}
                </p>
                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  {file.mediaInfo ? formatDuration(file.mediaInfo.duration) : '--:--'}
                </p>
              </div>

              {/* 上移/下移按钮 */}
              <div className="flex gap-1">
                <button
                  onClick={(e) => { e.stopPropagation(); moveUp(index); }}
                  disabled={index === 0}
                  className="px-1 text-xs cursor-pointer disabled:opacity-30"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  上移
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); moveDown(index); }}
                  disabled={index === files.length - 1}
                  className="px-1 text-xs cursor-pointer disabled:opacity-30"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  下移
                </button>
              </div>

              {/* 删除 */}
              <button
                onClick={(e) => { e.stopPropagation(); removeFile(file.id); }}
                className="cursor-pointer"
                style={{ color: 'var(--color-text-placeholder)' }}
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>

        <p className="mt-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          总时长: {formatDuration(totalDuration)}
        </p>
      </div>

      {/* 转场设置 */}
      <div className="mb-4">
        <label
          className="block mb-2 font-medium"
          style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)' }}
        >
          转场效果
        </label>
        <select
          value={transitionType}
          onChange={(e) => setTransitionType(e.target.value)}
          className="w-full px-3 py-2 rounded-lg"
          style={{
            backgroundColor: 'var(--color-bg-tertiary)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-primary)',
            fontSize: 'var(--font-size-sm)',
          }}
        >
          <option value="none">无转场</option>
          <option value="fade">淡入淡出</option>
          <option value="wipeleft">左划过渡</option>
          <option value="dissolve">溶解过渡</option>
        </select>
      </div>

      {transitionType !== 'none' && (
        <div className="mb-4">
          <label
            className="block mb-2"
            style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)' }}
          >
            转场时长: {transitionDuration}s
          </label>
          <input
            type="range"
            min={0.1}
            max={3}
            step={0.1}
            value={transitionDuration}
            onChange={(e) => setTransitionDuration(Number(e.target.value))}
            className="w-full"
            style={{ accentColor: 'var(--color-accent)' }}
          />
        </div>
      )}

      {/* 统一参数开关 */}
      <div className="flex items-center justify-between">
        <div>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)' }}>
            统一分辨率/帧率
          </p>
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
            自动将所有视频调整为一致的分辨率和帧率
          </p>
        </div>
        <button
          onClick={() => setNormalize(!normalize)}
          className="relative w-10 h-6 rounded-full transition-colors cursor-pointer"
          style={{
            backgroundColor: normalize ? 'var(--color-accent)' : 'var(--color-bg-tertiary)',
            border: '1px solid var(--color-border)',
          }}
        >
          <span
            className="absolute top-0.5 w-4 h-4 rounded-full transition-transform"
            style={{
              left: normalize ? '20px' : '2px',
              backgroundColor: normalize ? 'white' : 'var(--color-text-placeholder)',
            }}
          />
        </button>
      </div>
    </FeatureLayout>
  );
}
