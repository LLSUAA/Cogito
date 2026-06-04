"""
深读 (Cogito) — 云端 AI 分析代理微服务入口
"""

from __future__ import annotations

import logging

import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config import APP_NAME, APP_VERSION, APP_DESCRIPTION
from schemas import AnalysisRequest, AnalysisResponse, ErrorResponse
from services.llm import request_llm_proxy

# ---------------------------------------------------------------------------
# 应用初始化
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("cogito")

app = FastAPI(
    title=APP_NAME,
    version=APP_VERSION,
    description=APP_DESCRIPTION,
)

# ---------------------------------------------------------------------------
# CORS 中间件：允许所有源（移动端开发测试需要）
# ---------------------------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# 全局异常处理
# ---------------------------------------------------------------------------


@app.exception_handler(httpx.TimeoutException)
async def timeout_handler(_request: Request, exc: httpx.TimeoutException) -> JSONResponse:
    logger.error("LLM request timeout: %s", exc)
    return JSONResponse(
        status_code=504,
        content=ErrorResponse(
            error="LLM_API_TIMEOUT",
            detail="第三方大模型 API 响应超时，请稍后重试",
        ).model_dump(),
    )


@app.exception_handler(httpx.HTTPStatusError)
async def http_status_handler(_request: Request, exc: httpx.HTTPStatusError) -> JSONResponse:
    logger.error("LLM HTTP error: %s", exc)
    return JSONResponse(
        status_code=502,
        content=ErrorResponse(
            error="LLM_API_ERROR",
            detail=str(exc),
        ).model_dump(),
    )


@app.exception_handler(ValueError)
async def value_error_handler(_request: Request, exc: ValueError) -> JSONResponse:
    logger.warning("Validation error: %s", exc)
    return JSONResponse(
        status_code=400,
        content=ErrorResponse(
            error="INVALID_REQUEST",
            detail=str(exc),
        ).model_dump(),
    )


@app.exception_handler(Exception)
async def general_handler(_request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled exception: %s", exc)
    return JSONResponse(
        status_code=500,
        content=ErrorResponse(
            error="INTERNAL_ERROR",
            detail="服务内部异常，已记录日志",
        ).model_dump(),
    )


# ---------------------------------------------------------------------------
# 健康检查
# ---------------------------------------------------------------------------


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": APP_NAME, "version": APP_VERSION}


# ---------------------------------------------------------------------------
# 核心路由：AI 分析
# ---------------------------------------------------------------------------


@app.post(
    "/api/v1/cogito/analyze",
    response_model=AnalysisResponse,
    responses={
        400: {"model": ErrorResponse, "description": "请求参数错误"},
        502: {"model": ErrorResponse, "description": "第三方 API 错误"},
        504: {"model": ErrorResponse, "description": "第三方 API 超时"},
    },
)
async def analyze(request: AnalysisRequest):
    """
    对指定文本片段进行 AI 分析。

    - **task_type=summary**：生成结构化概念导图
    - **task_type=quiz**：生成深度思考选择题
    """
    logger.info(
        "POST /analyze | model=%s task=%s len=%d",
        request.model,
        request.task_type.value,
        len(request.text_chunk),
    )

    result = await request_llm_proxy(
        text_chunk=request.text_chunk,
        api_key=request.api_key,
        model=request.model,
        task_type=request.task_type.value,
    )

    return AnalysisResponse(
        success=True,
        task_type=request.task_type.value,
        model=request.model,
        content=result["content"],
        usage=result.get("usage"),
    )


# ---------------------------------------------------------------------------
# 启动入口
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)