/**
 * @file 文件操作服务
 * @description 封装文件对话框、路径处理等文件系统操作
 */
import { open, save } from '@tauri-apps/plugin-dialog';
import { VIDEO_EXTENSIONS, AUDIO_EXTENSIONS, SUBTITLE_EXTENSIONS } from '@/lib/constants';

/**
 * 打开文件选择对话框，选择单个视频文件
 *
 * @returns 选中的文件路径，用户取消时返回 null
 */
export async function openVideoFile(): Promise<string | null> {
  const result = await open({
    multiple: false,
    filters: [{
      name: '视频文件',
      extensions: [...VIDEO_EXTENSIONS],
    }],
  });
  /* open 返回 string | string[] | null，单文件模式返回 string | null */
  if (typeof result === 'string') return result;
  return null;
}

/**
 * 打开文件选择对话框，选择多个视频文件
 *
 * @returns 选中的文件路径数组，用户取消时返回空数组
 */
export async function openMultipleFiles(): Promise<string[]> {
  const result = await open({
    multiple: true,
    filters: [{
      name: '视频文件',
      extensions: [...VIDEO_EXTENSIONS],
    }],
  });
  if (Array.isArray(result)) return result;
  if (typeof result === 'string') return [result];
  return [];
}

/**
 * 打开文件选择对话框，选择音频文件
 *
 * @returns 选中的文件路径，用户取消时返回 null
 */
export async function openAudioFile(): Promise<string | null> {
  const result = await open({
    multiple: false,
    filters: [{
      name: '音频文件',
      extensions: [...AUDIO_EXTENSIONS],
    }],
  });
  if (typeof result === 'string') return result;
  return null;
}

/**
 * 打开文件选择对话框，选择字幕文件
 *
 * @returns 选中的文件路径，用户取消时返回 null
 */
export async function openSubtitleFile(): Promise<string | null> {
  const result = await open({
    multiple: false,
    filters: [{
      name: '字幕文件',
      extensions: [...SUBTITLE_EXTENSIONS],
    }],
  });
  if (typeof result === 'string') return result;
  return null;
}

/**
 * 打开文件选择对话框，选择图片文件（水印用）
 *
 * @returns 选中的文件路径，用户取消时返回 null
 */
export async function openImageFile(): Promise<string | null> {
  const result = await open({
    multiple: false,
    filters: [{
      name: '图片文件',
      extensions: ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg'],
    }],
  });
  if (typeof result === 'string') return result;
  return null;
}

/**
 * 打开保存对话框，选择输出文件路径
 *
 * @param defaultName - 默认文件名
 * @param extension - 文件扩展名（如 "mp4"）
 * @returns 选择的保存路径，用户取消时返回 null
 */
export async function selectOutputPath(defaultName: string, extension: string): Promise<string | null> {
  const result = await save({
    defaultPath: defaultName,
    filters: [{
      name: `${extension.toUpperCase()} 文件`,
      extensions: [extension],
    }],
  });
  return result;
}

/**
 * 打开目录选择对话框
 *
 * @returns 选择的目录路径，用户取消时返回 null
 */
export async function selectDirectory(): Promise<string | null> {
  const result = await open({
    directory: true,
    multiple: false,
  });
  if (typeof result === 'string') return result;
  return null;
}
