/**
 * @file 文件拖拽区域组件
 * @description 可拖拽上传文件的交互区域，支持点击选择和拖拽放入
 */
import { Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useT } from '@/i18n';

/** DropZone 组件 Props */
interface DropZoneProps {
  /** 是否正处于拖拽悬停状态 */
  isDragging?: boolean;
  /** 接受的文件类型描述（如 "mp4/mov/avi/mkv"） */
  acceptText?: string;
  /** 点击时触发的文件选择回调 */
  onClickSelect?: () => void;
  /** 是否已有文件（已有文件时显示紧凑版） */
  hasFiles?: boolean;
  /** 自定义 CSS class */
  className?: string;
}

/**
 * 文件拖拽上传区域组件
 *
 * 显示一个虚线边框的拖拽区域，支持：
 * - 拖拽文件进入时高亮显示
 * - 点击触发文件选择对话框
 * - 有文件后切换为紧凑视图
 *
 * @param props - 组件配置
 */
export function DropZone({
  isDragging = false,
  acceptText = 'mp4/mov/avi/mkv',
  onClickSelect,
  hasFiles = false,
  className,
}: DropZoneProps) {
  const t = useT();

  /** 紧凑模式：已有文件时只显示小型添加按钮 */
  if (hasFiles) {
    return (
      <button
        onClick={onClickSelect}
        className={cn(
          'w-full flex items-center justify-center gap-2 py-3 rounded-lg border-2 border-dashed transition-all cursor-pointer',
          className,
        )}
        style={{
          borderColor: isDragging ? 'var(--color-accent)' : 'var(--color-border)',
          backgroundColor: isDragging ? 'var(--color-accent-light)' : 'transparent',
          color: 'var(--color-text-secondary)',
          fontSize: 'var(--font-size-sm)',
        }}
      >
        <Upload size={16} />
        <span>{t('file.addMore')}</span>
      </button>
    );
  }

  return (
    <button
      onClick={onClickSelect}
      className={cn(
        'w-full flex flex-col items-center justify-center gap-3 py-10 rounded-xl border-2 border-dashed transition-all cursor-pointer',
        className,
      )}
      style={{
        borderColor: isDragging ? 'var(--color-accent)' : 'var(--color-border)',
        backgroundColor: isDragging ? 'var(--color-accent-light)' : 'transparent',
      }}
    >
      <div
        className="p-3 rounded-full"
        style={{
          backgroundColor: 'var(--color-accent-light)',
          color: 'var(--color-accent)',
        }}
      >
        <Upload size={28} />
      </div>

      <div className="text-center">
        <p
          className="font-medium"
          style={{ color: 'var(--color-text-primary)', fontSize: 'var(--font-size-md)' }}
        >
          {t('file.dragHere')}
        </p>
        <p
          className="mt-1"
          style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}
        >
          {t('file.orClickSelect')}
        </p>
      </div>

      <p style={{ color: 'var(--color-text-placeholder)', fontSize: 'var(--font-size-xs)' }}>
        {t('file.supported')}: {acceptText}
      </p>
    </button>
  );
}
