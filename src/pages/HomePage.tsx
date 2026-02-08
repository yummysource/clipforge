/**
 * @file 首页组件
 * @description 应用首页，展示功能卡片网格（4+3+3 布局），点击卡片进入对应功能页面
 */
import { useNavigate } from 'react-router-dom';
import {
  RefreshCw, Shrink, Scissors, Layers, AudioLines,
  Stamp, Maximize2, Clapperboard, Subtitles, Download,
} from 'lucide-react';
import { FEATURE_CARDS } from '@/lib/constants';

/**
 * lucide-react 图标名称映射表
 * @description 将字符串图标名映射到实际的 React 组件
 */
const ICON_MAP: Record<string, React.ComponentType<{ size?: number }>> = {
  RefreshCw,
  Shrink,
  Scissors,
  Layers,
  AudioLines,
  Stamp,
  Maximize2,
  Clapperboard,
  Subtitles,
  Download,
};

/**
 * 首页组件
 *
 * 显示 4+3+3 功能卡片网格（10 张），每张卡片包含图标、名称和简述。
 * 交互效果：hover 上浮 + 阴影加深，点击缩放动画 + 路由跳转。
 */
export function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center h-full px-8 animate-fade-in">
      {/* 应用标题 */}
      <div className="text-center mb-8">
        <h1
          className="text-3xl font-bold tracking-tight"
          style={{ color: 'var(--color-text-primary)', fontSize: 'var(--font-size-3xl)' }}
        >
          ClipForge
        </h1>
        <p
          className="mt-2"
          style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-md)' }}
        >
          专业的视频处理工具箱
        </p>
      </div>

      {/* 功能卡片网格（自适应列数，最多 4 列） */}
      <div
        className="grid gap-5 justify-center"
        style={{
          gridTemplateColumns: 'repeat(auto-fill, 220px)',
          maxWidth: '940px',
        }}
      >
        {FEATURE_CARDS.map((card) => {
          const IconComponent = ICON_MAP[card.icon];

          return (
            <button
              key={card.id}
              onClick={() => navigate(`/${card.id}`)}
              className="flex flex-col items-center justify-center gap-3 rounded-xl cursor-pointer"
              style={{
                width: '220px',
                height: '170px',
                padding: 'var(--spacing-lg)',
                backgroundColor: 'var(--color-bg-secondary)',
                boxShadow: 'var(--shadow-card)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                transition: 'transform var(--transition-fast), box-shadow var(--transition-fast)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = 'var(--shadow-card-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'var(--shadow-card)';
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = 'scale(0.98)';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
            >
              {/* 功能图标 */}
              <div
                className="flex items-center justify-center w-12 h-12 rounded-xl"
                style={{
                  backgroundColor: 'var(--color-accent-light)',
                  color: 'var(--color-accent)',
                }}
              >
                {IconComponent && <IconComponent size={28} />}
              </div>

              {/* 功能名称 */}
              <span
                className="font-semibold"
                style={{ fontSize: 'var(--font-size-md)', color: 'var(--color-text-primary)' }}
              >
                {card.name}
              </span>

              {/* 功能描述 */}
              <span
                className="text-center leading-snug"
                style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}
              >
                {card.description}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
