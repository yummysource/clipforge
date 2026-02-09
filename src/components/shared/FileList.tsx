/**
 * @file 文件列表组件
 * @description 展示已添加的文件列表，支持选中、移除操作
 */
import { X, FileVideo, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatFileSize, formatDuration } from '@/lib/format';
import type { MediaFile } from '@/types/media';
import { useT } from '@/i18n';

/** FileList 组件 Props */
interface FileListProps {
  /** 文件列表 */
  files: MediaFile[];
  /** 当前选中的文件索引 */
  selectedIndex: number;
  /** 选中文件时的回调 */
  onSelect: (index: number) => void;
  /** 移除文件时的回调 */
  onRemove: (fileId: string) => void;
  /** 自定义 CSS class */
  className?: string;
}

/**
 * 文件列表组件
 *
 * 显示已添加的文件列表，每个文件项包含：
 * - 文件图标/缩略图
 * - 文件名
 * - 分辨率和时长信息（从 MediaInfo 获取）
 * - 文件大小
 * - 移除按钮
 *
 * @param props - 文件列表数据和事件回调
 */
export function FileList({ files, selectedIndex, onSelect, onRemove, className }: FileListProps) {
  const t = useT();

  if (files.length === 0) return null;

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {files.map((file, index) => {
        const isSelected = index === selectedIndex;
        const info = file.mediaInfo;
        /* 从 mediaInfo 提取展示信息 */
        const resolution = info?.videoStreams[0]
          ? `${info.videoStreams[0].width}x${info.videoStreams[0].height}`
          : null;
        const duration = info ? formatDuration(info.duration) : null;

        return (
          <div
            key={file.id}
            onClick={() => onSelect(index)}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all group',
            )}
            style={{
              backgroundColor: isSelected ? 'var(--color-accent-light)' : 'transparent',
              border: isSelected ? '1px solid var(--color-accent)' : '1px solid transparent',
            }}
            onMouseEnter={(e) => {
              if (!isSelected) {
                e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isSelected) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            {/* 文件图标 */}
            <div
              className="shrink-0 flex items-center justify-center w-9 h-9 rounded-md"
              style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-accent)' }}
            >
              {file.loading ? <Loader2 size={18} className="animate-spin" /> : <FileVideo size={18} />}
            </div>

            {/* 文件信息 */}
            <div className="flex-1 min-w-0">
              <p
                className="truncate font-medium"
                style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)' }}
              >
                {file.name}
              </p>
              <div className="flex items-center gap-2" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                {resolution && <span>{resolution}</span>}
                {resolution && duration && <span>-</span>}
                {duration && <span>{duration}</span>}
                <span>-</span>
                <span>{formatFileSize(file.size)}</span>
              </div>
            </div>

            {/* 移除按钮 */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove(file.id);
              }}
              className="shrink-0 opacity-0 group-hover:opacity-100 p-1 rounded transition-opacity cursor-pointer"
              style={{ color: 'var(--color-text-placeholder)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--color-error)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--color-text-placeholder)';
              }}
              title={t('file.removeFile')}
            >
              <X size={14} />
            </button>
          </div>
        );
      })}

      {/* 文件计数 */}
      <p className="text-center mt-1" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-placeholder)' }}>
        {t('file.filesAdded', { count: files.length })}
      </p>
    </div>
  );
}
