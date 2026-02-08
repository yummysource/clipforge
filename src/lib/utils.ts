/**
 * @file 通用工具函数
 * @description 提供 CSS class 合并等基础工具，供 shadcn/ui 组件使用
 */
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * 合并 CSS class 名称，自动处理 Tailwind CSS 冲突
 *
 * 结合 clsx 的条件拼接能力和 tailwind-merge 的冲突解决能力。
 * 例如：cn('px-2 py-1', condition && 'px-4') 中 px-4 会覆盖 px-2
 *
 * @param inputs - 任意数量的 class 值（字符串、对象、数组等）
 * @returns 合并后的 class 字符串
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
