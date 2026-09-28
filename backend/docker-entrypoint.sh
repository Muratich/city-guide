#!/bin/sh
set -euo pipefail

echo "[entrypoint] applying schema (idempotent create_all)..."
.venv/bin/python -m app.db.init_db

echo "[entrypoint] starting API server on :8000..."
exec .venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000