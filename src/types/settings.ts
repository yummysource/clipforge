/**
 * @file 应用设置类型定义
 * @description 定义用户可配置的全局设置选项
 */

/**
 * 应用全局设置
 * @description 持久化存储在 Tauri appData 目录下的设置 JSON 文件中。
 * 前后端字段完全对齐，通过 serde(rename_all = "camelCase") 自动映射
 */
export interface AppSettings {
  /** 默认输出目录路径（空字符串表示输出到源文件所在目录） */
  outputDirectory: string;
  /** 是否启用硬件加速（macOS VideoToolbox） */
  hardwareAccel: boolean;
  /** 最大并发任务数 */
  maxConcurrent: number;
  /** 处理完成后是否发送系统通知 */
  notifyOnComplete: boolean;
  /** 处理完成后是否自动打开输出文件所在目录 */
  openOnComplete: boolean;
  /** 输出文件命名后缀（如 "_output"） */
  outputSuffix: string;
  /** 文件已存在时是否自动覆盖（false 则自动添加序号） */
  overwriteExisting: boolean;
  /** 界面语言（'en' = 英文，'zh' = 中文），默认英文 */
  language: string;
}

/**
 * 应用设置默认值
 * @description 前端初始化时使用的默认设置，会被后端读取的设置覆盖
 */
export const DEFAULT_SETTINGS: AppSettings = {
  outputDirectory: '',
  hardwareAccel: true,
  maxConcurrent: 1,
  notifyOnComplete: true,
  openOnComplete: false,
  outputSuffix: '_output',
  overwriteExisting: false,
  language: 'en',
};
