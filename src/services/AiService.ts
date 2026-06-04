/**
 * AI 通信网关：封装与 Cogito 后端代理微服务的异步通信。
 *
 * 职责：
 * - 自动从 SecurityService 获取硬件沙盒中存储的 API Key
 * - 封装 fetch POST 请求，含超时与错误拦截
 * - 将后端返回的 JSON 解析为类型安全的对象返回给 UI 层
 */

import { getApiKey } from './SecurityService';

// ---------------------------------------------------------------------------
// 配置
// ---------------------------------------------------------------------------

/** 后端代理微服务地址（开发机局域网 IP，真机与模拟器均可连通） */
const BASE_URL = 'http://192.168.1.12:8000';

/** 请求超时 (毫秒) */
const REQUEST_TIMEOUT_MS = 90_000;

// ---------------------------------------------------------------------------
// 类型定义
// ---------------------------------------------------------------------------

export type TaskType = 'summary' | 'quiz';

export interface AnalysisResult {
  success: boolean;
  task_type: string;
  model: string;
  content: string; // 后端返回的 JSON 字符串
  usage?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// 核心函数
// ---------------------------------------------------------------------------

/**
 * 将指定文本片段发送至 Cogito 后端进行 AI 深度分析。
 *
 * @param textChunk  待分析的章节文本
 * @param taskType   分析类型："summary" 生成概念导图，"quiz" 生成深度思考题
 * @returns 解析后的分析结果
 */
export async function analyzeChapter(
  textChunk: string,
  taskType: TaskType
): Promise<AnalysisResult> {
  // 1. 从安全沙盒中读取 API Key
  const apiKey = await getApiKey();
  if (!apiKey) {
    throw new Error('未配置 API Key，请先在首页设置中保存您的 API Key');
  }

  // 2. 构建 AbortController 实现超时
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${BASE_URL}/api/v1/cogito/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text_chunk: textChunk,
        api_key: apiKey,
        model: 'deepseek-chat',
        task_type: taskType,
      }),
      signal: controller.signal,
    });

    // 3. 处理非 2xx 响应
    if (!response.ok) {
      let detail = '';
      try {
        const errBody = await response.json();
        detail = (errBody as Record<string, unknown>).detail as string || '';
      } catch {
        detail = `HTTP ${response.status}`;
      }
      throw new Error(`服务器返回错误 (${response.status}): ${detail}`);
    }

    // 4. 解析并返回
    const data: AnalysisResult = await response.json();
    return data;
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('请求超时，AI 分析服务未在 90 秒内响应，请稍后重试');
    }
    if (error instanceof TypeError) {
      throw new Error('无法连接到 Cogito 后端服务，请检查网络或后端是否已启动');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * 解析后端返回的 content 字段（JSON 字符串）为结构化对象。
 *
 * 后端已保证返回合法 JSON，此处做防御性二次校验。
 */
export function parseContentJSON<T = Record<string, unknown>>(
  content: string
): T {
  try {
    return JSON.parse(content) as T;
  } catch {
    throw new Error('AI 返回的内容格式异常，无法解析为结构化数据');
  }
}