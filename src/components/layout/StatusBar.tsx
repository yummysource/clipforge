/**
 * @file 底部状态栏组件
 * @description 显示 ffmpeg 版本信息、快捷提示、活跃任务数量
 */
import { useAppStore } from '@/stores/useAppStore';
import { useTaskStore } from '@/stores/useTaskStore';
import { useT } from '@/i18n';

/**
 * 底部状态栏
 *
 * 固定在窗口底部，三栏布局：
 * - 左侧：ffmpeg 版本信息
 * - 中间：快捷操作提示
 * - 右侧：活跃任务数量
 */
export function StatusBar() {
  const ffmpegVersion = useAppStore((s) => s.ffmpegVersion);
  const runningCount = useTaskStore((s) => s.getRunningCount());
  const t = useT();

  return (
    <footer
      className="flex items-center justify-between shrink-0 px-4"
      style={{
        height: '32px',
        borderTop: '1px solid var(--color-divider)',
        backgroundColor: 'var(--color-bg-primary)',
        fontSize: 'var(--font-size-xs)',
        color: 'var(--color-text-secondary)',
      }}
    >
      {/* 左侧：ffmpeg 版本 */}
      <div className="flex items-center gap-1">
        <span>{ffmpegVersion || 'ffmpeg'}</span>
      </div>

      {/* 中间：提示 */}
      <div>
        {t('layout.dragToStart')}
      </div>

      {/* 右侧：任务数量 */}
      <div className="flex items-center gap-1">
        {runningCount > 0 ? (
          <span style={{ color: 'var(--color-accent)' }}>
            {t('layout.tasksRunning', { count: runningCount })}
          </span>
        ) : (
          <span>{t('layout.noActiveTasks')}</span>
        )}
      </div>
    </footer>
  );
}
