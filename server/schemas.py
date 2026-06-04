"""
Pydantic 请求与响应数据验证模型
"""

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class TaskType(str, Enum):
    SUMMARY = "summary"
    QUIZ = "quiz"


class AnalysisRequest(BaseModel):
    """客户端分析请求体"""

    text_chunk: str = Field(
        ...,
        min_length=1,
        max_length=12000,
        description="待分析的章节文本片段",
        examples=["第一章：价值投资的三重否定——从格雷厄姆到行为金融学..."],
    )
    api_key: str = Field(
        ...,
        min_length=1,
        description="用户自带的第三方大模型 API Key",
    )
    model: str = Field(
        default="deepseek-chat",
        description="目标模型名称",
        examples=["deepseek-chat", "gpt-4o", "claude-3-5-sonnet"],
    )
    task_type: TaskType = Field(
        default=TaskType.SUMMARY,
        description="分析类型：summary 生成概念导图，quiz 生成思考题",
    )


class AnalysisResponse(BaseModel):
    """成功响应体"""

    success: bool = Field(default=True)
    task_type: str
    model: str
    content: str = Field(description="大模型返回的 JSON 字符串")
    usage: Optional[dict] = Field(default=None, description="Token 用量信息（若 API 返回）")


class ErrorResponse(BaseModel):
    """错误响应体"""

    success: bool = Field(default=False)
    error: str
    detail: Optional[str] = None