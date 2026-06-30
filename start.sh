#!/usr/bin/env bash
set -e

PROJECT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT"

# ── Python virtual environment ──────────────────────────────────────────────
if [ ! -d "backend/.venv" ]; then
  echo "→ Creating Python virtual environment..."
  python3 -m venv backend/.venv
fi

source backend/.venv/bin/activate
echo "→ Installing Python dependencies..."
pip install -r backend/requirements.txt -q

# ── Frontend dependencies ────────────────────────────────────────────────────
if [ ! -d "frontend/node_modules" ]; then
  echo "→ Installing frontend dependencies..."
  (cd frontend && npm install)
fi

# ── Load .env if present ─────────────────────────────────────────────────────
if [ -f ".env" ]; then
  set -o allexport
  source .env
  set +o allexport
  echo "→ Loaded .env"
else
  echo "→ No .env found — running in SIMULATION MODE"
  echo "  (copy .env.example to .env and add Alpaca keys for live data)"
fi

echo ""
echo "┌──────────────────────────────────────────────────┐"
echo "│       MICROSTRUCTURE ALPHA ENGINE                │"
echo "│  Backend  → http://localhost:8000                │"
echo "│  Frontend → http://localhost:5173                │"
echo "└──────────────────────────────────────────────────┘"
echo ""

# ── Start backend ────────────────────────────────────────────────────────────
(source backend/.venv/bin/activate && cd backend && uvicorn main:app --reload --port 8000 --log-level warning) &
BACKEND_PID=$!

sleep 1  # give uvicorn a moment to bind

# ── Start frontend ───────────────────────────────────────────────────────────
(cd frontend && npm run dev) &
FRONTEND_PID=$!

trap 'echo ""; echo "Shutting down..."; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0' SIGINT SIGTERM

wait
