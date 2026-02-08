/**
 * @file 设置服务
 * @description 封装应用设置的读写操作，通过 Tauri invoke 与后端交互
 */
import { invoke } from '@tauri-apps/api/core';
import type { AppSettings } from '@/types/settings';

/**
 * 从后端读取应用设置
 *
 * @returns 当前的应用设置，后端不存在时返回默认值
 */
export async function getSettings(): Promise<AppSettings> {
  return invoke<AppSettings>('get_settings');
}

/**
 * 保存应用设置到后端
 *
 * 后端将设置写入 appData 目录下的 JSON 文件
 *
 * @param settings - 要保存的设置对象
 */
export async function saveSettings(settings: AppSettings): Promise<void> {
  return invoke('save_settings', { settings });
}
