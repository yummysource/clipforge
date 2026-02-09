/**
 * @file i18n hook 和工具函数
 * @description 提供 useT()（组件用）和 getT()（非组件用）两种获取翻译函数的方式。
 * 翻译函数支持用 `{key}` 占位符做简单插值
 */
import { useSettingsStore } from '@/stores/useSettingsStore';
import type { Locale, FlatKeys } from './types';
import type { Translations } from './en';
import en from './en';
import zh from './zh';

/** 所有语言字典映射 */
const dictionaries: Record<Locale, Translations> = { en, zh };

/**
 * 根据点分路径（如 'common.start'）从嵌套对象中取值
 *
 * @param obj - 翻译字典
 * @param path - 点分键路径
 * @returns 路径对应的字符串，未找到则返回路径本身作为 fallback
 */
function resolve(obj: Translations, path: string): string {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  let current: any = obj;
  for (const key of path.split('.')) {
    if (current == null || typeof current !== 'object') return path;
    current = current[key];
  }
  return typeof current === 'string' ? current : path;
}

/**
 * 简单模板插值：将 `{key}` 替换为对应的值
 *
 * @param template - 包含占位符的模板字符串
 * @param args - 替换参数，可以是单个值或键值对
 * @returns 替换后的字符串
 *
 * @example
 * interpolate('{count} files added', { count: 3 })  // "3 files added"
 * interpolate('~{value}s', { value: 5 })             // "~5s"
 */
function interpolate(template: string, args?: Record<string, string | number>): string {
  if (!args) return template;
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const val = args[key];
    return val !== undefined ? String(val) : `{${key}}`;
  });
}

/** 翻译函数类型 — 接受键路径和可选插值参数 */
export type TFunction = (
  key: FlatKeys<Translations>,
  args?: Record<string, string | number>,
) => string;

/**
 * 创建翻译函数
 *
 * @param locale - 当前语言
 * @returns 翻译函数 t()
 */
function createT(locale: Locale): TFunction {
  const dict = dictionaries[locale] ?? dictionaries.en;
  return (key, args) => interpolate(resolve(dict, key), args);
}

/**
 * React Hook — 在组件中使用翻译
 *
 * 自动订阅 settings store 中的 language 字段，
 * 语言切换时组件自动重新渲染
 *
 * @returns 翻译函数 t()
 *
 * @example
 * const t = useT();
 * return <span>{t('common.start')}</span>;
 */
export function useT(): TFunction {
  const locale = useSettingsStore((s) => s.language) as Locale;
  return createT(locale);
}

/**
 * 非组件环境获取翻译函数
 *
 * 每次调用时从 store 读取当前语言。
 * 适用于 constants.ts、format.ts 等非 React 组件场景。
 *
 * 注意：返回的函数是即时调用的，不会自动触发 React 重渲染。
 * 如果在组件渲染中使用，请改用 useT()。
 *
 * @returns 翻译函数 t()
 *
 * @example
 * const t = getT();
 * console.log(t('features.convert.name')); // "Convert" 或 "格式转换"
 */
export function getT(): TFunction {
  const locale = (useSettingsStore.getState().language ?? 'en') as Locale;
  return createT(locale);
}
