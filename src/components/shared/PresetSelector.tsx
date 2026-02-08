/**
 * @file 预设选择器组件
 * @description 显示预设标签按钮组，选中预设自动填充参数
 */

/** 预设选项 */
interface PresetOption {
  /** 预设 ID */
  id: string;
  /** 预设名称 */
  name: string;
  /** 预设描述 */
  description: string;
}

/** PresetSelector 组件 Props */
interface PresetSelectorProps {
  /** 可选的预设列表 */
  presets: PresetOption[];
  /** 当前选中的预设 ID */
  selectedId: string;
  /** 选中预设时的回调 */
  onSelect: (presetId: string) => void;
  /** 标题 */
  title?: string;
  /** 自定义 CSS class */
  className?: string;
}

/**
 * 预设选择器组件
 *
 * 以标签按钮组形式展示预设列表，选中项高亮显示。
 * 每个预设显示名称，鼠标悬停显示描述。
 *
 * @param props - 预设列表和选中状态
 */
export function PresetSelector({
  presets,
  selectedId,
  onSelect,
  title = '预设方案',
  className,
}: PresetSelectorProps) {
  return (
    <div className={className}>
      <label
        className="block mb-2 font-medium"
        style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)' }}
      >
        {title}
      </label>

      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => {
          const isActive = preset.id === selectedId;
          return (
            <button
              key={preset.id}
              onClick={() => onSelect(preset.id)}
              className="px-3 py-1.5 rounded-lg transition-all cursor-pointer"
              style={{
                fontSize: 'var(--font-size-sm)',
                backgroundColor: isActive ? 'var(--color-accent)' : 'var(--color-bg-tertiary)',
                color: isActive ? 'var(--color-text-inverse)' : 'var(--color-text-primary)',
                border: isActive ? '1px solid var(--color-accent)' : '1px solid var(--color-border)',
              }}
              title={preset.description}
            >
              {preset.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
