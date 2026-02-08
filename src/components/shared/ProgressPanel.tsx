/**
 * @file 进度面板组件
 * @description 显示任务执行进度条、速度、预估剩余时间等信息
 */
import type { TaskStatus, ProgressUpdate } from '@/types/task';
import { formatEta, formatFileSize } from '@/lib/format';

/** ProgressPanel 组件 Props */
interface ProgressPanelProps {
  /** 任务状态 */
  status: TaskStatus;
  /** 进度信息 */
  progress: ProgressUpdate | null;
  /** 当前处理的文件名 */
  fileName?: string;
  /** 取消按钮回调 */
  onCancel?: () => void;
  /** 重置按钮回调（完成/失败后） */
  onReset?: () => void;
  /** 错误信息 */
  error?: string | null;
  /** 自定义 CSS class */
  className?: string;
}

/**
 * 进度面板组件
 *
 * 根据任务状态显示不同的 UI：
 * - idle: 显示"开始处理"按钮占位
 * - running: 进度条 + 速度 + ETA + 取消按钮
 * - completed: 完成提示 + 输出信息
 * - failed: 错误信息 + 重试按钮
 *
 * @param props - 进度信息和控制回调
 */
export function ProgressPanel({
  status,
  progress,
  fileName,
  onCancel,
  onReset,
  error,
  className,
}: ProgressPanelProps) {
  const percent = progress?.percent ?? 0;

  return (
    <div
      className={`p-4 rounded-xl ${className ?? ''}`}
      style={{
        backgroundColor: 'var(--color-bg-secondary)',
        border: '1px solid var(--color-border)',
      }}
    >
      {/* 处理中状态 */}
      {status === 'running' && (
        <div className="flex flex-col gap-3">
          {/* 文件名和百分比 */}
          <div className="flex items-center justify-between">
            <span
              className="truncate"
              style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)' }}
            >
              {fileName || '处理中...'}
            </span>
            <span
              className="shrink-0 ml-2 font-medium"
              style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-accent)' }}
            >
              {percent.toFixed(1)}%
            </span>
          </div>

          {/* 进度条 */}
          <div
            className="w-full rounded-full overflow-hidden"
            style={{ height: 'var(--progress-height)', backgroundColor: 'var(--progress-bg)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${percent}%`, backgroundColor: 'var(--progress-fill)' }}
            />
          </div>

          {/* 详细信息 */}
          <div
            className="flex items-center justify-between"
            style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}
          >
            <span>
              {progress?.speed ? `${progress.speed.toFixed(1)}x 速度` : '计算中...'}
              {progress?.outputSize ? ` - ${formatFileSize(progress.outputSize)}` : ''}
            </span>
            <span>
              {progress?.eta ? formatEta(progress.eta) : ''}
            </span>
          </div>

          {/* 取消按钮 */}
          {onCancel && (
            <button
              onClick={onCancel}
              className="self-end px-3 py-1 rounded-md text-sm cursor-pointer transition-colors"
              style={{
                color: 'var(--color-error)',
                backgroundColor: 'transparent',
                border: '1px solid var(--color-error)',
              }}
            >
              取消处理
            </button>
          )}
        </div>
      )}

      {/* 完成状态 */}
      {status === 'completed' && (
        <div className="flex flex-col items-center gap-2 py-2">
          <span
            className="font-medium"
            style={{ fontSize: 'var(--font-size-md)', color: 'var(--color-success)' }}
          >
            处理完成
          </span>
          {onReset && (
            <button
              onClick={onReset}
              className="px-4 py-1.5 rounded-md text-sm cursor-pointer transition-colors"
              style={{
                color: 'var(--color-accent)',
                border: '1px solid var(--color-accent)',
              }}
            >
              继续处理
            </button>
          )}
        </div>
      )}

      {/* 失败状态 */}
      {status === 'failed' && (
        <div className="flex flex-col items-center gap-2 py-2">
          <span
            className="font-medium"
            style={{ fontSize: 'var(--font-size-md)', color: 'var(--color-error)' }}
          >
            处理失败
          </span>
          {error && (
            <p
              className="text-center"
              style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}
            >
              {error}
            </p>
          )}
          {onReset && (
            <button
              onClick={onReset}
              className="px-4 py-1.5 rounded-md text-sm cursor-pointer transition-colors"
              style={{
                color: 'var(--color-accent)',
                border: '1px solid var(--color-accent)',
              }}
            >
              重试
            </button>
          )}
        </div>
      )}

      {/* 空闲和取消状态不显示内容 */}
      {(status === 'idle' || status === 'cancelled') && (
        <div className="flex items-center justify-center py-2">
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-placeholder)' }}>
            {status === 'cancelled' ? '已取消' : '准备就绪'}
          </span>
        </div>
      )}
    </div>
  );
}
