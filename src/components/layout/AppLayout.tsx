/**
 * @file 应用主布局组件
 * @description 全屏 flex 布局容器，包含顶部标题栏和底部状态栏
 *
 * 使用 React Router Outlet 渲染子路由页面内容
 */
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Settings } from 'lucide-react';
import { StatusBar } from './StatusBar';

/**
 * 应用主布局组件
 *
 * 提供全屏布局结构：顶部可拖拽标题栏 + 中间内容区（Outlet） + 底部状态栏。
 * 标题栏与 macOS 窗口标题栏融合，支持拖拽移动窗口。
 */
export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  /** 是否在首页 */
  const isHome = location.pathname === '/';

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden"
         style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      {/* 顶部标题栏 — 与 macOS 窗口标题栏融合 */}
      <header
        className="flex items-center justify-between shrink-0 px-4"
        style={{
          height: '48px',
          /* Tauri: 允许拖拽移动窗口 */
          WebkitAppRegion: 'drag' as unknown as string,
          borderBottom: `1px solid var(--color-divider)`,
        } as React.CSSProperties}
      >
        {/* 左侧留空给 macOS 交通灯按钮 */}
        <div className="w-20" />

        {/* 中间：应用名或当前页面标题 */}
        <div
          className="text-sm font-medium"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {isHome ? 'ClipForge' : ''}
        </div>

        {/* 右侧：设置按钮 */}
        <div className="w-20 flex justify-end">
          <button
            onClick={() => navigate('/settings')}
            className="p-1.5 rounded-md transition-colors cursor-pointer"
            style={{
              WebkitAppRegion: 'no-drag' as unknown as string,
              color: 'var(--color-text-secondary)',
            } as React.CSSProperties}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            title="设置"
          >
            <Settings size={18} />
          </button>
        </div>
      </header>

      {/* 主内容区 — 由子路由填充 */}
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>

      {/* 底部状态栏 */}
      <StatusBar />
    </div>
  );
}
