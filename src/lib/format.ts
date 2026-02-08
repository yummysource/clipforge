/**
 * @file 格式化工具函数
 * @description 提供文件大小、时长、码率等数据的人性化格式化
 */

/**
 * 格式化文件大小为人类可读字符串
 *
 * 自动选择合适的单位（B, KB, MB, GB），保留合适的小数位数
 *
 * @param bytes - 文件大小（字节）
 * @returns 格式化后的字符串，如 "45.2 MB"
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = bytes / Math.pow(k, i);
  /* 小于 10 显示 2 位小数，小于 100 显示 1 位，否则不显示小数 */
  const decimals = value < 10 ? 2 : value < 100 ? 1 : 0;
  return `${value.toFixed(decimals)} ${units[i]}`;
}

/**
 * 格式化时长为 HH:MM:SS 或 MM:SS 格式
 *
 * 时长小于 1 小时时省略小时位，保留到秒
 *
 * @param seconds - 时长（秒），支持浮点数
 * @returns 格式化后的字符串，如 "2:30" 或 "1:02:30"
 */
export function formatDuration(seconds: number): string {
  if (!seconds || seconds < 0) return '0:00';
  const totalSeconds = Math.floor(seconds);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * 格式化时长为精确时间码 HH:MM:SS.mmm
 *
 * 用于时间轴选择器的精确输入/显示，包含毫秒
 *
 * @param seconds - 时长（秒），支持浮点数
 * @returns 格式化后的字符串，如 "00:01:30.500"
 */
export function formatTimecode(seconds: number): string {
  if (!seconds || seconds < 0) return '00:00:00.000';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);

  return [
    h.toString().padStart(2, '0'),
    m.toString().padStart(2, '0'),
    s.toString().padStart(2, '0'),
  ].join(':') + '.' + ms.toString().padStart(3, '0');
}

/**
 * 解析时间码字符串为秒数
 *
 * 支持 HH:MM:SS.mmm 和 MM:SS 格式
 *
 * @param timecode - 时间码字符串
 * @returns 秒数（浮点），解析失败返回 0
 */
export function parseTimecode(timecode: string): number {
  const parts = timecode.split(':');
  if (parts.length < 2) return 0;

  let hours = 0;
  let minutes = 0;
  let seconds = 0;

  if (parts.length === 3) {
    hours = parseInt(parts[0], 10) || 0;
    minutes = parseInt(parts[1], 10) || 0;
    seconds = parseFloat(parts[2]) || 0;
  } else if (parts.length === 2) {
    minutes = parseInt(parts[0], 10) || 0;
    seconds = parseFloat(parts[1]) || 0;
  }

  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * 格式化码率为人类可读字符串
 *
 * @param bitsPerSecond - 码率（bps）
 * @returns 格式化后的字符串，如 "12.5 Mbps" 或 "320 kbps"
 */
export function formatBitrate(bitsPerSecond: number): string {
  if (bitsPerSecond === 0) return '0 bps';
  if (bitsPerSecond >= 1_000_000) {
    const mbps = bitsPerSecond / 1_000_000;
    return `${mbps < 10 ? mbps.toFixed(1) : Math.round(mbps)} Mbps`;
  }
  if (bitsPerSecond >= 1_000) {
    const kbps = bitsPerSecond / 1_000;
    return `${Math.round(kbps)} kbps`;
  }
  return `${bitsPerSecond} bps`;
}

/**
 * 格式化预估剩余时间
 *
 * @param seconds - 预估剩余秒数
 * @returns 人类可读的剩余时间，如 "约 2 分 30 秒"
 */
export function formatEta(seconds: number): string {
  if (!seconds || seconds <= 0) return '即将完成';
  if (seconds < 60) return `约 ${Math.ceil(seconds)} 秒`;
  const m = Math.floor(seconds / 60);
  const s = Math.ceil(seconds % 60);
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const rm = m % 60;
    return `约 ${h} 小时 ${rm} 分`;
  }
  return s > 0 ? `约 ${m} 分 ${s} 秒` : `约 ${m} 分`;
}

/**
 * 获取文件扩展名（小写，不含点号）
 *
 * @param fileName - 文件名或文件路径
 * @returns 小写扩展名，如 "mp4"
 */
export function getFileExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.');
  if (lastDot < 0) return '';
  return fileName.slice(lastDot + 1).toLowerCase();
}

/**
 * 生成输出文件名
 *
 * 在原文件名后添加后缀，并可选更改扩展名
 *
 * @param inputName - 原始文件名
 * @param suffix - 后缀（如 "_converted"）
 * @param newExtension - 新扩展名（可选，如 "mp4"）
 * @returns 输出文件名
 */
export function generateOutputName(inputName: string, suffix: string, newExtension?: string): string {
  const lastDot = inputName.lastIndexOf('.');
  const baseName = lastDot > 0 ? inputName.slice(0, lastDot) : inputName;
  const ext = newExtension || (lastDot > 0 ? inputName.slice(lastDot + 1) : 'mp4');
  return `${baseName}${suffix}.${ext}`;
}
