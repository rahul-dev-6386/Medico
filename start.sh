#!/usr/bin/env bash
ROOT="$(cd "$(dirname "$0")" && pwd)"

# Kill stale backend & frontend
kill $(pgrep -f "uvicorn app.main") 2>/dev/null || true
kill $(pgrep -f "next dev") 2>/dev/null || true
sleep 1

echo "Starting backend..."
cd "$ROOT/backend"
uvicorn app.main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

echo "Starting frontend..."
cd "$ROOT/frontend"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "Backend:  http://localhost:8000"
echo "Frontend: http://localhost:3000"
echo "Press Ctrl+C to stop both"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" SIGINT SIGTERM
wait
