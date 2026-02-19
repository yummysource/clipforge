/**
 * @file 视频下载页面
 * @description 支持从 YouTube、X、Instagram 等平台下载视频。
 * 独立布局（不使用 FeatureLayout），包含 URL 输入、视频信息展示、格式选择、下载进度。
 */
import { useState, useCallback } from 'react';
import { Download, Search, Clock, User, Check, Loader2 } from 'lucide-react';
import { downloadDir } from '@tauri-apps/api/path';
import { PageHeader } from '@/components/layout/PageHeader';
import { ProgressPanel } from '@/components/shared/ProgressPanel';
import { useTask } from '@/hooks/useTask';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { parseVideoUrl, downloadVideo } from '@/services/download';
import { formatDuration, formatFileSize } from '@/lib/format';
import { useT } from '@/i18n';
import type { VideoInfo, FormatInfo } from '@/services/download';

/**
 * 视频下载页面组件
 *
 * 交互流程：
 * 1. 用户粘贴视频 URL
 * 2. 点击解析按钮，调用 yt-dlp 获取视频信息
 * 3. 展示视频缩略图、标题、时长、格式列表
 * 4. 用户选择目标格式
 * 5. 点击下载按钮，实时展示下载进度
 */
export function DownloadPage() {
  const t = useT();
  const { status, progress, error, execute, cancel, reset } = useTask('download');
  const outputDir = useSettingsStore((s) => s.outputDirectory);

  /* URL 输入状态 */
  const [url, setUrl] = useState('');
  /* 解析状态 */
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  /* 解析结果 */
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  /* 用户选择的格式 ID */
  const [selectedFormatId, setSelectedFormatId] = useState<string | null>(null);

  /**
   * 解析视频 URL
   * @description 调用后端 yt-dlp --dump-json 获取视频元数据
   */
  const handleParse = useCallback(async () => {
    if (!url.trim()) return;

    setParsing(true);
    setParseError(null);
    setVideoInfo(null);
    setSelectedFormatId(null);

    try {
      const info = await parseVideoUrl(url.trim());
      setVideoInfo(info);
      // 默认选择最佳的视频+音频格式
      const bestFormat = pickBestFormat(info.formats);
      if (bestFormat) {
        setSelectedFormatId(bestFormat.formatId);
      }
    } catch (err) {
      setParseError(err instanceof Error ? err.message : String(err));
    } finally {
      setParsing(false);
    }
  }, [url]);

  /**
   * 开始下载
   * @description 按选中的格式 ID 调用 yt-dlp 下载视频
   */
  const handleDownload = useCallback(async () => {
    if (!videoInfo || !selectedFormatId) return;

    // 生成输出文件名：清理标题中的非法字符
    const safeTitle = videoInfo.title.replace(/[<>:"/\\|?*]/g, '_').slice(0, 100);
    const selectedFormat = videoInfo.formats.find((f) => f.formatId === selectedFormatId);
    const ext = selectedFormat?.ext || 'mp4';

    // 确定输出目录：优先使用设置中的目录，否则用系统下载目录
    let dir = outputDir || '';
    if (!dir) {
      try {
        dir = await downloadDir();
      } catch {
        dir = '/tmp';
      }
    }
    const outputPath = `${dir}/${safeTitle}.${ext}`;

    execute(downloadVideo, {
      url: url.trim(),
      formatId: selectedFormatId,
      outputPath,
    });
  }, [videoInfo, selectedFormatId, url, outputDir, execute]);

  /**
   * 重置所有状态（Reset 按钮 / 取消）
   * @description 清空 URL、视频信息、格式选择，回到初始界面
   */
  const handleReset = useCallback(() => {
    reset();
    setUrl('');
    setVideoInfo(null);
    setSelectedFormatId(null);
    setParseError(null);
  }, [reset]);

  /**
   * 关闭完成通知（不清空界面）
   * @description 下载成功后点 Continue，只关闭通知浮层，保留视频信息和格式选择，
   * 方便用户继续下载其他格式或重新选择，无需重新解析
   */
  const handleDismissCompleted = useCallback(() => {
    reset();
  }, [reset]);

  const isRunning = status === 'running';

  /** 将格式列表分为：视频+音频、仅视频、仅音频 三组 */
  const groupedFormats = videoInfo ? groupFormats(videoInfo.formats) : null;

  return (
    <div className="flex flex-col h-full animate-slide-in-right">
      <PageHeader title={t('features.download.name')} description={t('features.download.description')} />

      <div className="flex-1 overflow-y-auto p-6">
        {/* URL 输入区 */}
        <div className="flex gap-3 mb-6">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !parsing) handleParse();
            }}
            placeholder={t('download.urlPlaceholder')}
            disabled={parsing || isRunning}
            className="flex-1 px-4 py-2.5 rounded-lg outline-none transition-colors"
            style={{
              fontSize: 'var(--font-size-sm)',
              backgroundColor: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
          />
          <button
            onClick={handleParse}
            disabled={!url.trim() || parsing || isRunning}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium cursor-pointer transition-all shrink-0"
            style={{
              fontSize: 'var(--font-size-sm)',
              backgroundColor: (!url.trim() || parsing || isRunning)
                ? 'var(--color-bg-tertiary)'
                : 'var(--color-accent)',
              color: (!url.trim() || parsing || isRunning)
                ? 'var(--color-text-disabled)'
                : 'var(--color-text-inverse)',
              opacity: (!url.trim() || parsing || isRunning) ? 0.6 : 1,
            }}
          >
            {parsing ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Search size={16} />
            )}
            {parsing ? t('download.parsing') : t('download.parse')}
          </button>
        </div>

        {/* 解析错误 */}
        {parseError && (
          <div
            className="p-4 rounded-lg mb-6"
            style={{
              backgroundColor: 'var(--color-error-bg, rgba(239, 68, 68, 0.1))',
              border: '1px solid var(--color-error)',
              color: 'var(--color-error)',
              fontSize: 'var(--font-size-sm)',
            }}
          >
            {parseError}
          </div>
        )}

        {/* 视频信息展示 */}
        {videoInfo && (
          <div className="flex flex-col gap-6">
            {/* 视频卡片 */}
            <div
              className="flex gap-4 p-4 rounded-xl"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
              }}
            >
              {/* 缩略图 */}
              {videoInfo.thumbnail && (
                <div className="shrink-0 w-48 h-28 rounded-lg overflow-hidden bg-black">
                  <img
                    src={videoInfo.thumbnail}
                    alt={videoInfo.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}

              {/* 信息 */}
              <div className="flex flex-col justify-between flex-1 min-w-0">
                <h3
                  className="font-semibold leading-snug line-clamp-2"
                  style={{ fontSize: 'var(--font-size-md)', color: 'var(--color-text-primary)' }}
                >
                  {videoInfo.title}
                </h3>
                <div className="flex items-center gap-4 mt-2">
                  <span
                    className="flex items-center gap-1"
                    style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}
                  >
                    <User size={14} />
                    {videoInfo.uploader}
                  </span>
                  <span
                    className="flex items-center gap-1"
                    style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}
                  >
                    <Clock size={14} />
                    {formatDuration(videoInfo.duration)}
                  </span>
                  <span
                    className="px-2 py-0.5 rounded-md text-xs font-medium"
                    style={{
                      backgroundColor: 'var(--color-accent-light)',
                      color: 'var(--color-accent)',
                    }}
                  >
                    {videoInfo.platform}
                  </span>
                </div>
              </div>
            </div>

            {/* 格式选择 */}
            {groupedFormats && (
              <div className="flex flex-col gap-4">
                <h4
                  className="font-semibold"
                  style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)' }}
                >
                  {t('download.selectFormat')}
                </h4>

                {/* 视频+音频（含自动合并的高清选项） */}
                {groupedFormats.combined.length > 0 && (
                  <FormatGroup
                    label={t('download.videoAudio')}
                    formats={groupedFormats.combined}
                    selectedId={selectedFormatId}
                    onSelect={setSelectedFormatId}
                  />
                )}

                {/* 仅音频 */}
                {groupedFormats.audioOnly.length > 0 && (
                  <FormatGroup
                    label={t('download.audioOnly')}
                    formats={groupedFormats.audioOnly}
                    selectedId={selectedFormatId}
                    onSelect={setSelectedFormatId}
                  />
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 底部操作栏 */}
      <footer
        className="flex items-center justify-between shrink-0 px-6 py-3"
        style={{ borderTop: '1px solid var(--color-divider)' }}
      >
        {/* 重置按钮 */}
        <button
          onClick={isRunning ? cancel : handleReset}
          className="px-4 py-2 rounded-lg cursor-pointer transition-colors"
          style={{
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-text-secondary)',
            backgroundColor: 'var(--color-bg-tertiary)',
          }}
        >
          {isRunning ? t('download.cancelDownload') : t('common.reset')}
        </button>

        {/* 进度面板（下载中） */}
        {isRunning && (
          <ProgressPanel
            status={status}
            progress={progress}
            fileName={videoInfo?.title}
            className="flex-1 mx-4"
          />
        )}

        {/* 开始下载按钮 */}
        {!isRunning && (
          <button
            onClick={handleDownload}
            disabled={!videoInfo || !selectedFormatId}
            className="flex items-center gap-2 px-6 py-2 rounded-lg font-medium cursor-pointer transition-all"
            style={{
              fontSize: 'var(--font-size-sm)',
              backgroundColor: (!videoInfo || !selectedFormatId)
                ? 'var(--color-bg-tertiary)'
                : 'var(--color-accent)',
              color: (!videoInfo || !selectedFormatId)
                ? 'var(--color-text-disabled)'
                : 'var(--color-text-inverse)',
              opacity: (!videoInfo || !selectedFormatId) ? 0.6 : 1,
            }}
          >
            <Download size={16} />
            {t('download.startDownload')}
          </button>
        )}
      </footer>

      {/* 任务完成/失败浮层 */}
      {(status === 'completed' || status === 'failed') && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 animate-slide-in-top">
          <ProgressPanel
            status={status}
            progress={progress}
            error={error}
            onReset={status === 'completed' ? handleDismissCompleted : handleReset}
          />
        </div>
      )}
    </div>
  );
}

// ============================================================
// 辅助组件
// ============================================================

/** FormatGroup 组件 Props */
interface FormatGroupProps {
  /** 分组标签 */
  label: string;
  /** 格式列表 */
  formats: FormatInfo[];
  /** 当前选中的格式 ID */
  selectedId: string | null;
  /** 选中回调 */
  onSelect: (formatId: string) => void;
}

/**
 * 格式分组列表
 *
 * 展示一组可选的下载格式卡片，支持单选
 *
 * @param props - 格式列表和选择回调
 */
function FormatGroup({ label, formats, selectedId, onSelect }: FormatGroupProps) {
  return (
    <div>
      <span
        className="text-xs font-medium uppercase tracking-wider mb-2 block"
        style={{ color: 'var(--color-text-placeholder)' }}
      >
        {label}
      </span>
      <div className="grid grid-cols-2 gap-2">
        {formats.map((f) => {
          const isSelected = f.formatId === selectedId;
          return (
            <button
              key={f.formatId}
              onClick={() => onSelect(f.formatId)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all text-left"
              style={{
                backgroundColor: isSelected
                  ? 'var(--color-accent-light)'
                  : 'var(--color-bg-secondary)',
                border: isSelected
                  ? '1.5px solid var(--color-accent)'
                  : '1px solid var(--color-border)',
              }}
            >
              {/* 选中标记 */}
              <div
                className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
                style={{
                  backgroundColor: isSelected ? 'var(--color-accent)' : 'transparent',
                  border: isSelected ? 'none' : '1.5px solid var(--color-border)',
                }}
              >
                {isSelected && <Check size={12} color="white" />}
              </div>

              {/* 格式信息 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className="font-medium"
                    style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)' }}
                  >
                    {f.height > 0 ? `${f.height}p` : f.formatNote || f.ext.toUpperCase()}
                  </span>
                  <span
                    className="uppercase"
                    style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-placeholder)' }}
                  >
                    {f.ext}
                  </span>
                </div>
                <div
                  className="flex items-center gap-2 mt-0.5"
                  style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}
                >
                  {f.vcodec && <span>{f.vcodec}</span>}
                  {f.acodec && <span>{f.acodec}</span>}
                  {f.filesize > 0 && <span>{formatFileSize(f.filesize)}</span>}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// 辅助函数
// ============================================================

/** 格式分组结果 */
interface GroupedFormats {
  /** 视频+音频（含自动合并的高清选项） */
  combined: FormatInfo[];
  /** 仅音频 */
  audioOnly: FormatInfo[];
}

/**
 * 判断某格式是否为"原生"格式（HTTP 渐进下载，视频+音频完整）
 *
 * yt-dlp 中 protocol 为 "https"/"http" 的格式是原生 HTTP 下载，
 * 视频和音频封装在同一个文件中，最可靠。
 * "m3u8"/"m3u8_native" 是 HLS 自适应流，在 Twitter/X 等平台上
 * 视频流和音频流可能分离，不支持 yt-dlp 的 "video+audio" 合并语法。
 *
 * @param f - 格式信息
 * @returns 是否为原生 HTTP 格式
 */
function isNativeHttpFormat(f: FormatInfo): boolean {
  const p = (f.protocol || '').toLowerCase();
  // https/http 是原生格式；m3u8/m3u8_native/dash 是流媒体格式
  return p === 'https' || p === 'http' || p === '';
}

/**
 * 智能分组：将仅视频格式自动配对最佳音频，生成"视频+音频"合并选项
 *
 * YouTube 等平台的高清视频（720p+）都是 DASH 格式（视频/音频分离），
 * 此函数自动找到最佳音频流，与每个仅视频流配对，生成 `video_id+audio_id`
 * 的格式 ID，yt-dlp 会在下载时自动用 ffmpeg 合并两个流。
 *
 * Twitter/X 等平台同时提供 HTTP 和 HLS 格式：
 * - HTTP 格式（http-*）视频+音频完整，应优先选择
 * - HLS 格式（hls-*）可能无音频，且不支持 + 合并语法
 * 去重时原生 HTTP 格式绝对优先于构造的 HLS+音频合并格式。
 *
 * @param formats - 原始格式列表
 * @returns 分组后的格式（视频+音频、仅音频）
 */
function groupFormats(formats: FormatInfo[]): GroupedFormats {
  const nativeCombined: FormatInfo[] = [];
  const videoOnly: FormatInfo[] = [];
  const audioOnly: FormatInfo[] = [];

  for (const f of formats) {
    if (f.hasVideo && f.hasAudio) {
      nativeCombined.push(f);
    } else if (f.hasVideo) {
      videoOnly.push(f);
    } else if (f.hasAudio) {
      audioOnly.push(f);
    }
  }

  // 找到最佳音频流（优先 m4a/aac，其次按文件大小排序取最大）
  const bestAudio = audioOnly
    .sort((a, b) => {
      // 优先 m4a（兼容性好）
      const aIsM4a = a.ext === 'm4a' || a.acodec.includes('mp4a') ? 1 : 0;
      const bIsM4a = b.ext === 'm4a' || b.acodec.includes('mp4a') ? 1 : 0;
      if (aIsM4a !== bIsM4a) return bIsM4a - aIsM4a;
      // 然后按大小（质量）降序
      return b.filesize - a.filesize;
    })[0];

  // 将仅视频格式与最佳音频配对，生成合并格式
  // 注意：只有非 HLS 格式（HTTP 渐进下载）支持 yt-dlp 的 "video+audio" 合并语法
  const mergedCombined: FormatInfo[] = videoOnly
    .filter((v) => isNativeHttpFormat(v)) // 仅对原生 HTTP 格式做合并，跳过 HLS
    .map((v) => ({
      ...v,
      // yt-dlp 的格式合并语法：video_id+audio_id
      formatId: bestAudio ? `${v.formatId}+${bestAudio.formatId}` : v.formatId,
      hasAudio: true,
      acodec: bestAudio?.acodec || '',
      // 合并后文件大小 ≈ 视频 + 音频
      filesize: v.filesize + (bestAudio?.filesize || 0),
      // 合并后输出 mp4
      ext: 'mp4',
    }));

  // 去重策略（优先级从高到低）：
  //   1. 原生 HTTP 视频+音频（nativeCombined，最可靠）
  //   2. 原生 HTTP 仅视频 + 分离音频构造（mergedCombined）
  // 原生格式放在前面，确保同分辨率时原生格式不被构造格式覆盖。
  // 仅当构造格式文件大小明显更大时才替换（实际上原生一旦占位就不会被覆盖，
  // 因为条件是严格大于，而非大于等于）。
  const allCombined = [...nativeCombined, ...mergedCombined];

  // 按分辨率去重：同一高度只保留优先级最高的格式
  // 原生格式先入 Map，构造格式的 filesize 通常 ≤ 原生，不会替换原生
  const seen = new Map<number, FormatInfo>();
  for (const f of allCombined) {
    const existing = seen.get(f.height);
    if (!existing) {
      // 第一次见到该分辨率，直接加入
      seen.set(f.height, f);
    } else if (!existing.formatId.includes('+') && f.formatId.includes('+')) {
      // 现有是原生（无 +），新的是构造合并（有 +），保留原生，跳过
      // do nothing
    } else if (f.filesize > existing.filesize) {
      // 同类型中保留文件较大（质量更高）的
      seen.set(f.height, f);
    }
  }
  const combined = Array.from(seen.values()).sort((a, b) => b.height - a.height);

  return { combined, audioOnly };
}

/**
 * 选择最佳的默认格式
 *
 * 从智能分组后的合并列表中选择最高分辨率的格式
 *
 * @param formats - 原始格式列表
 * @returns 推荐的格式，无可用格式时返回 null
 */
function pickBestFormat(formats: FormatInfo[]): FormatInfo | null {
  const grouped = groupFormats(formats);
  // 合并列表已按分辨率降序，取第一个即为最高
  if (grouped.combined.length > 0) return grouped.combined[0];
  if (grouped.audioOnly.length > 0) return grouped.audioOnly[0];
  return formats[0] || null;
}
