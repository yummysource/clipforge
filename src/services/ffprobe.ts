/**
 * @file ffprobe 服务封装
 * @description 封装 Tauri invoke 调用后端 ffprobe 命令，获取媒体文件信息
 */
import { invoke } from '@tauri-apps/api/core';
import type { MediaInfo } from '@/types/media';

/**
 * 获取视频文件的媒体信息
 *
 * 调用后端 get_media_info command，使用 ffprobe 解析文件元数据
 *
 * @param filePath - 本地视频文件绝对路径
 * @returns 解析后的媒体信息对象
 * @throws {Error} ffprobe 执行失败或文件不存在
 */
export async function getMediaInfo(filePath: string): Promise<MediaInfo> {
  return invoke<MediaInfo>('get_media_info', { filePath });
}
