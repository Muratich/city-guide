#!/bin/sh
set -eu

exec .venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --log-config /app/logging.json
