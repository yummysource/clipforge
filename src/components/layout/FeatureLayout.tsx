/**
 * @file Feature page common layout component
 * @description Three-column layout template: left file area (280px) | middle params area (auto) | right preview area (360px)
 *
 * All 9 feature pages reuse this layout, injecting their own content via children/slots.
 * Supports a "Preview" / "Result" tab toggle in the right panel to show source or output file.
 */
import { useState, useCallback, useEffect } from 'react';
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
import type { TaskStatus, ProgressUpdate, TaskResult } from '@/types/task';

/** Right panel tab type — preview shows source file, result shows output file */
type RightPanelTab = 'preview' | 'result';

/** FeatureLayout component Props */
interface FeatureLayoutProps {
  /** Page title */
  title: string;
  /** Page description */
  description?: string;
  /** Middle parameter area content */
  children: React.ReactNode;
  /** Task status */
  taskStatus: TaskStatus;
  /** Task progress */
  taskProgress: ProgressUpdate | null;
  /** Task error message */
  taskError?: string | null;
  /** "Start" button callback */
  onStart: () => void;
  /** "Cancel" button callback */
  onCancel: () => void;
  /** "Reset" button callback — full reset (clears files + task state) */
  onReset: () => void;
  /** Task result — provides outputPath for result preview */
  taskResult?: TaskResult | null;
  /** Start button label */
  startLabel?: string;
  /** Whether to disable start button */
  startDisabled?: boolean;
  /** Whether to hide the preview area */
  hidePreview?: boolean;
  /** Whether to hide file info panel */
  hideFileInfo?: boolean;
}

/**
 * Feature page common three-column layout
 *
 * Provides standardized feature page structure:
 * 1. Top PageHeader (breadcrumb + title)
 * 2. Three-column content area: file area | params area | preview area
 * 3. Bottom action bar: cancel + progress/start button
 *
 * The right panel supports tab switching between "Preview" (source file)
 * and "Result" (output file) when a task result is available.
 *
 * @param props - Layout config and child content
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
  taskResult,
  startLabel,
  startDisabled = false,
  hidePreview = false,
  hideFileInfo = false,
}: FeatureLayoutProps) {
  const t = useT();

  /** Resolved start button label — use passed value or i18n default */
  const resolvedStartLabel = startLabel ?? t('layout.startProcessing');

  const files = useAppStore((s) => s.files);
  const selectedIndex = useAppStore((s) => s.selectedFileIndex);
  const addFiles = useAppStore((s) => s.addFiles);
  const removeFile = useAppStore((s) => s.removeFile);
  const setSelectedIndex = useAppStore((s) => s.setSelectedFileIndex);
  const updateFile = useAppStore((s) => s.updateFileMediaInfo);

  const { fetchInfo } = useMediaInfo();

  /** Second useMediaInfo instance for fetching output file info in "Result" tab */
  const {
    mediaInfo: resultMediaInfo,
    fetchInfo: fetchResultInfo,
    clear: clearResultInfo,
  } = useMediaInfo();

  /** Right panel tab state */
  const [rightPanelTab, setRightPanelTab] = useState<RightPanelTab>('preview');

  /** Whether the completion/failure overlay has been dismissed by the user */
  const [overlayDismissed, setOverlayDismissed] = useState(false);

  /** Selected source file */
  const selectedFile = files[selectedIndex] ?? null;

  /** Auto-switch to "result" tab when task completes with outputPath */
  useEffect(() => {
    if (taskStatus === 'completed' && taskResult?.outputPath) {
      setRightPanelTab('result');
      fetchResultInfo(taskResult.outputPath);
    }
  }, [taskStatus, taskResult?.outputPath, fetchResultInfo]);

  /** Reset overlay dismissed flag when a new task starts running */
  useEffect(() => {
    if (taskStatus === 'running') {
      setOverlayDismissed(false);
    }
  }, [taskStatus]);

  /** Handle adding new files: create MediaFile objects and fetch MediaInfo */
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

    /* Async fetch media info for each file */
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

  /** File drag-and-drop */
  useFileDrop([...VIDEO_EXTENSIONS], handleAddFiles);

  /** Click to select files */
  const handleClickSelect = useCallback(async () => {
    const paths = await openMultipleFiles();
    if (paths.length > 0) {
      await handleAddFiles(paths);
    }
  }, [handleAddFiles]);

  /**
   * Full reset handler — wraps onReset to also reset tab state, clear result info,
   * and reset overlay dismissed flag
   */
  const handleFullReset = useCallback(() => {
    onReset();
    setRightPanelTab('preview');
    clearResultInfo();
    setOverlayDismissed(false);
  }, [onReset, clearResultInfo]);

  /**
   * Dismiss overlay — only hides the notification overlay.
   * Does NOT clear task result or files, so the Result tab stays visible.
   */
  const handleDismissOverlay = useCallback(() => {
    setOverlayDismissed(true);
  }, []);

  const isRunning = taskStatus === 'running';

  /** Determine what to show in the right panel based on active tab */
  const showResultTab = rightPanelTab === 'result' && taskResult?.outputPath;
  const previewFilePath = showResultTab ? taskResult.outputPath : (selectedFile?.path ?? null);
  const previewMediaInfo = showResultTab ? resultMediaInfo : (selectedFile?.mediaInfo ?? null);

  return (
    <div className="flex flex-col h-full animate-slide-in-right">
      {/* Page header */}
      <PageHeader title={title} description={description} />

      {/* Three-column content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: file area */}
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

        {/* Middle: params area */}
        <section className="flex-1 overflow-y-auto p-6">
          {children}
        </section>

        {/* Right: preview / result area */}
        {!hidePreview && (
          <aside
            className="flex flex-col p-4 overflow-y-auto shrink-0"
            style={{
              width: '360px',
              borderLeft: '1px solid var(--color-divider)',
            }}
          >
            {/* Tab toggle buttons — always visible; Result tab disabled when no output */}
              <div
                className="flex mb-3 rounded-lg overflow-hidden shrink-0"
                style={{
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-bg-tertiary)',
                }}
              >
                <button
                  onClick={() => setRightPanelTab('preview')}
                  className="flex-1 px-3 py-1.5 text-center cursor-pointer transition-colors"
                  style={{
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: rightPanelTab === 'preview' ? 600 : 400,
                    color: rightPanelTab === 'preview'
                      ? 'var(--color-text-inverse)'
                      : 'var(--color-text-secondary)',
                    backgroundColor: rightPanelTab === 'preview'
                      ? 'var(--color-accent)'
                      : 'transparent',
                  }}
                >
                  {t('layout.previewTab')}
                </button>
                <button
                  onClick={() => taskResult?.outputPath && setRightPanelTab('result')}
                  disabled={!taskResult?.outputPath}
                  className="flex-1 px-3 py-1.5 text-center transition-colors"
                  style={{
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: rightPanelTab === 'result' ? 600 : 400,
                    cursor: taskResult?.outputPath ? 'pointer' : 'not-allowed',
                    opacity: taskResult?.outputPath ? 1 : 0.4,
                    color: rightPanelTab === 'result'
                      ? 'var(--color-text-inverse)'
                      : 'var(--color-text-secondary)',
                    backgroundColor: rightPanelTab === 'result'
                      ? 'var(--color-accent)'
                      : 'transparent',
                  }}
                >
                  {t('layout.resultTab')}
                </button>
              </div>

            {/* Video preview — source or output depending on tab */}
            <div className="shrink-0">
              <VideoPreview filePath={previewFilePath} />
            </div>

            {/* File info — source or output depending on tab */}
            {!hideFileInfo && (
              <div className="mt-4">
                <FileInfo mediaInfo={previewMediaInfo} />
              </div>
            )}
          </aside>
        )}
      </div>

      {/* Bottom action bar */}
      <footer
        className="flex items-center justify-between shrink-0 px-6 py-3"
        style={{ borderTop: '1px solid var(--color-divider)' }}
      >
        {/* Cancel / Reset button */}
        <button
          onClick={isRunning ? onCancel : handleFullReset}
          className="px-4 py-2 rounded-lg cursor-pointer transition-colors"
          style={{
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-text-secondary)',
            backgroundColor: 'var(--color-bg-tertiary)',
          }}
        >
          {isRunning ? t('common.cancelProcessing') : t('common.reset')}
        </button>

        {/* Progress panel (while running) */}
        {isRunning && (
          <ProgressPanel
            status={taskStatus}
            progress={taskProgress}
            fileName={selectedFile?.name}
            className="flex-1 mx-4"
          />
        )}

        {/* Start button */}
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

      {/* Task completion/failure overlay — dismiss only hides it, keeps result intact */}
      {(taskStatus === 'completed' || taskStatus === 'failed') && !overlayDismissed && (
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 animate-slide-in-top"
        >
          <ProgressPanel
            status={taskStatus}
            progress={taskProgress}
            error={taskError}
            onReset={handleDismissOverlay}
          />
        </div>
      )}
    </div>
  );
}
