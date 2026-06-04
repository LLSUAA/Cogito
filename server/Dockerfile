# ── 第一阶段：构建依赖 ──────────────────────────────────────────
FROM python:3.11-slim AS builder

WORKDIR /build

# 安装依赖到临时目录
COPY requirements.txt .
RUN pip install --no-cache-dir --target=/build/deps -r requirements.txt


# ── 第二阶段：运行镜像 ──────────────────────────────────────────
FROM python:3.11-slim

# 安全更新 & 清理 apt 缓存
RUN apt-get update \
    && apt-get upgrade -y \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 从构建阶段复制依赖
COPY --from=builder /build/deps /usr/local/lib/python3.11/site-packages

# 复制应用代码
COPY main.py config.py schemas.py ./
COPY services/ ./services/

# 非 root 用户运行
RUN useradd --create-home --shell /bin/bash appuser \
    && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD python -c "import httpx; httpx.get('http://localhost:8000/health').raise_for_status()"

CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]