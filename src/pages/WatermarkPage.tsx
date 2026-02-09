/**
 * @file 加水印页面
 * @description 水印功能页面，支持图片水印和文字水印
 */
import { useState, useCallback } from 'react';
import { FeatureLayout } from '@/components/layout/FeatureLayout';
import { useTask } from '@/hooks/useTask';
import { useAppStore } from '@/stores/useAppStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { addWatermark } from '@/services/ffmpeg';
import { openImageFile } from '@/services/files';
import { generateOutputName } from '@/lib/format';
import { buildOutputPath } from '@/lib/output';
import { useT } from '@/i18n';
import type { WatermarkType, WatermarkPosition } from '@/types/presets';

/**
 * 加水印页面组件
 *
 * 支持两种水印类型：
 * - 图片水印：选择图片文件，可调节大小和透明度
 * - 文字水印：自定义文本、字体、字号、颜色和描边
 *
 * 通用设置：九宫格快捷位置 + 精确 XY 偏移
 */
export function WatermarkPage() {
  const t = useT();
  const { status, progress, error, execute, cancel, reset } = useTask();
  const files = useAppStore((s) => s.files);
  const selectedIndex = useAppStore((s) => s.selectedFileIndex);
  const clearFiles = useAppStore((s) => s.clearFiles);
  const outputSuffix = useSettingsStore((s) => s.outputSuffix);

  /* 参数状态 */
  const [watermarkType, setWatermarkType] = useState<WatermarkType>('text');
  const [imagePath, setImagePath] = useState('');
  const [imageScale, setImageScale] = useState(0.5);
  const [opacity, setOpacity] = useState(0.8);
  const [text, setText] = useState('');
  const [fontSize, setFontSize] = useState(24);
  const [fontColor, setFontColor] = useState('#FFFFFF');
  const [position, setPosition] = useState<WatermarkPosition>('bottomRight');
  const [offsetX, setOffsetX] = useState(20);
  const [offsetY, setOffsetY] = useState(20);

  /** 选择水印图片 */
  const handleSelectImage = useCallback(async () => {
    const path = await openImageFile();
    if (path) setImagePath(path);
  }, []);

  /** 开始处理 */
  const handleStart = useCallback(() => {
    const file = files[selectedIndex];
    if (!file) return;

    const outputName = generateOutputName(file.name, outputSuffix);

    execute(addWatermark, {
      inputPath: file.path,
      outputPath: buildOutputPath(file.path, outputName),
      watermarkType,
      imagePath: watermarkType === 'image' ? imagePath : undefined,
      imageScale: watermarkType === 'image' ? imageScale : undefined,
      opacity,
      text: watermarkType === 'text' ? text : undefined,
      fontSize: watermarkType === 'text' ? fontSize : undefined,
      fontColor: watermarkType === 'text' ? fontColor : undefined,
      position,
      offsetX,
      offsetY,
    });
  }, [files, selectedIndex, watermarkType, imagePath, imageScale, opacity, text, fontSize, fontColor, position, offsetX, offsetY, outputSuffix, execute]);

  const handleReset = useCallback(() => {
    reset();
    clearFiles();
  }, [reset, clearFiles]);

  /** 九宫格位置选项 — 需在 hook 之后定义，以使用 t() 翻译 */
  const positionOptions: Array<{ value: WatermarkPosition; label: string }> = [
    { value: 'topLeft', label: t('watermark.topLeft') },
    { value: 'topCenter', label: t('watermark.topCenter') },
    { value: 'topRight', label: t('watermark.topRight') },
    { value: 'centerLeft', label: t('watermark.centerLeft') },
    { value: 'center', label: t('watermark.center') },
    { value: 'centerRight', label: t('watermark.centerRight') },
    { value: 'bottomLeft', label: t('watermark.bottomLeft') },
    { value: 'bottomCenter', label: t('watermark.bottomCenter') },
    { value: 'bottomRight', label: t('watermark.bottomRight') },
  ];

  return (
    <FeatureLayout
      title={t('features.watermark.name')}
      description={t('features.watermark.description')}
      taskStatus={status}
      taskProgress={progress}
      taskError={error}
      onStart={handleStart}
      onCancel={cancel}
      onReset={handleReset}
    >
      {/* 水印类型切换 */}
      <div className="mb-6">
        <div className="flex gap-2">
          {(['image', 'text'] as WatermarkType[]).map((type) => (
            <button
              key={type}
              onClick={() => setWatermarkType(type)}
              className="px-4 py-2 rounded-lg cursor-pointer"
              style={{
                fontSize: 'var(--font-size-sm)',
                backgroundColor: watermarkType === type ? 'var(--color-accent)' : 'var(--color-bg-tertiary)',
                color: watermarkType === type ? 'var(--color-text-inverse)' : 'var(--color-text-primary)',
                border: '1px solid var(--color-border)',
              }}
            >
              {type === 'image' ? t('watermark.imageWatermark') : t('watermark.textWatermark')}
            </button>
          ))}
        </div>
      </div>

      {/* 图片水印设置 */}
      {watermarkType === 'image' && (
        <div className="flex flex-col gap-4 mb-6">
          <div>
            <label className="block mb-1 text-sm" style={{ color: 'var(--color-text-primary)' }}>{t('watermark.watermarkImage')}</label>
            <button
              onClick={handleSelectImage}
              className="w-full px-4 py-3 rounded-lg border-2 border-dashed text-sm cursor-pointer"
              style={{
                borderColor: imagePath ? 'var(--color-accent)' : 'var(--color-border)',
                color: imagePath ? 'var(--color-text-primary)' : 'var(--color-text-placeholder)',
                backgroundColor: 'var(--color-bg-tertiary)',
              }}
            >
              {imagePath ? imagePath.split('/').pop() : t('watermark.clickSelectImage')}
            </button>
          </div>
          <div>
            <label className="block mb-1 text-sm" style={{ color: 'var(--color-text-primary)' }}>
              {t('watermark.imageSize', { value: Math.round(imageScale * 100) })}
            </label>
            <input type="range" min={10} max={100} value={imageScale * 100}
              onChange={(e) => setImageScale(Number(e.target.value) / 100)}
              className="w-full" style={{ accentColor: 'var(--color-accent)' }} />
          </div>
        </div>
      )}

      {/* 文字水印设置 */}
      {watermarkType === 'text' && (
        <div className="flex flex-col gap-4 mb-6">
          <div>
            <label className="block mb-1 text-sm" style={{ color: 'var(--color-text-primary)' }}>{t('watermark.watermarkText')}</label>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t('watermark.textPlaceholder')}
              className="w-full px-3 py-2 rounded-lg"
              style={{
                backgroundColor: 'var(--color-bg-tertiary)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
                fontSize: 'var(--font-size-sm)',
              }}
            />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block mb-1 text-sm" style={{ color: 'var(--color-text-primary)' }}>{t('watermark.fontSize')}</label>
              <input type="number" value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))}
                min={8} max={200}
                className="w-full px-3 py-2 rounded-lg"
                style={{ backgroundColor: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', fontSize: 'var(--font-size-sm)' }} />
            </div>
            <div className="flex-1">
              <label className="block mb-1 text-sm" style={{ color: 'var(--color-text-primary)' }}>{t('watermark.fontColor')}</label>
              <input type="color" value={fontColor} onChange={(e) => setFontColor(e.target.value)}
                className="w-full h-9 rounded-lg cursor-pointer" />
            </div>
          </div>
        </div>
      )}

      {/* 透明度 */}
      <div className="mb-4">
        <label className="block mb-1 text-sm" style={{ color: 'var(--color-text-primary)' }}>
          {t('watermark.opacity', { value: Math.round(opacity * 100) })}
        </label>
        <input type="range" min={0} max={100} value={opacity * 100}
          onChange={(e) => setOpacity(Number(e.target.value) / 100)}
          className="w-full" style={{ accentColor: 'var(--color-accent)' }} />
      </div>

      {/* 位置选择 — 九宫格 */}
      <div className="mb-4">
        <label className="block mb-2 font-medium text-sm" style={{ color: 'var(--color-text-primary)' }}>{t('watermark.position')}</label>
        <div className="grid grid-cols-3 gap-2" style={{ maxWidth: '240px' }}>
          {positionOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPosition(opt.value)}
              className="px-2 py-2 rounded-md text-xs cursor-pointer"
              style={{
                backgroundColor: position === opt.value ? 'var(--color-accent)' : 'var(--color-bg-tertiary)',
                color: position === opt.value ? 'white' : 'var(--color-text-secondary)',
                border: '1px solid var(--color-border)',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* 偏移量 */}
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block mb-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{t('watermark.offsetX')}</label>
          <input type="number" value={offsetX} onChange={(e) => setOffsetX(Number(e.target.value))}
            className="w-full px-3 py-1.5 rounded-lg text-sm"
            style={{ backgroundColor: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }} />
        </div>
        <div className="flex-1">
          <label className="block mb-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{t('watermark.offsetY')}</label>
          <input type="number" value={offsetY} onChange={(e) => setOffsetY(Number(e.target.value))}
            className="w-full px-3 py-1.5 rounded-lg text-sm"
            style={{ backgroundColor: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }} />
        </div>
      </div>
    </FeatureLayout>
  );
}
