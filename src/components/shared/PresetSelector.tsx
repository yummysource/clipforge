/**
 * @file 预设选择器组件
 * @description 显示预设标签按钮组，选中预设自动填充参数
 */
import { useT } from '@/i18n';

/** 预设选项 */
interface PresetOption {
  /** 预设 ID */
  id: string;
  /** 预设名称（非 i18n 时的回退文案） */
  name: string;
  /** 预设描述（非 i18n 时的回退文案） */
  description: string;
  /** i18n 名称键（如 'presets.socialMedia'），优先于 name */
  nameKey?: string;
  /** i18n 描述键（如 'presets.socialMediaDesc'），优先于 description */
  descKey?: string;
}

/** PresetSelector 组件 Props */
interface PresetSelectorProps {
  /** 可选的预设列表 */
  presets: PresetOption[];
  /** 当前选中的预设 ID */
  selectedId: string;
  /** 选中预设时的回调 */
  onSelect: (presetId: string) => void;
  /** 标题（不传时使用 i18n 默认值 'presets.title'） */
  title?: string;
  /** 自定义 CSS class */
  className?: string;
}

/**
 * 预设选择器组件
 *
 * 以标签按钮组形式展示预设列表，选中项高亮显示。
 * 每个预设显示名称，鼠标悬停显示描述。
 * 支持通过 nameKey/descKey 读取 i18n 翻译。
 *
 * @param props - 预设列表和选中状态
 */
export function PresetSelector({
  presets,
  selectedId,
  onSelect,
  title,
  className,
}: PresetSelectorProps) {
  const t = useT();

  /** 显示标题：优先使用外部传入的 title，否则用 i18n 默认值 */
  const displayTitle = title ?? t('presets.title');

  return (
    <div className={className}>
      <label
        className="block mb-2 font-medium"
        style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)' }}
      >
        {displayTitle}
      </label>

      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => {
          const isActive = preset.id === selectedId;
          /** 优先从 i18n 键获取名称，否则回退到 name 字段 */
          const displayName = preset.nameKey
            ? t(preset.nameKey as any)
            : preset.name;
          /** 优先从 i18n 键获取描述，否则回退到 description 字段 */
          const displayDesc = preset.descKey
            ? t(preset.descKey as any)
            : preset.description;
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
              title={displayDesc}
            >
              {displayName}
            </button>
          );
        })}
      </div>
    </div>
  );
}
