import numpy as np
from scipy import stats
from collections import deque
from dataclasses import dataclass
from typing import List, Optional


@dataclass
class TradeRecord:
    timestamp: float
    price: float
    size: float
    side: int  # +1 buy, -1 sell


@dataclass
class QuoteRecord:
    timestamp: float
    bid: float
    ask: float
    bid_size: float
    ask_size: float


class KyleLambdaModel:
    """Kyle (1985): price impact per unit signed order flow via OLS."""

    def __init__(self, window: int = 50):
        self.window = window
        self.lambda_history: deque = deque(maxlen=200)

    def estimate(self, trades: List[TradeRecord]) -> dict:
        n = len(trades)
        empty = {"lambda": 0.0, "r_squared": 0.0, "intercept": 0.0,
                 "rolling_lambda": list(self.lambda_history), "n_trades": n}
        if n < 10:
            return empty

        subset = list(trades)[-self.window:]
        prices = np.array([t.price for t in subset])
        sizes  = np.array([t.size  for t in subset])
        sides  = np.array([t.side  for t in subset])

        sv = sizes * sides
        dp = np.diff(prices)
        sv = sv[1:]

        if len(dp) < 5 or np.std(sv) < 1e-10:
            self.lambda_history.append(0.0)
            return empty

        slope, intercept, r_value, _, _ = stats.linregress(sv, dp)
        lam = float(max(slope, 0.0))
        self.lambda_history.append(lam)

        return {
            "lambda": lam,
            "r_squared": float(r_value ** 2),
            "intercept": float(intercept),
            "rolling_lambda": list(self.lambda_history),
            "n_trades": n,
        }


class AlmgrenChrissModel:
    """Almgren-Chriss (2001) optimal liquidation trajectory."""

    RISK_AVERSION = 0.001

    def solve(self, total_shares: float, horizon_minutes: float,
              trades: List[TradeRecord], kyle_lambda: float) -> dict:
        T = max(horizon_minutes / 60.0, 1e-6)
        n_steps = min(max(int(horizon_minutes * 4), 10), 200)

        if len(trades) >= 10:
            prices = np.array([t.price for t in list(trades)[-60:]])
            log_ret = np.diff(np.log(np.maximum(prices, 1e-10)))
            sigma = float(np.std(log_ret)) if len(log_ret) > 1 else 0.001
            avg_price = float(np.mean(prices[-10:]))
        else:
            sigma = 0.001
            avg_price = 100.0

        gamma = max(kyle_lambda * 0.5, 1e-9)
        kappa = np.sqrt(max(self.RISK_AVERSION * sigma ** 2 / gamma, 0.0))
        times = np.linspace(0, T, n_steps + 1)

        sinh_kT = np.sinh(kappa * T)
        if abs(sinh_kT) < 1e-10:
            x = total_shares * (1.0 - times / T)
        else:
            x = total_shares * np.sinh(kappa * (T - times)) / sinh_kT
        x = np.clip(x, 0, total_shares)

        trade_sizes = np.abs(np.diff(x))
        dt = T / n_steps

        tmp_cost  = float(gamma * np.sum(trade_sizes ** 2) / dt)
        perm_cost = float(kyle_lambda * total_shares ** 2 / 2)
        expected_cost = (tmp_cost + perm_cost) * avg_price

        vwap_trade = total_shares / n_steps
        vwap_tmp   = float(gamma * n_steps * vwap_trade ** 2 / dt)
        vwap_cost  = (vwap_tmp + perm_cost) * avg_price

        return {
            "times": (times * 60).tolist(),
            "shares_remaining": x.tolist(),
            "expected_cost": float(expected_cost),
            "vwap_cost": float(vwap_cost),
            "savings": float(max(vwap_cost - expected_cost, 0.0)),
            "kappa": float(kappa),
            "n_steps": n_steps,
        }


class OFIModel:
    """Order Flow Imbalance — Cont, Kukanov & Stoikov (2014)."""

    def __init__(self):
        self.ofi_series: deque = deque(maxlen=300)
        self.prev: Optional[QuoteRecord] = None

    def update(self, q: QuoteRecord) -> None:
        if self.prev is None:
            self.prev = q
            return
        p = self.prev
        bid_contrib = q.bid_size if q.bid > p.bid else (-p.bid_size if q.bid < p.bid else q.bid_size - p.bid_size)
        ask_contrib = q.ask_size if q.ask < p.ask else (-p.ask_size if q.ask > p.ask else -(q.ask_size - p.ask_size))
        self.ofi_series.append(bid_contrib + ask_contrib)
        self.prev = q

    def get_signal(self, window: int = 50, trades: Optional[List[TradeRecord]] = None) -> dict:
        series = list(self.ofi_series)[-window:]
        if not series:
            return {"ofi_series": [], "ofi_return_correlation": 0.0, "signal": "NEUTRAL", "current_ofi": 0.0}
        arr = np.array(series, dtype=float)
        current_ofi = float(np.sum(arr))
        corr = 0.0
        if trades and len(trades) >= len(series) >= 5:
            prices = np.array([t.price for t in list(trades)[-len(series):]])
            if len(prices) == len(series) and np.std(prices) > 0 and np.std(arr) > 0:
                c = np.corrcoef(arr, prices)[0, 1]
                corr = float(c) if not np.isnan(c) else 0.0
        if len(arr) >= 3:
            recent = float(np.mean(arr[-5:]))
            std = float(np.std(arr)) if len(arr) > 1 else 1.0
            thresh = 0.5 * (std if std > 0 else 1.0)
            signal = "BUY" if recent > thresh else ("SELL" if recent < -thresh else "NEUTRAL")
        else:
            signal = "NEUTRAL"
        return {"ofi_series": series, "ofi_return_correlation": corr, "signal": signal, "current_ofi": current_ofi}


class SpreadDecompositionModel:
    """Roll (1984) + Glosten-Milgrom adverse-selection decomposition."""

    def decompose(self, trades: List[TradeRecord], quotes: List[QuoteRecord], kyle_lambda: float) -> dict:
        zero = {"total_spread_bps": 0.0, "adverse_selection_bps": 0.0, "inventory_bps": 0.0, "processing_bps": 0.0}
        if not quotes:
            return zero
        last_q = quotes[-1]
        mid = (last_q.bid + last_q.ask) / 2.0
        if mid <= 0:
            return zero
        spread = last_q.ask - last_q.bid
        spread_bps = (spread / mid) * 10_000

        roll_bps = 0.0
        if len(trades) >= 5:
            prices = np.array([t.price for t in list(trades)[-60:]])
            dp = np.diff(prices)
            if len(dp) >= 4:
                cov = np.cov(dp[:-1], dp[1:])[0, 1]
                roll_c = np.sqrt(max(-cov, 0.0))
                roll_bps = (2 * roll_c / mid) * 10_000

        avg_size = float(np.mean([t.size for t in list(trades)[-20:]])) if trades else 100.0
        adv_bps  = min((2.0 * kyle_lambda * avg_size / mid) * 10_000, spread_bps * 0.6)
        adv_bps  = max(adv_bps, 0.0)
        proc_bps = max(roll_bps - adv_bps, spread_bps * 0.05)
        inv_bps  = max(spread_bps - adv_bps - proc_bps, spread_bps * 0.05)

        total = adv_bps + inv_bps + proc_bps
        if total > 1e-9:
            scale = spread_bps / total
            adv_bps *= scale; inv_bps *= scale; proc_bps *= scale

        return {
            "total_spread_bps": float(spread_bps),
            "adverse_selection_bps": float(adv_bps),
            "inventory_bps": float(inv_bps),
            "processing_bps": float(proc_bps),
        }
