/**
 * @file 设置页面
 * @description 应用全局设置页面，管理输出目录、硬件加速、通知等配置
 */
import { useCallback } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { selectDirectory } from '@/services/files';

/**
 * 设置页面组件
 *
 * 展示和修改应用全局设置，包括：
 * - 默认输出目录
 * - 硬件加速开关
 * - 最大并发数
 * - 通知和自动打开目录
 * - 输出文件命名后缀
 * - 文件覆盖策略
 */
export function SettingsPage() {
  const settings = useSettingsStore();

  /** 选择输出目录 */
  const handleSelectOutputDir = useCallback(async () => {
    const dir = await selectDirectory();
    if (dir) {
      settings.updateSetting('outputDirectory', dir);
    }
  }, [settings]);

  /** 渲染开关控件 */
  const renderSwitch = (
    value: boolean,
    onChange: (v: boolean) => void,
  ) => (
    <button
      onClick={() => onChange(!value)}
      className="relative w-10 h-6 rounded-full transition-colors cursor-pointer shrink-0"
      style={{
        backgroundColor: value ? 'var(--color-accent)' : 'var(--color-bg-tertiary)',
        border: '1px solid var(--color-border)',
      }}
    >
      <span
        className="absolute top-0.5 w-4 h-4 rounded-full transition-transform"
        style={{
          left: value ? '20px' : '2px',
          backgroundColor: value ? 'white' : 'var(--color-text-placeholder)',
        }}
      />
    </button>
  );

  /** 渲染设置行 */
  const renderRow = (
    label: string,
    desc: string,
    control: React.ReactNode,
  ) => (
    <div className="flex items-center justify-between py-3"
      style={{ borderBottom: '1px solid var(--color-divider)' }}>
      <div className="flex-1 min-w-0 mr-4">
        <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{label}</p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{desc}</p>
      </div>
      {control}
    </div>
  );

  return (
    <div className="flex flex-col h-full animate-slide-in-right">
      <PageHeader title="设置" />

      <div className="flex-1 overflow-y-auto p-6" style={{ maxWidth: '640px' }}>
        {/* 输出设置 */}
        <h3 className="text-sm font-semibold mb-3 uppercase tracking-wider"
          style={{ color: 'var(--color-text-secondary)' }}>
          输出设置
        </h3>

        {renderRow(
          '默认输出目录',
          settings.outputDirectory || '未设置（使用源文件目录）',
          <button onClick={handleSelectOutputDir}
            className="px-3 py-1.5 rounded-lg text-sm cursor-pointer"
            style={{ backgroundColor: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', color: 'var(--color-accent)' }}>
            选择目录
          </button>
        )}

        {renderRow(
          '与源文件同目录',
          '输出文件保存到源文件所在目录',
          renderSwitch(settings.sameAsSource, (v) => settings.updateSetting('sameAsSource', v))
        )}

        {renderRow(
          '输出文件后缀',
          `输出文件名添加后缀（当前: "${settings.outputSuffix}"）`,
          <input type="text" value={settings.outputSuffix}
            onChange={(e) => settings.updateSetting('outputSuffix', e.target.value)}
            className="w-32 px-2 py-1 rounded-md text-sm text-right"
            style={{ backgroundColor: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }} />
        )}

        {renderRow(
          '自动覆盖已有文件',
          '输出路径存在同名文件时自动覆盖',
          renderSwitch(settings.overwriteExisting, (v) => settings.updateSetting('overwriteExisting', v))
        )}

        {/* 性能设置 */}
        <h3 className="text-sm font-semibold mt-8 mb-3 uppercase tracking-wider"
          style={{ color: 'var(--color-text-secondary)' }}>
          性能设置
        </h3>

        {renderRow(
          '硬件加速',
          '使用 macOS VideoToolbox 加速编解码',
          renderSwitch(settings.hardwareAccel, (v) => settings.updateSetting('hardwareAccel', v))
        )}

        {renderRow(
          '最大并发任务',
          `同时处理的最大任务数量（当前: ${settings.maxConcurrent}）`,
          <select value={settings.maxConcurrent}
            onChange={(e) => settings.updateSetting('maxConcurrent', Number(e.target.value))}
            className="px-2 py-1 rounded-md text-sm"
            style={{ backgroundColor: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}>
            {[1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        )}

        {/* 通知设置 */}
        <h3 className="text-sm font-semibold mt-8 mb-3 uppercase tracking-wider"
          style={{ color: 'var(--color-text-secondary)' }}>
          通知设置
        </h3>

        {renderRow(
          '完成通知',
          '处理完成后发送系统通知',
          renderSwitch(settings.notifyOnComplete, (v) => settings.updateSetting('notifyOnComplete', v))
        )}

        {renderRow(
          '自动打开目录',
          '处理完成后自动打开输出文件所在目录',
          renderSwitch(settings.openOnComplete, (v) => settings.updateSetting('openOnComplete', v))
        )}

        {/* 重置 */}
        <div className="mt-8 mb-4">
          <button onClick={() => settings.resetToDefaults()}
            className="px-4 py-2 rounded-lg text-sm cursor-pointer"
            style={{ color: 'var(--color-error)', border: '1px solid var(--color-error)' }}>
            恢复默认设置
          </button>
        </div>
      </div>
    </div>
  );
}
