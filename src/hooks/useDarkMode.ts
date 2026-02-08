/**
 * @file 暗色模式检测 Hook
 * @description 监听系统暗色模式偏好变化，返回当前是否为暗色模式
 */
import { useState, useEffect } from 'react';

/**
 * 检测系统暗色模式偏好的自定义 Hook
 *
 * 使用 matchMedia API 监听 prefers-color-scheme 变化。
 * CSS 变量已通过 @media 自动切换，此 Hook 用于需要在 JS 中判断主题的场景。
 *
 * @returns 当前是否为暗色模式
 */
export function useDarkMode(): boolean {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      setIsDark(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return isDark;
}
