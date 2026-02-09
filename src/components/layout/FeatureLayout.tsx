/**
 * @file 功能页面通用布局组件
 * @description 三栏布局模板：左侧文件区(280px) | 中间参数区(自适应) | 右侧预览区(360px)
 *
 * 所有 9 个功能页面复用此布局，通过 children/slots 注入各自内容
 */
import { useCallback } from 'react';
import { PageHeader } from './PageHeader';
import { DropZone } from '@/components/shared/DropZone';
import { FileList } from '@/components/shared/FileList';
import { VideoPreview } from '@/components/shared/VideoPreview';
import { FileInfo } from '@/components/shared/FileInfo';
import { ProgressPanel } from '@/components/shared/ProgressPanel';
import { useAppStore } from '@/stores/useAppStore';
import { useFileDrop } from '@/hooks/useFileDrop';
import { useMediaInfo } from '@/hooks/useMediaInfo';
import { openMultipleFiles } from '@/services/files';
import { VIDEO_EXTENSIONS } from '@/lib/constants';
import { useT } from '@/i18n';
import type { MediaFile } from '@/types/media';
import type { TaskStatus, ProgressUpdate } from '@/types/task';

/** FeatureLayout 组件 Props */
interface FeatureLayoutProps {
  /** 页面标题 */
  title: string;
  /** 页面描述 */
  description?: string;
  /** 中间参数区域内容 */
  children: React.ReactNode;
  /** 任务状态 */
  taskStatus: TaskStatus;
  /** 任务进度 */
  taskProgress: ProgressUpdate | null;
  /** 任务错误信息 */
  taskError?: string | null;
  /** 点击"开始处理"回调 */
  onStart: () => void;
  /** 点击"取消"回调 */
  onCancel: () => void;
  /** 点击"重置"回调 */
  onReset: () => void;
  /** 开始按钮文字 */
  startLabel?: string;
  /** 是否禁用开始按钮 */
  startDisabled?: boolean;
  /** 是否隐藏预览区 */
  hidePreview?: boolean;
  /** 是否隐藏文件信息面板 */
  hideFileInfo?: boolean;
}

/**
 * 功能页面通用三栏布局
 *
 * 提供标准化的功能页面结构：
 * 1. 顶部 PageHeader（面包屑 + 标题）
 * 2. 三栏内容区：文件区 | 参数区 | 预览区
 * 3. 底部操作栏：取消 + 进度/开始按钮
 *
 * @param props - 布局配置和子内容
 */
export function FeatureLayout({
  title,
  description,
  children,
  taskStatus,
  taskProgress,
  taskError,
  onStart,
  onCancel,
  onReset,
  startLabel,
  startDisabled = false,
  hidePreview = false,
  hideFileInfo = false,
}: FeatureLayoutProps) {
  const t = useT();

  /** 计算最终的开始按钮文字：优先使用传入值，否则使用 i18n 默认值 */
  const resolvedStartLabel = startLabel ?? t('layout.startProcessing');

  const files = useAppStore((s) => s.files);
  const selectedIndex = useAppStore((s) => s.selectedFileIndex);
  const addFiles = useAppStore((s) => s.addFiles);
  const removeFile = useAppStore((s) => s.removeFile);
  const setSelectedIndex = useAppStore((s) => s.setSelectedFileIndex);
  const updateFile = useAppStore((s) => s.updateFileMediaInfo);

  const { fetchInfo } = useMediaInfo();

  /** 选中文件 */
  const selectedFile = files[selectedIndex] ?? null;

  /** 处理新文件添加：创建 MediaFile 对象并获取 MediaInfo */
  const handleAddFiles = useCallback(async (paths: string[]) => {
    const newFiles: MediaFile[] = paths.map((p) => ({
      id: crypto.randomUUID(),
      path: p,
      name: p.split('/').pop() ?? p,
      size: 0,
      mediaInfo: null,
      loading: true,
      error: null,
    }));
    addFiles(newFiles);

    /* 异步获取每个文件的媒体信息 */
    for (const file of newFiles) {
      const info = await fetchInfo(file.path);
      if (info) {
        updateFile(file.id, {
          mediaInfo: info,
          size: info.fileSize,
          loading: false,
        });
      } else {
        updateFile(file.id, { loading: false, error: t('file.cannotGetMediaInfo') });
      }
    }
  }, [addFiles, fetchInfo, updateFile, t]);

  /** 文件拖拽 */
  useFileDrop([...VIDEO_EXTENSIONS], handleAddFiles);

  /** 点击选择文件 */
  const handleClickSelect = useCallback(async () => {
    const paths = await openMultipleFiles();
    if (paths.length > 0) {
      await handleAddFiles(paths);
    }
  }, [handleAddFiles]);

  const isRunning = taskStatus === 'running';

  return (
    <div className="flex flex-col h-full animate-slide-in-right">
      {/* 页面头部 */}
      <PageHeader title={title} description={description} />

      {/* 三栏内容区 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧：文件区 */}
        <aside
          className="flex flex-col gap-3 p-4 overflow-y-auto shrink-0"
          style={{
            width: '280px',
            borderRight: '1px solid var(--color-divider)',
          }}
        >
          <DropZone
            isDragging={false}
            hasFiles={files.length > 0}
            onClickSelect={handleClickSelect}
          />
          <FileList
            files={files}
            selectedIndex={selectedIndex}
            onSelect={setSelectedIndex}
            onRemove={removeFile}
          />
        </aside>

        {/* 中间：参数区 */}
        <section className="flex-1 overflow-y-auto p-6">
          {children}
        </section>

        {/* 右侧：预览区 */}
        {!hidePreview && (
          <aside
            className="flex flex-col p-4 overflow-y-auto shrink-0"
            style={{
              width: '360px',
              borderLeft: '1px solid var(--color-divider)',
            }}
          >
            <div className="shrink-0">
              <VideoPreview filePath={selectedFile?.path ?? null} />
            </div>
            {!hideFileInfo && (
              <div className="mt-4">
                <FileInfo mediaInfo={selectedFile?.mediaInfo ?? null} />
              </div>
            )}
          </aside>
        )}
      </div>

      {/* 底部操作栏 */}
      <footer
        className="flex items-center justify-between shrink-0 px-6 py-3"
        style={{ borderTop: '1px solid var(--color-divider)' }}
      >
        {/* 取消按钮 */}
        <button
          onClick={isRunning ? onCancel : onReset}
          className="px-4 py-2 rounded-lg cursor-pointer transition-colors"
          style={{
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-text-secondary)',
            backgroundColor: 'var(--color-bg-tertiary)',
          }}
        >
          {isRunning ? t('common.cancelProcessing') : t('common.reset')}
        </button>

        {/* 进度面板（处理中） */}
        {isRunning && (
          <ProgressPanel
            status={taskStatus}
            progress={taskProgress}
            fileName={selectedFile?.name}
            className="flex-1 mx-4"
          />
        )}

        {/* 开始处理按钮 */}
        {!isRunning && (
          <button
            onClick={onStart}
            disabled={startDisabled || files.length === 0}
            className="px-6 py-2 rounded-lg font-medium cursor-pointer transition-all"
            style={{
              fontSize: 'var(--font-size-sm)',
              backgroundColor: (startDisabled || files.length === 0)
                ? 'var(--color-bg-tertiary)'
                : 'var(--color-accent)',
              color: (startDisabled || files.length === 0)
                ? 'var(--color-text-disabled)'
                : 'var(--color-text-inverse)',
              opacity: (startDisabled || files.length === 0) ? 0.6 : 1,
            }}
          >
            {resolvedStartLabel}
          </button>
        )}
      </footer>

      {/* 任务完成/失败浮层提示 */}
      {(taskStatus === 'completed' || taskStatus === 'failed') && (
        <div
          className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 animate-slide-in-top"
        >
          <ProgressPanel
            status={taskStatus}
            progress={taskProgress}
            error={taskError}
            onReset={onReset}
          />
        </div>
      )}
    </div>
  );
}
