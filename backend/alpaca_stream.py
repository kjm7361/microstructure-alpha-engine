import asyncio
import os
import time
import random
from collections import deque
from typing import Dict, Optional
from zoneinfo import ZoneInfo
from datetime import datetime, time as dtime

from models import TradeRecord, QuoteRecord

BUFFER_SIZE      = 500
LIVE_TICK_TIMEOUT = 12.0   # seconds of silence before simulation takes over

# ── US market-hours check (Eastern time) ─────────────────────────────
_ET = ZoneInfo("America/New_York")

def is_market_open() -> bool:
    now = datetime.now(_ET)
    if now.weekday() >= 5:          # Saturday / Sunday
        return False
    t = now.time()
    return dtime(9, 30) <= t < dtime(16, 0)


# ── Per-ticker buffer ─────────────────────────────────────────────────
class MarketDataBuffer:
    def __init__(self):
        self.trades: deque          = deque(maxlen=BUFFER_SIZE)
        self.quotes: deque          = deque(maxlen=BUFFER_SIZE)
        self.last_trade: Optional[TradeRecord]  = None
        self.last_quote: Optional[QuoteRecord]  = None
        self.last_live_tick: float  = 0.0   # epoch-seconds of most recent Alpaca tick


# ── Singleton manager ─────────────────────────────────────────────────
class MarketDataManager:

    # Realistic mid-prices used by simulation (updated occasionally)
    _BASE_PRICES: Dict[str, float] = {
        "AAPL": 213.0, "TSLA": 248.0, "NVDA": 131.0, "MSFT": 447.0,
        "AMZN": 202.0, "GOOGL": 178.0, "GOOG": 179.0, "META": 565.0,
        "AMD":  170.0, "NFLX": 1070.0, "JPM":  263.0, "COIN": 255.0,
        "PLTR":  39.0, "HOOD":  20.0,  "ORCL": 165.0, "CRM":  318.0,
        "SPY":  593.0, "QQQ":  519.0,  "IWM":  220.0, "GLD":  315.0,
        "TLT":   95.0,
    }

    def __init__(self):
        self.buffers: Dict[str, MarketDataBuffer]  = {}
        self._sim_tasks: Dict[str, asyncio.Task]   = {}
        self._sim_prices: Dict[str, float]         = {}
        self._alpaca_started = False

        self.api_key    = os.getenv("ALPACA_API_KEY", "")
        self.secret_key = os.getenv("ALPACA_SECRET_KEY", "")
        self.use_alpaca = bool(
            self.api_key and self.secret_key
            and self.api_key not in ("", "your_api_key_here")
        )

    # ── Public helpers ────────────────────────────────────────────────

    def get_buffer(self, ticker: str) -> MarketDataBuffer:
        if ticker not in self.buffers:
            self.buffers[ticker] = MarketDataBuffer()
        return self.buffers[ticker]

    def get_mode(self, ticker: str) -> tuple[str, str]:
        """Return (mode, reason).  mode ∈ {'live', 'simulation'}."""
        buf     = self.get_buffer(ticker)
        elapsed = time.time() - buf.last_live_tick

        if self.use_alpaca and elapsed < LIVE_TICK_TIMEOUT:
            return "live", ""
        if not is_market_open():
            return "simulation", "Market closed — using simulation"
        if self.use_alpaca:
            return "simulation", "No live ticks — using simulation fallback"
        return "simulation", "No Alpaca keys — using simulation"

    async def ensure_streaming(self, ticker: str):
        self.get_buffer(ticker)
        # Simulation fallback always runs so the buffer is never empty
        await self._ensure_simulation_fallback(ticker)
        if self.use_alpaca:
            await self._ensure_alpaca(ticker)

    # ── Alpaca live stream ────────────────────────────────────────────

    async def _ensure_alpaca(self, ticker: str):
        if self._alpaca_started:
            return
        buf = self.get_buffer(ticker)

        async def quote_handler(data):
            q = QuoteRecord(
                timestamp=time.time(),
                bid=float(data.bid_price),
                ask=float(data.ask_price),
                bid_size=float(data.bid_size),
                ask_size=float(data.ask_size),
            )
            buf.quotes.append(q)
            buf.last_quote      = q
            buf.last_live_tick  = time.time()

        async def trade_handler(data):
            mid = ((buf.last_quote.bid + buf.last_quote.ask) / 2
                   if buf.last_quote else float(data.price))
            price = float(data.price)
            if price > mid:
                side = 1
            elif price < mid:
                side = -1
            else:
                side = 1 if (not buf.last_trade or price >= buf.last_trade.price) else -1
            t = TradeRecord(timestamp=time.time(), price=price,
                            size=float(data.size), side=side)
            buf.trades.append(t)
            buf.last_trade     = t
            buf.last_live_tick = time.time()

        try:
            from alpaca.data.live import StockDataStream
            stream = StockDataStream(self.api_key, self.secret_key)
            stream.subscribe_quotes(quote_handler, ticker)
            stream.subscribe_trades(trade_handler, ticker)
            import threading
            threading.Thread(target=stream.run, daemon=True).start()
            self._alpaca_started = True
        except Exception as e:
            print(f"Alpaca stream error: {e} — simulation fallback active")
            self.use_alpaca = False

    # ── Simulation fallback ───────────────────────────────────────────

    async def _ensure_simulation_fallback(self, ticker: str):
        if ticker in self._sim_tasks and not self._sim_tasks[ticker].done():
            return
        self._sim_tasks[ticker] = asyncio.create_task(self._simulate(ticker))

    async def _simulate(self, ticker: str):
        """Generate synthetic market data.  Only injects ticks when the live
        feed is stale so it never competes with real Alpaca data."""
        buf   = self.get_buffer(ticker)
        base  = self._BASE_PRICES.get(ticker, 100.0)
        price = self._sim_prices.get(ticker, base)
        bid_sz, ask_sz = 1200.0, 1200.0

        while True:
            try:
                await asyncio.sleep(0.15)

                # Stay silent while live ticks are flowing
                if self.use_alpaca and (time.time() - buf.last_live_tick) < LIVE_TICK_TIMEOUT:
                    continue

                # Mean-reverting micro random walk
                drift  = -0.0005 * (price / base - 1)
                price *= (1 + drift + random.gauss(0, 0.0001))
                if random.random() < 0.008:          # occasional larger move
                    price *= (1 + random.gauss(0, 0.002))
                price  = max(price, 1.0)
                self._sim_prices[ticker] = price

                spread = price * 0.0003              # ~3 bps
                bid    = round(price - spread / 2, 2)
                ask    = round(price + spread / 2, 2)
                bid_sz = max(100, bid_sz + random.gauss(0, 50))
                ask_sz = max(100, ask_sz + random.gauss(0, 50))
                now    = time.time()

                q = QuoteRecord(timestamp=now, bid=bid, ask=ask,
                                bid_size=round(bid_sz), ask_size=round(ask_sz))
                buf.quotes.append(q)
                buf.last_quote = q

                if random.random() < 0.30:
                    mid    = (bid + ask) / 2
                    is_buy = random.random() < 0.52
                    tp     = round(ask + random.uniform(0, spread * 0.1) if is_buy
                                   else bid - random.uniform(0, spread * 0.1), 2)
                    side   = (1 if tp > mid else
                              (-1 if tp < mid else
                               (1 if (not buf.last_trade or tp >= buf.last_trade.price) else -1)))
                    sz     = float(min(max(1, int(random.lognormvariate(4.5, 1.0))), 5000))
                    t      = TradeRecord(timestamp=now, price=tp, size=sz, side=side)
                    buf.trades.append(t)
                    buf.last_trade = t

            except asyncio.CancelledError:
                break
            except Exception:
                await asyncio.sleep(1)


manager = MarketDataManager()
