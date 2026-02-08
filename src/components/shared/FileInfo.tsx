/**
 * @file 文件信息面板组件
 * @description 展示选中文件的详细媒体信息
 */
import type { MediaInfo } from '@/types/media';
import { formatFileSize, formatDuration, formatBitrate } from '@/lib/format';

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
          选择文件以查看信息
        </p>
      </div>
    );
  }

  const video = mediaInfo.videoStreams[0];
  const audio = mediaInfo.audioStreams[0];

  /** 信息条目 */
  const items: Array<{ label: string; value: string }> = [
    { label: '文件名', value: mediaInfo.fileName },
    { label: '大小', value: formatFileSize(mediaInfo.fileSize) },
    { label: '时长', value: formatDuration(mediaInfo.duration) },
    { label: '格式', value: mediaInfo.formatName.split(',')[0].toUpperCase() },
  ];

  if (video) {
    items.push(
      { label: '分辨率', value: `${video.width}x${video.height}` },
      { label: '帧率', value: `${video.frameRate.toFixed(1)} fps` },
      { label: '视频编码', value: video.codecName.toUpperCase() },
    );
    if (video.bitrate) {
      items.push({ label: '视频码率', value: formatBitrate(video.bitrate) });
    }
  }

  if (audio) {
    items.push(
      { label: '音频编码', value: audio.codecName.toUpperCase() },
      { label: '采样率', value: `${audio.sampleRate} Hz` },
      { label: '声道', value: audio.channels === 1 ? '单声道' : `${audio.channels} 声道` },
    );
  }

  if (mediaInfo.bitrate) {
    items.push({ label: '总码率', value: formatBitrate(mediaInfo.bitrate) });
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
        文件信息
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
