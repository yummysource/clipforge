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
import { useT } from '@/i18n';

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
  const t = useT();
  const { status, progress, result, error, execute, cancel, reset } = useTask('merge');
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
      title={t('features.merge.name')}
      description={t('features.merge.description')}
      taskStatus={status}
      taskProgress={progress}
      taskError={error}
      onStart={handleStart}
      onCancel={cancel}
      onReset={handleReset}
      taskResult={result}
      startDisabled={files.length < 2}
      startLabel={t('merge.mergeFiles', { count: files.length })}
    >
      {/* 排序列表 */}
      <div className="mb-6">
        <label
          className="block mb-2 font-medium"
          style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)' }}
        >
          {t('merge.dragToReorder')}
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
                  {t('merge.moveUp')}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); moveDown(index); }}
                  disabled={index === files.length - 1}
                  className="px-1 text-xs cursor-pointer disabled:opacity-30"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {t('merge.moveDown')}
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
          {t('merge.totalDuration', { value: formatDuration(totalDuration) })}
        </p>
      </div>

      {/* 转场设置 */}
      <div className="mb-4">
        <label
          className="block mb-2 font-medium"
          style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)' }}
        >
          {t('merge.transition')}
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
          <option value="none">{t('merge.transitionNone')}</option>

          {/* 淡入淡出类 */}
          <optgroup label={t('merge.transitionGroupFade')}>
            <option value="fade">{t('merge.transitionFade')}</option>
            <option value="fadeblack">{t('merge.transitionFadeBlack')}</option>
            <option value="fadewhite">{t('merge.transitionFadeWhite')}</option>
            <option value="fadegrays">{t('merge.transitionFadeGrays')}</option>
          </optgroup>

          {/* 滑动类 */}
          <optgroup label={t('merge.transitionGroupSlide')}>
            <option value="slideleft">{t('merge.transitionSlideLeft')}</option>
            <option value="slideright">{t('merge.transitionSlideRight')}</option>
            <option value="slideup">{t('merge.transitionSlideUp')}</option>
            <option value="slidedown">{t('merge.transitionSlideDown')}</option>
          </optgroup>

          {/* 擦除类 */}
          <optgroup label={t('merge.transitionGroupWipe')}>
            <option value="wipeleft">{t('merge.transitionWipeLeft')}</option>
            <option value="wiperight">{t('merge.transitionWipeRight')}</option>
            <option value="wipeup">{t('merge.transitionWipeUp')}</option>
            <option value="wipedown">{t('merge.transitionWipeDown')}</option>
          </optgroup>

          {/* 溶解类 */}
          <optgroup label={t('merge.transitionGroupDissolve')}>
            <option value="dissolve">{t('merge.transitionDissolve')}</option>
            <option value="pixelize">{t('merge.transitionPixelize')}</option>
          </optgroup>

          {/* 缩放类 */}
          <optgroup label={t('merge.transitionGroupZoom')}>
            <option value="zoomin">{t('merge.transitionZoomIn')}</option>
            <option value="smoothleft">{t('merge.transitionSmoothLeft')}</option>
            <option value="smoothright">{t('merge.transitionSmoothRight')}</option>
            <option value="smoothup">{t('merge.transitionSmoothUp')}</option>
            <option value="smoothdown">{t('merge.transitionSmoothDown')}</option>
          </optgroup>

          {/* 特效类 */}
          <optgroup label={t('merge.transitionGroupSpecial')}>
            <option value="circleopen">{t('merge.transitionCircleOpen')}</option>
            <option value="circleclose">{t('merge.transitionCircleClose')}</option>
            <option value="diagtl">{t('merge.transitionDiagTL')}</option>
            <option value="diagtr">{t('merge.transitionDiagTR')}</option>
            <option value="diagbl">{t('merge.transitionDiagBL')}</option>
            <option value="diagbr">{t('merge.transitionDiagBR')}</option>
            <option value="radial">{t('merge.transitionRadial')}</option>
            <option value="hblur">{t('merge.transitionHBlur')}</option>
          </optgroup>
        </select>
      </div>

      {transitionType !== 'none' && (
        <div className="mb-4">
          <label
            className="block mb-2"
            style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)' }}
          >
            {t('merge.transitionDuration', { value: transitionDuration })}
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
            {t('merge.normalize')}
          </p>
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
            {t('merge.normalizeDesc')}
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
