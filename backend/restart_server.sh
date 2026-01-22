#!/bin/bash
# Script to restart the FastAPI backend server

echo "Stopping any existing server on port 8000..."
lsof -ti:8000 | xargs kill -9 2>/dev/null
sleep 2

echo "Starting backend server..."
cd "$(dirname "$0")"
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
