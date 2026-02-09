/**
 * @file 文件信息面板组件
 * @description 展示选中文件的详细媒体信息
 */
import type { MediaInfo } from '@/types/media';
import { formatFileSize, formatDuration, formatBitrate } from '@/lib/format';
import { useT } from '@/i18n';

/** FileInfo 组件 Props */
interface FileInfoProps {
  /** 媒体信息（为 null 时显示占位） */
  mediaInfo: MediaInfo | null;
  /** 自定义 CSS class */
  className?: string;
}

/**
 * 文件信息面板组件
 *
 * 以键值对形式展示文件名、大小、时长、分辨率、帧率、编码、码率等信息。
 *
 * @param props - 媒体信息数据
 */
export function FileInfo({ mediaInfo, className }: FileInfoProps) {
  const t = useT();

  if (!mediaInfo) {
    return (
      <div
        className={`p-4 rounded-xl ${className ?? ''}`}
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border)',
        }}
      >
        <p style={{ color: 'var(--color-text-placeholder)', fontSize: 'var(--font-size-sm)' }}>
          {t('file.selectFileToView')}
        </p>
      </div>
    );
  }

  const video = mediaInfo.videoStreams[0];
  const audio = mediaInfo.audioStreams[0];

  /** 信息条目 */
  const items: Array<{ label: string; value: string }> = [
    { label: t('file.fileName'), value: mediaInfo.fileName },
    { label: t('file.fileSize'), value: formatFileSize(mediaInfo.fileSize) },
    { label: t('file.duration'), value: formatDuration(mediaInfo.duration) },
    { label: t('file.format'), value: mediaInfo.formatName.split(',')[0].toUpperCase() },
  ];

  if (video) {
    items.push(
      { label: t('file.resolution'), value: `${video.width}x${video.height}` },
      { label: t('file.frameRate'), value: `${video.frameRate.toFixed(1)} fps` },
      { label: t('file.videoCodec'), value: video.codecName.toUpperCase() },
    );
    if (video.bitrate) {
      items.push({ label: t('file.videoBitrate'), value: formatBitrate(video.bitrate) });
    }
  }

  if (audio) {
    items.push(
      { label: t('file.audioCodec'), value: audio.codecName.toUpperCase() },
      { label: t('file.sampleRate'), value: `${audio.sampleRate} Hz` },
      {
        label: t('file.channels'),
        value: audio.channels === 1
          ? t('file.mono')
          : t('file.channelsCount', { count: audio.channels }),
      },
    );
  }

  if (mediaInfo.bitrate) {
    items.push({ label: t('file.totalBitrate'), value: formatBitrate(mediaInfo.bitrate) });
  }

  return (
    <div
      className={`p-4 rounded-xl ${className ?? ''}`}
      style={{
        backgroundColor: 'var(--color-bg-secondary)',
        border: '1px solid var(--color-border)',
      }}
    >
      <h3
        className="font-medium mb-3"
        style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)' }}
      >
        {t('file.fileInfo')}
      </h3>

      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between">
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
              {item.label}
            </span>
            <span
              className="text-right truncate ml-2"
              style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-primary)', maxWidth: '60%' }}
            >
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
