# Microstructure Alpha Engine

A real-time market microstructure analysis terminal — live order book streaming, adverse selection estimation, optimal execution scheduling, and order flow signal generation. Styled as a dense Bloomberg-style dark terminal.

![Stack](https://img.shields.io/badge/Stack-React%20%2B%20FastAPI-blue)
![Data](https://img.shields.io/badge/Data-Alpaca%20Markets-green)
![Mode](https://img.shields.io/badge/Fallback-Simulation%20Mode-yellow)

---

## What It Does

| Panel | Model | What It Measures |
|---|---|---|
| **Order Book** | Lee-Ready classifier | Real-time bid/ask ladder, spread in bps, trade side classification |
| **Kyle's Lambda** | OLS regression | Price impact per unit of signed order flow — inverse liquidity |
| **OFI Signal** | Order Flow Imbalance | Net buying/selling pressure from quote-level changes |
| **Almgren-Chriss** | Optimal execution | Minimal-impact liquidation schedule vs. VWAP benchmark |
| **Spread Decomposition** | Roll + Glosten-Milgrom | Adverse selection vs. inventory vs. processing cost components |

---

## Setup

### 1. Clone & enter project

```bash
cd microstructure-alpha-engine
cp .env.example .env
```

### 2. Add Alpaca API keys (optional)

Get free paper-trading keys at [alpaca.markets](https://alpaca.markets). Edit `.env`:

```
ALPACA_API_KEY=PKxxxx
ALPACA_SECRET_KEY=xxxx
```

**No keys?** The app runs in **SIMULATION MODE** — synthetic market data with realistic microstructure (random walk + spreads + log-normal trade sizes). Every model still runs.

### 3. Run

```bash
./start.sh
```

Opens:
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000

### 4. Manual setup (if start.sh fails)

```bash
# Backend
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

---

## Math

### Kyle's Lambda — Kyle (1985)

Estimates price impact via OLS regression over a rolling window of signed trades:

```
Δpₜ = λ · Qₜ + εₜ
```

- `Qₜ` = signed volume (positive = buyer-initiated, negative = seller-initiated)
- `λ` = price impact coefficient — higher means less liquid
- Trade side classified by Lee-Ready rule: `price > mid → BUY`, `price < mid → SELL`, tie → tick rule

### Almgren-Chriss Optimal Execution — Almgren & Chriss (2001)

Minimizes expected cost + variance of executing `X` shares over horizon `T`:

```
x*(t) = X · sinh(κ(T−t)) / sinh(κT)
κ = √(λ_risk · σ² / γ)
```

- `γ` = temporary market impact parameter (estimated from Kyle's λ)
- `λ_risk` = risk aversion (0.001)
- Compared against uniform VWAP execution — savings = VWAP cost − optimal cost

### Order Flow Imbalance — Cont, Kukanov & Stoikov (2014)

Aggregates net pressure from quote-level changes:

```
ΔOFIₜ = I(bid↑)·bid_size − I(ask↓)·ask_size
```

Cumulated OFI predicts short-horizon returns with correlation up to 0.5 in liquid markets.

### Spread Decomposition — Roll (1984) + Glosten-Milgrom (1985)

Decomposes the bid-ask spread into three economic components:

```
Spread = Adverse Selection + Inventory Holding + Order Processing
```

- **Adverse selection**: informed traders' edge, estimated via `2λ · E[|v|]`
- **Inventory**: market maker position risk, Roll serial-covariance residual
- **Processing**: fixed costs of order handling

---

## API Endpoints

```
WS  /ws/orderbook?ticker=AAPL         — 500ms snapshots
GET /kyle-lambda?ticker=AAPL&window=100
GET /almgren-chriss?ticker=AAPL&shares=10000&minutes=30
GET /ofi?ticker=AAPL&window=50
GET /spread-decomposition?ticker=AAPL
GET /health
```

---

## What This Demonstrates

**Quantitative finance:** Kyle (1985) lambda estimation, Almgren-Chriss optimal liquidation, Glosten-Milgrom spread decomposition, Lee-Ready trade classification — core models from academic market microstructure.

**Systems:** Async Python (FastAPI + asyncio), WebSocket streaming, per-ticker circular buffers, concurrent data producer/consumer pattern.

**Frontend:** Real-time React dashboard with sub-second WebSocket updates, Recharts visualizations, responsive dark terminal UI with animated price flashes.

**Simulation design:** Fallback synthetic data engine with random walk + realistic spread dynamics, allowing full demo without API keys.

---

## References

- Kyle, A. S. (1985). *Continuous auctions and insider trading*. Econometrica, 53(6), 1315–1335.
- Almgren, R., & Chriss, N. (2001). *Optimal execution of portfolio transactions*. Journal of Risk, 3, 5–39.
- Cont, R., Kukanov, A., & Stoikov, S. (2014). *The price impact of order book events*. Journal of Financial Econometrics, 12(1), 47–88.
- Roll, R. (1984). *A simple implicit measure of the effective bid-ask spread*. Journal of Finance, 39(4), 1127–1139.
- Glosten, L. R., & Milgrom, P. R. (1985). *Bid, ask and transaction prices in a specialist market*. Journal of Financial Economics, 14(1), 71–100.
