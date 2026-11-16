FROM python:3.12-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

COPY --from=ghcr.io/astral-sh/uv:0.5 /uv /usr/local/bin/uv

WORKDIR /app
COPY src/backend/pyproject.toml .
# torch first, from the CPU-only index: the default wheel pulls in CUDA libraries.
RUN uv pip install --system --upgrade pip setuptools \
    && uv pip install --system torch torchaudio --index-url https://download.pytorch.org/whl/cpu \
    && uv pip install --system -r pyproject.toml --extra dev

COPY src/backend/ .
COPY tests/backend/ tests/

RUN useradd --system --no-create-home app \
    && mkdir /models \
    && chown -R app /app /models
USER app

ENV HF_HOME=/models/huggingface TORCH_HOME=/models/torch

EXPOSE 8000
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
