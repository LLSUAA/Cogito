import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';

/**
 * 文件元数据
 */
export interface FileMeta {
  uri: string;
  name: string;
  size: number;
}

/**
 * 导入结果：取消选择时 canceled 为 true，成功时返回 assets
 */
export type PickResult =
  | { canceled: true }
  | { canceled: false; assets: FileMeta[] };

const SUPPORTED_TYPES = ['text/plain', 'application/epub+zip'] as const;

/**
 * 唤起系统文件选择器，筛选 TXT/EPUB 文件，返回文件元数据与缓存副本路径。
 *
 * - 用户取消选择时返回 `{ canceled: true }`
 * - 选择成功时返回 `{ canceled: false, assets: [...] }`
 * - 文件不存在或读取失败时在内部静默降级，不会抛出异常
 */
export async function pickLocalBook(): Promise<PickResult> {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: [...SUPPORTED_TYPES],
      copyToCacheDirectory: true,
    });

    if (result.canceled) {
      return { canceled: true };
    }

    const assets: FileMeta[] = await Promise.all(
      result.assets.map(async (asset) => {
        let size = asset.size ?? 0;

        // 如果 DocumentPicker 没有返回文件大小，通过 FileSystem 补全
        if (!size && asset.uri) {
          try {
            const info = await FileSystem.getInfoAsync(asset.uri);
            if (info.exists && info.size) {
              size = info.size;
            }
          } catch {
            // 降级：无法获取大小时保持 0
          }
        }

        return {
          uri: asset.uri,
          name: asset.name,
          size,
        };
      })
    );

    return { canceled: false, assets };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : '导入文件时发生未知错误';
    throw new Error(message);
  }
}