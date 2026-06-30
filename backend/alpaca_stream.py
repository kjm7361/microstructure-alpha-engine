import asyncio
import os
import time
import random
from collections import deque
from typing import Dict, Optional
from models import TradeRecord, QuoteRecord

BUFFER_SIZE = 500


class MarketDataBuffer:
    def __init__(self):
        self.trades: deque = deque(maxlen=BUFFER_SIZE)
        self.quotes: deque = deque(maxlen=BUFFER_SIZE)
        self.last_trade: Optional[TradeRecord] = None
        self.last_quote: Optional[QuoteRecord] = None


class MarketDataManager:
    def __init__(self):
        self.buffers: Dict[str, MarketDataBuffer] = {}
        self._sim_tasks: Dict[str, asyncio.Task] = {}
        self._alpaca_started = False

        self.api_key    = os.getenv("ALPACA_API_KEY", "")
        self.secret_key = os.getenv("ALPACA_SECRET_KEY", "")
        self.use_alpaca = bool(self.api_key and self.secret_key and
                               self.api_key != "your_api_key_here")

    def get_buffer(self, ticker: str) -> MarketDataBuffer:
        if ticker not in self.buffers:
            self.buffers[ticker] = MarketDataBuffer()
        return self.buffers[ticker]

    async def ensure_streaming(self, ticker: str):
        self.get_buffer(ticker)
        if self.use_alpaca:
            await self._ensure_alpaca(ticker)
        else:
            await self._ensure_simulation(ticker)

    async def _ensure_alpaca(self, ticker: str):
        if self._alpaca_started:
            return
        buffer = self.get_buffer(ticker)

        async def quote_handler(data):
            q = QuoteRecord(
                timestamp=time.time(),
                bid=float(data.bid_price),
                ask=float(data.ask_price),
                bid_size=float(data.bid_size),
                ask_size=float(data.ask_size),
            )
            buffer.quotes.append(q)
            buffer.last_quote = q

        async def trade_handler(data):
            mid = ((buffer.last_quote.bid + buffer.last_quote.ask) / 2
                   if buffer.last_quote else float(data.price))
            price = float(data.price)
            if price > mid:
                side = 1
            elif price < mid:
                side = -1
            else:
                side = 1 if (not buffer.last_trade or price >= buffer.last_trade.price) else -1
            t = TradeRecord(timestamp=time.time(), price=price,
                            size=float(data.size), side=side)
            buffer.trades.append(t)
            buffer.last_trade = t

        try:
            from alpaca.data.live import StockDataStream
            stream = StockDataStream(self.api_key, self.secret_key)
            stream.subscribe_quotes(quote_handler, ticker)
            stream.subscribe_trades(trade_handler, ticker)
            import threading
            threading.Thread(target=stream.run, daemon=True).start()
            self._alpaca_started = True
        except Exception as e:
            print(f"Alpaca stream error: {e} — falling back to simulation")
            self.use_alpaca = False
            await self._ensure_simulation(ticker)

    async def _ensure_simulation(self, ticker: str):
        if ticker in self._sim_tasks and not self._sim_tasks[ticker].done():
            return
        self._sim_tasks[ticker] = asyncio.create_task(self._simulate(ticker))

    async def _simulate(self, ticker: str):
        buf = self.get_buffer(ticker)
        base = {"AAPL": 185.0, "TSLA": 252.0, "SPY": 472.0, "NVDA": 118.0,
                "MSFT": 380.0, "AMZN": 185.0, "GOOGL": 175.0, "META": 530.0,
                "QQQ": 490.0, "AMD": 155.0}.get(ticker, 100.0)
        price = base
        bid_sz = 500.0
        ask_sz = 500.0

        while True:
            try:
                await asyncio.sleep(0.15)
                drift = -0.0005 * (price / base - 1)
                price *= (1 + drift + random.gauss(0, 0.0001))
                if random.random() < 0.008:
                    price *= (1 + random.gauss(0, 0.002))
                price = max(price, 1.0)

                spread = price * 0.0003
                bid = round(price - spread / 2, 2)
                ask = round(price + spread / 2, 2)
                bid_sz = max(100, bid_sz + random.gauss(0, 30))
                ask_sz = max(100, ask_sz + random.gauss(0, 30))
                now = time.time()

                q = QuoteRecord(timestamp=now, bid=bid, ask=ask,
                                bid_size=round(bid_sz), ask_size=round(ask_sz))
                buf.quotes.append(q)
                buf.last_quote = q

                if random.random() < 0.30:
                    mid = (bid + ask) / 2
                    is_buy = random.random() < 0.52
                    tp = round(ask + random.uniform(0, spread * 0.1) if is_buy
                               else bid - random.uniform(0, spread * 0.1), 2)
                    side = 1 if tp > mid else (-1 if tp < mid else
                           (1 if (not buf.last_trade or tp >= buf.last_trade.price) else -1))
                    sz = float(min(max(1, int(random.lognormvariate(4.5, 1.0))), 5000))
                    t = TradeRecord(timestamp=now, price=tp, size=sz, side=side)
                    buf.trades.append(t)
                    buf.last_trade = t

            except asyncio.CancelledError:
                break
            except Exception:
                await asyncio.sleep(1)


manager = MarketDataManager()
