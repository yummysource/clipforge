/**
 * @file i18n 类型定义
 * @description 定义 Locale 类型和 FlatKeys 路径推导工具类型，
 * 用于约束翻译字典的键和提供类型安全的 t() 函数
 */

/** 支持的语言代码 */
export type Locale = 'en' | 'zh';

/**
 * 递归推导嵌套对象的扁平化键路径
 *
 * 将 `{ a: { b: 'hello' } }` 推导为 `'a.b'`，
 * 用于 `t('a.b')` 时的类型检查
 *
 * @template T - 翻译字典的类型
 * @template Prefix - 当前递归路径前缀
 */
export type FlatKeys<T, Prefix extends string = ''> = T extends string
  ? Prefix
  : T extends Record<string, unknown>
    ? {
        [K in keyof T & string]: FlatKeys<
          T[K],
          Prefix extends '' ? K : `${Prefix}.${K}`
        >;
      }[keyof T & string]
    : never;
