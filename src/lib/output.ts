/**
 * @file 输出路径工具
 * @description 根据设置计算输出目录和完整输出路径，统一所有功能页面的输出逻辑。
 * 负责处理输出目录解析和文件名去重（时间戳）
 */
import { useSettingsStore } from '@/stores/useSettingsStore';

/**
 * 从文件路径中提取所在目录
 *
 * @param filePath - 完整文件路径
 * @returns 目录路径（不含末尾斜杠）
 */
export function getParentDir(filePath: string): string {
  const lastSlash = filePath.lastIndexOf('/');
  return lastSlash > 0 ? filePath.substring(0, lastSlash) : '/';
}

/**
 * 根据设置解析输出目录
 *
 * 优先使用用户设置的 outputDirectory，为空则回退到源文件所在目录
 *
 * @param sourceFilePath - 源文件完整路径
 * @returns 输出目录路径
 */
export function resolveOutputDir(sourceFilePath: string): string {
  const { outputDirectory } = useSettingsStore.getState();
  if (outputDirectory) {
    return outputDirectory;
  }
  return getParentDir(sourceFilePath);
}

/**
 * 生成当前时间戳字符串，格式 YYYYMMDD_HHmmss
 *
 * @returns 时间戳字符串，如 "20260209_143052"
 */
function formatTimestamp(): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

/**
 * 构建完整的输出文件路径
 *
 * 综合处理以下设置：
 * - outputDirectory：输出目录解析
 * - overwriteExisting：为 false 时在文件名中插入时间戳避免覆盖
 *
 * @param sourceFilePath - 源文件完整路径（用于解析默认输出目录）
 * @param outputName - 已生成的输出文件名（含后缀和扩展名）
 * @returns 完整的输出文件路径
 */
export function buildOutputPath(sourceFilePath: string, outputName: string): string {
  const dir = resolveOutputDir(sourceFilePath);
  const { overwriteExisting } = useSettingsStore.getState();

  if (overwriteExisting) {
    return `${dir}/${outputName}`;
  }

  /* 未开启覆盖：在扩展名前插入时间戳 */
  const lastDot = outputName.lastIndexOf('.');
  if (lastDot > 0) {
    const baseName = outputName.substring(0, lastDot);
    const ext = outputName.substring(lastDot);
    return `${dir}/${baseName}_${formatTimestamp()}${ext}`;
  }
  return `${dir}/${outputName}_${formatTimestamp()}`;
}
