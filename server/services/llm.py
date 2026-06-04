"""
LLM 代理服务：通过 httpx 异步中转请求至第三方大模型 API，
内置两套极客级别 System Prompt（summary / quiz）。
"""

from __future__ import annotations

import json
import logging
from typing import Optional

import httpx

from config import DEFAULT_PROVIDER, LLM_PROVIDERS, REQUEST_TIMEOUT

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# System Prompts
# ---------------------------------------------------------------------------

SYSTEM_PROMPTS: dict[str, str] = {
    "summary": (
        "你是一位专业的文本分析引擎，擅长将长篇专业论述拆解为底层逻辑架构。"
        "请严格按以下规则处理用户提供的文本片段：\n\n"
        "1. 识别文中所有关键概念、核心论点与子论点之间的关系；\n"
        "2. 剔除冗余修辞与叙事性过渡，仅保留概念层级的逻辑骨架；\n"
        "3. 以 JSON 格式输出结构化的概念导图，格式如下：\n"
        "```json\n"
        "{\n"
        '  "core_thesis": "全文核心论点的精炼概括",\n'
        '  "concept_map": [\n'
        "    {\n"
        '      "concept": "概念名称",\n'
        '      "definition": "一句话定义",\n'
        '      "relations": ["与概念A是因果关系", "是概念B的上位概念"],\n'
        '      "evidence": ["原文论据1", "原文论据2"]\n'
        "    }\n"
        "  ],\n"
        '  "logic_chain": "从前提→推论→结论的完整逻辑链条描述"\n'
        "}\n"
        "```\n\n"
        "注意：输出的 content 字段必须是纯净的可解析 JSON 字符串，"
        "不要包含任何 Markdown 代码块标记，不要包含任何解释性文字。"
    ),
    "quiz": (
        "你是一位苏格拉底式的深度阅读教练，擅长基于高壁垒文本生成反直觉思考题。"
        "请严格按以下规则处理用户提供的文本片段：\n\n"
        "1. 从文本中提取最隐晦的隐喻、未被明说的前提假设、以及高壁垒的专有概念；\n"
        "2. 生成 3 道具备深度思考价值的题目，每道题必须包含以下要素：\n"
        "   - 题干必须引用原文中的具体隐喻或概念；\n"
        "   - 选项必须包含看似正确但实际存在逻辑缺陷的干扰项；\n"
        "   - 解析必须指出干扰项的错误根源和正确选项的推理路径；\n"
        "3. 以 JSON 格式输出，格式如下：\n"
        "```json\n"
        "{\n"
        '  "questions": [\n'
        "    {\n"
        '      "id": 1,\n'
        '      "type": "choice",\n'
        '      "stem": "题干（引用原文隐喻/概念）",\n'
        '      "options": [\n'
        '        {"label": "A", "text": "选项文本"},\n'
        '        {"label": "B", "text": "选项文本"},\n'
        '        {"label": "C", "text": "选项文本"},\n'
        '        {"label": "D", "text": "选项文本"}\n'
        "      ],\n"
        '      "answer": "正确选项的 label",\n'
        '      "analysis": "详细解析：包括正确选项的推理路径和各干扰项的逻辑缺陷"\n'
        "    }\n"
        "  ]\n"
        "}\n"
        "```\n\n"
        "注意：输出的 content 字段必须是纯净的可解析 JSON 字符串，"
        "不要包含任何 Markdown 代码块标记，不要包含任何解释性文字。"
    ),
}

# ---------------------------------------------------------------------------
# 核心代理函数
# ---------------------------------------------------------------------------


async def request_llm_proxy(
    *,
    text_chunk: str,
    api_key: str,
    model: str = "deepseek-chat",
    task_type: str = "summary",
) -> dict:
    """
    异步转发请求到第三方大模型 API，并返回解析后的 JSON 内容。

    Parameters
    ----------
    text_chunk : str
        待分析的章节文本片段。
    api_key : str
        用户的第三方 API Key。
    model : str
        目标模型名称，默认为 "deepseek-chat"。
    task_type : str
        分析类型，"summary" 或 "quiz"。

    Returns
    -------
    dict
        {"content": ..., "usage": ...} — content 为 LLM 返回的 JSON 字符串。

    Raises
    ------
    ValueError
        task_type 非法。
    httpx.HTTPError
        网络或 API 层错误。
    """
    if task_type not in SYSTEM_PROMPTS:
        raise ValueError(
            f"不支持的 task_type: '{task_type}'，可选值为 {list(SYSTEM_PROMPTS.keys())}"
        )

    system_prompt = SYSTEM_PROMPTS[task_type]
    provider = _resolve_provider(model)

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": text_chunk},
        ],
        "temperature": 0.3,
        "max_tokens": 4096,
    }

    async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
        logger.info("→ LLM request: model=%s task=%s len=%d", model, task_type, len(text_chunk))

        response = await client.post(
            LLM_PROVIDERS[provider],
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
        )

        # 非 2xx 状态码统一处理
        if response.status_code != 200:
            detail = await _safe_read_body(response)
            logger.error("← LLM error %d: %s", response.status_code, detail)
            raise httpx.HTTPStatusError(
                f"LLM API 返回 {response.status_code}: {detail}",
                request=response.request,
                response=response,
            )

        data = response.json()
        logger.info("← LLM success: model=%s tokens=%s", model, data.get("usage"))

    choice = data["choices"][0]
    raw_content: str = choice["message"]["content"]

    # 清理可能被 LLM 包裹的 Markdown 代码块标记
    clean_content = _strip_markdown_fence(raw_content)

    # 验证是否为合法 JSON
    try:
        json.loads(clean_content)
    except json.JSONDecodeError as exc:
        logger.warning("LLM returned non-JSON content: %s", clean_content[:200])
        raise ValueError(f"大模型返回的内容不是合法 JSON: {exc}") from exc

    return {
        "content": clean_content,
        "usage": data.get("usage"),
    }


# ---------------------------------------------------------------------------
# 内部辅助
# ---------------------------------------------------------------------------


def _resolve_provider(model: str) -> str:
    """根据模型名推断 API 提供商。"""
    model_lower = model.lower()
    if "deepseek" in model_lower:
        return "deepseek"
    return "openai"


def _strip_markdown_fence(raw: str) -> str:
    """移除 LLM 输出中可能包裹的 ```json ... ``` 标记。"""
    text = raw.strip()
    if text.startswith("```"):
        first_newline = text.find("\n")
        if first_newline != -1:
            text = text[first_newline + 1 :]
    if text.endswith("```"):
        text = text[: text.rfind("```")]
    return text.strip()


async def _safe_read_body(response: httpx.Response) -> str:
    """安全读取响应体文本，失败时返回状态码。"""
    try:
        return await response.aread()
    except Exception:
        return f"<无法读取响应体: HTTP {response.status_code}>"