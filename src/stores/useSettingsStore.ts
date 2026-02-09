/**
 * @file 设置状态
 * @description 管理用户配置的持久化设置状态
 */
import { create } from 'zustand';
import type { AppSettings } from '@/types/settings';
import { DEFAULT_SETTINGS } from '@/types/settings';
import * as settingsService from '@/services/settings';

/** 设置状态接口 */
interface SettingsStoreState extends AppSettings {
  /** 是否已从后端加载 */
  loaded: boolean;
  /** 从后端加载设置 */
  loadSettings: () => Promise<void>;
  /** 更新单个设置项并保存到后端 */
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => Promise<void>;
  /** 批量更新设置并保存到后端 */
  updateSettings: (partial: Partial<AppSettings>) => Promise<void>;
  /** 重置为默认设置 */
  resetToDefaults: () => Promise<void>;
}

/**
 * 从 store 状态中提取纯设置对象（不含 store 方法和内部状态）
 * @param state - 完整的 store 状态
 * @returns 纯 AppSettings 对象
 */
function extractSettings(state: SettingsStoreState): AppSettings {
  return {
    outputDirectory: state.outputDirectory,
    hardwareAccel: state.hardwareAccel,
    maxConcurrent: state.maxConcurrent,
    notifyOnComplete: state.notifyOnComplete,
    openOnComplete: state.openOnComplete,
    outputSuffix: state.outputSuffix,
    overwriteExisting: state.overwriteExisting,
  };
}

/**
 * 将设置保存到后端（静默处理错误）
 * @param settings - 要保存的设置
 */
async function persistSettings(settings: AppSettings): Promise<void> {
  try {
    await settingsService.saveSettings(settings);
  } catch {
    /* 保存失败静默处理，设置已在前端更新 */
  }
}

/**
 * 设置 Store
 *
 * 应用启动时从后端加载设置，修改时即时同步到后端持久化。
 * 各功能页面读取此 store 获取默认输出目录、硬件加速等配置。
 */
export const useSettingsStore = create<SettingsStoreState>((set, get) => ({
  ...DEFAULT_SETTINGS,
  loaded: false,

  loadSettings: async () => {
    try {
      const settings = await settingsService.getSettings();
      set({ ...settings, loaded: true });
    } catch {
      /* 后端未就绪时使用默认值 */
      set({ loaded: true });
    }
  },

  updateSetting: async (key, value) => {
    set({ [key]: value } as Partial<SettingsStoreState>);
    await persistSettings(extractSettings(get()));
  },

  updateSettings: async (partial) => {
    set(partial as Partial<SettingsStoreState>);
    await persistSettings(extractSettings(get()));
  },

  resetToDefaults: async () => {
    set({ ...DEFAULT_SETTINGS });
    await persistSettings(DEFAULT_SETTINGS);
  },
}));
