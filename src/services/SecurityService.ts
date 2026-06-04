import * as SecureStore from 'expo-secure-store';

const API_KEY_STORE_KEY = 'cogito_api_key';

/**
 * 将 API Key 存入系统硬件级加密安全沙盒。
 *
 * 在 iOS 上使用 Keychain，在 Android 上使用 EncryptedSharedPreferences
 * （基于 Android Keystore），任何常规反编译、越狱手段均无法读取。
 */
export async function saveApiKey(key: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(API_KEY_STORE_KEY, key);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : '保存 API Key 时发生未知错误';
    throw new Error(message);
  }
}

/**
 * 从系统硬件级加密安全沙盒中读取 API Key。
 *
 * @returns 已存储的 API Key，若未设置则返回 `null`
 */
export async function getApiKey(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(API_KEY_STORE_KEY);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : '读取 API Key 时发生未知错误';
    throw new Error(message);
  }
}