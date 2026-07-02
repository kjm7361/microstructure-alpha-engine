import asyncio
import os
import time
from contextlib import asynccontextmanager
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware

from alpaca_stream import manager, is_market_open
from models import KyleLambdaModel, AlmgrenChrissModel, OFIModel, SpreadDecompositionModel

kyle_models: dict  = {}
ac_model           = AlmgrenChrissModel()
ofi_models: dict   = {}
spread_model       = SpreadDecompositionModel()

# Background OFI feed tasks — one per ticker, runs at full quote tick rate
# so OFI accumulates data in both live and simulation mode without relying
# on the WebSocket connection cadence (which is 500ms, too slow to catch
# every quote change).
_ofi_tasks: dict[str, asyncio.Task] = {}


def get_kyle(ticker: str) -> KyleLambdaModel:
    if ticker not in kyle_models:
        kyle_models[ticker] = KyleLambdaModel()
    return kyle_models[ticker]


def get_ofi(ticker: str) -> OFIModel:
    if ticker not in ofi_models:
        ofi_models[ticker] = OFIModel()
    return ofi_models[ticker]


async def _ofi_feed_task(ticker: str) -> None:
    """Continuously feed new quotes from buf.quotes into the OFI model.

    Runs at 120ms intervals (slightly faster than the 150ms simulation tick)
    so every quote is processed regardless of WebSocket connection state.
    Uses the quote timestamp to skip already-processed entries.
    """
    buf      = manager.get_buffer(ticker)
    model    = get_ofi(ticker)
    last_ts  = 0.0

    while True:
        try:
            await asyncio.sleep(0.12)
            for q in list(buf.quotes):          # deque snapshot, oldest-first
                if q.timestamp > last_ts:
                    model.update(q)
                    last_ts = q.timestamp
        except asyncio.CancelledError:
            break
        except Exception:
            await asyncio.sleep(1)


def _ensure_ofi_task(ticker: str) -> None:
    if ticker not in _ofi_tasks or _ofi_tasks[ticker].done():
        _ofi_tasks[ticker] = asyncio.create_task(_ofi_feed_task(ticker))


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(title="Microstructure Alpha Engine", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.websocket("/ws/orderbook")
async def orderbook_ws(websocket: WebSocket, ticker: str = Query("AAPL")):
    await websocket.accept()
    ticker = ticker.upper()
    await manager.ensure_streaming(ticker)
    _ensure_ofi_task(ticker)          # OFI background feed starts here
    buf = manager.get_buffer(ticker)

    try:
        while True:
            await asyncio.sleep(0.5)
            q = buf.last_quote
            t = buf.last_trade

            if q is None:
                await websocket.send_json({"type": "waiting", "ticker": ticker})
                continue

            mid        = (q.bid + q.ask) / 2
            spread     = q.ask - q.bid
            spread_bps = (spread / mid * 10_000) if mid > 0 else 0

            mode, mode_reason = manager.get_mode(ticker)

            await websocket.send_json({
                "type":              "snapshot",
                "ticker":            ticker,
                "timestamp":         time.time(),
                "bid":               round(q.bid, 2),
                "ask":               round(q.ask, 2),
                "spread":            round(spread, 4),
                "spread_bps":        round(spread_bps, 2),
                "mid":               round(mid, 2),
                "bid_size":          int(q.bid_size),
                "ask_size":          int(q.ask_size),
                "last_trade_price":  t.price if t else None,
                "last_trade_size":   int(t.size) if t else None,
                "trade_side":        ("BUY" if t.side == 1 else "SELL") if t else "—",
                "mode":              mode,
                "mode_reason":       mode_reason,
                "is_simulated":      mode == "simulation",   # backward-compat
            })

    except WebSocketDisconnect:
        pass
    except Exception:
        pass


@app.get("/kyle-lambda")
async def kyle_lambda_ep(ticker: str = "AAPL", window: int = 100):
    ticker = ticker.upper()
    await manager.ensure_streaming(ticker)
    buf    = manager.get_buffer(ticker)
    model  = get_kyle(ticker)
    model.window = window
    return model.estimate(list(buf.trades))


@app.get("/almgren-chriss")
async def almgren_chriss_ep(ticker: str = "AAPL", shares: float = 10000, minutes: float = 30):
    ticker      = ticker.upper()
    await manager.ensure_streaming(ticker)
    buf         = manager.get_buffer(ticker)
    kyle_result = get_kyle(ticker).estimate(list(buf.trades))
    return ac_model.solve(
        total_shares=shares,
        horizon_minutes=minutes,
        trades=list(buf.trades),
        kyle_lambda=kyle_result["lambda"],
    )


@app.get("/ofi")
async def ofi_ep(ticker: str = "AAPL", window: int = 50):
    ticker = ticker.upper()
    await manager.ensure_streaming(ticker)
    _ensure_ofi_task(ticker)          # ensure OFI feed is running
    buf    = manager.get_buffer(ticker)
    return get_ofi(ticker).get_signal(window=window, trades=list(buf.trades))


@app.get("/spread-decomposition")
async def spread_decomp_ep(ticker: str = "AAPL"):
    ticker      = ticker.upper()
    await manager.ensure_streaming(ticker)
    buf         = manager.get_buffer(ticker)
    kyle_result = get_kyle(ticker).estimate(list(buf.trades))
    return spread_model.decompose(
        trades=list(buf.trades),
        quotes=list(buf.quotes),
        kyle_lambda=kyle_result["lambda"],
    )


@app.get("/health")
async def health():
    return {
        "status":       "ok",
        "market_open":  is_market_open(),
        "tickers":      list(manager.buffers.keys()),
    }
