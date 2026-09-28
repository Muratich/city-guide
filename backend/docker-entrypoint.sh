#!/bin/sh
set -euo pipefail

echo "[entrypoint] starting API server on :8000..."
exec .venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000