/**
 * @file 页面头部组件
 * @description 功能页面顶部的导航面包屑和标题，包含返回首页按钮
 */
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

/** PageHeader 组件 Props */
interface PageHeaderProps {
  /** 页面标题 */
  title: string;
  /** 可选的页面描述 */
  description?: string;
}

/**
 * 功能页面头部组件
 *
 * 显示返回按钮 + 面包屑导航（首页 > 当前页面） + 页面标题。
 * 点击返回按钮或面包屑中的"首页"可返回首页。
 *
 * @param props - 页面标题和描述
 */
export function PageHeader({ title, description }: PageHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="shrink-0 px-6 py-4" style={{ borderBottom: '1px solid var(--color-divider)' }}>
      {/* 面包屑导航 */}
      <div className="flex items-center gap-2 mb-1">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1 text-sm transition-colors cursor-pointer"
          style={{ color: 'var(--color-accent)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '0.8';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '1';
          }}
        >
          <ArrowLeft size={16} />
          <span>首页</span>
        </button>
        <span className="text-sm" style={{ color: 'var(--color-text-placeholder)' }}>/</span>
        <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{title}</span>
      </div>

      {/* 页面标题 */}
      <h1 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
        {title}
      </h1>

      {/* 可选描述 */}
      {description && (
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
          {description}
        </p>
      )}
    </div>
  );
}
