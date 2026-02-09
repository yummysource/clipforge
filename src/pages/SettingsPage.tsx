/**
 * @file 设置页面
 * @description 应用全局设置页面，管理输出目录、硬件加速、通知等配置
 */
import { useCallback } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { selectDirectory } from '@/services/files';

/**
 * 开关控件
 *
 * @param value - 当前开关状态
 * @param onChange - 状态变化回调
 */
function SettingSwitch({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
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
}

/**
 * 设置行容器
 *
 * @param label - 设置项标题
 * @param desc - 设置项描述
 * @param control - 右侧控件
 */
function SettingRow({ label, desc, control }: { label: string; desc: string; control: React.ReactNode }) {
  return (
    <div
      className="flex items-center justify-between py-3"
      style={{ borderBottom: '1px solid var(--color-divider)' }}
    >
      <div className="flex-1 min-w-0 mr-4">
        <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{label}</p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{desc}</p>
      </div>
      {control}
    </div>
  );
}

/**
 * 设置分组标题
 *
 * @param title - 分组标题文字
 * @param className - 额外的 CSS 类名
 */
function SectionTitle({ title, className = '' }: { title: string; className?: string }) {
  return (
    <h3
      className={`text-sm font-semibold mb-3 uppercase tracking-wider ${className}`}
      style={{ color: 'var(--color-text-secondary)' }}
    >
      {title}
    </h3>
  );
}

/**
 * 设置页面组件
 *
 * 展示和修改应用全局设置，包括：
 * - 输出目录（同源目录开关 + 自定义目录选择）
 * - 输出文件后缀和覆盖策略
 * - 硬件加速和并发数
 * - 通知和自动打开目录
 */
export function SettingsPage() {
  const settings = useSettingsStore();

  /** 输出目录是否使用源文件同目录（outputDirectory 为空即表示同源目录） */
  const isSameAsSource = !settings.outputDirectory;

  /** 切换"同源目录"开关 */
  const handleToggleSameAsSource = useCallback(async (sameAsSource: boolean) => {
    if (sameAsSource) {
      /* 开启同源目录：清空 outputDirectory */
      settings.updateSetting('outputDirectory', '');
    } else {
      /* 关闭同源目录：弹出目录选择器，用户取消则保持不变 */
      const dir = await selectDirectory();
      if (dir) {
        settings.updateSetting('outputDirectory', dir);
      }
    }
  }, [settings]);

  /** 选择自定义输出目录（已设置目录后重新选择） */
  const handleSelectOutputDir = useCallback(async () => {
    const dir = await selectDirectory();
    if (dir) {
      settings.updateSetting('outputDirectory', dir);
    }
  }, [settings]);

  return (
    <div className="flex flex-col h-full animate-slide-in-right">
      <PageHeader title="设置" />

      <div className="flex-1 overflow-y-auto p-6" style={{ maxWidth: '640px' }}>
        {/* ── 输出设置 ── */}
        <SectionTitle title="输出设置" />

        {/* 同源目录开关 */}
        <SettingRow
          label="默认输出目录同源目录"
          desc="开启后输出文件保存到源文件所在目录"
          control={
            <SettingSwitch
              value={isSameAsSource}
              onChange={handleToggleSameAsSource}
            />
          }
        />

        {/* 自定义输出目录（仅在关闭同源目录时显示） */}
        {!isSameAsSource && (
          <SettingRow
            label="输出目录"
            desc={settings.outputDirectory}
            control={
              <button
                onClick={handleSelectOutputDir}
                className="px-3 py-1.5 rounded-lg text-sm cursor-pointer"
                style={{
                  backgroundColor: 'var(--color-bg-tertiary)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-accent)',
                }}
              >
                选择目录
              </button>
            }
          />
        )}

        <SettingRow
          label="输出文件后缀"
          desc={`输出文件名添加后缀（当前: "${settings.outputSuffix}"）`}
          control={
            <input
              type="text"
              value={settings.outputSuffix}
              onChange={(e) => settings.updateSetting('outputSuffix', e.target.value)}
              className="w-32 px-2 py-1 rounded-md text-sm text-right"
              style={{
                backgroundColor: 'var(--color-bg-tertiary)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
            />
          }
        />

        <SettingRow
          label="自动覆盖已有文件"
          desc="输出路径存在同名文件时自动覆盖"
          control={
            <SettingSwitch
              value={settings.overwriteExisting}
              onChange={(v) => settings.updateSetting('overwriteExisting', v)}
            />
          }
        />

        {/* ── 性能设置 ── */}
        <SectionTitle title="性能设置" className="mt-8" />

        <SettingRow
          label="硬件加速"
          desc="使用 macOS VideoToolbox 加速编解码"
          control={
            <SettingSwitch
              value={settings.hardwareAccel}
              onChange={(v) => settings.updateSetting('hardwareAccel', v)}
            />
          }
        />

        <SettingRow
          label="最大并发任务"
          desc={`同时处理的最大任务数量（当前: ${settings.maxConcurrent}）`}
          control={
            <select
              value={settings.maxConcurrent}
              onChange={(e) => settings.updateSetting('maxConcurrent', Number(e.target.value))}
              className="px-2 py-1 rounded-md text-sm"
              style={{
                backgroundColor: 'var(--color-bg-tertiary)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
            >
              {[1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          }
        />

        {/* ── 通知设置 ── */}
        <SectionTitle title="通知设置" className="mt-8" />

        <SettingRow
          label="完成通知"
          desc="处理完成后发送系统通知"
          control={
            <SettingSwitch
              value={settings.notifyOnComplete}
              onChange={(v) => settings.updateSetting('notifyOnComplete', v)}
            />
          }
        />

        <SettingRow
          label="自动打开目录"
          desc="处理完成后自动打开输出文件所在目录"
          control={
            <SettingSwitch
              value={settings.openOnComplete}
              onChange={(v) => settings.updateSetting('openOnComplete', v)}
            />
          }
        />

        {/* ── 重置 ── */}
        <div className="mt-8 mb-4">
          <button
            onClick={() => settings.resetToDefaults()}
            className="px-4 py-2 rounded-lg text-sm cursor-pointer"
            style={{ color: 'var(--color-error)', border: '1px solid var(--color-error)' }}
          >
            恢复默认设置
          </button>
        </div>
      </div>
    </div>
  );
}
