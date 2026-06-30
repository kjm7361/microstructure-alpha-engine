import { useState, useEffect, useRef } from 'react'

// ── Demo data (shown when market is closed / disconnected) ────────
const DEMO_SNAP = {
  ticker: 'AAPL', bid: 184.95, ask: 185.01, mid: 184.98,
  spread: 0.06, spread_bps: 3.24, bid_size: 2400, ask_size: 1900,
  last_trade_price: 184.97, last_trade_size: 312, trade_side: 'BUY',
}
const DEMO_ASKS = [
  { price: 185.14, size: 5100 },
  { price: 185.09, size: 3800 },
  { price: 185.05, size: 2600 },
]
const DEMO_BIDS = [
  { price: 184.91, size: 3100 },
  { price: 184.87, size: 5200 },
  { price: 184.82, size: 4700 },
]

function DemoBadge() {
  return (
    <span className="ml-auto text-[9px] text-[#ffd700]/50 tracking-widest">DEMO</span>
  )
}

function DepthBar({ bidSize, askSize }) {
  const bidPct = (bidSize / (bidSize + askSize)) * 100
  return (
    <div className="px-4 py-3 border-b border-[#1c2333]">
      <div className="stat-label mb-2">BID / ASK DEPTH</div>
      <div className="flex h-3 gap-px overflow-hidden rounded-sm">
        <div className="bg-[#00ff88]/20 border-t-2 border-[#00ff88]/60 transition-all duration-300" style={{ width: `${bidPct}%` }} />
        <div className="bg-[#ff4d4d]/20 border-t-2 border-[#ff4d4d]/60 flex-1 transition-all duration-300" />
      </div>
      <div className="flex justify-between mt-1.5">
        <span className="text-[10px] text-[#00ff88]/70">{bidPct.toFixed(0)}% BID</span>
        <span className="text-[10px] text-[#ff4d4d]/70">{(100 - bidPct).toFixed(0)}% ASK</span>
      </div>
    </div>
  )
}

// ── Demo layout: shows a 4-level order book ladder ────────────────
function DemoBook() {
  const maxSize = 5200
  return (
    <div>
      {/* Ask ladder (top = far from mid, bottom = top of book) */}
      {[...DEMO_ASKS].reverse().map((l, i) => {
        const opacity = 0.35 + i * 0.20
        const barW = (l.size / maxSize) * 100
        return (
          <div key={l.price} className="flex items-center gap-2 px-4 py-1.5 border-b border-[#1c2333]/50"
            style={{ opacity }}>
            <span className="text-[11px] text-[#ff4d4d] tabular-nums w-16">{l.price.toFixed(2)}</span>
            <div className="flex-1 h-1.5 bg-[#131920] rounded-full overflow-hidden">
              <div className="h-full bg-[#ff4d4d]/50 rounded-full" style={{ width: `${barW}%` }} />
            </div>
            <span className="text-[10px] text-[#6b7280] tabular-nums w-14 text-right">{l.size.toLocaleString()}</span>
          </div>
        )
      })}

      {/* Top of book ask */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-[#1c2333] bg-[#ff4d4d]/05">
        <span className="text-[13px] font-bold text-[#ff4d4d] tabular-nums w-16">{DEMO_SNAP.ask.toFixed(2)}</span>
        <div className="flex-1 h-2 bg-[#131920] rounded-full overflow-hidden">
          <div className="h-full bg-[#ff4d4d]/60 rounded-full" style={{ width: `${(DEMO_SNAP.ask_size / maxSize) * 100}%` }} />
        </div>
        <span className="text-[11px] text-[#8b95a4] tabular-nums w-14 text-right">{DEMO_SNAP.ask_size.toLocaleString()}</span>
      </div>

      {/* Spread separator */}
      <div className="flex items-center justify-between px-4 py-1.5 border-b border-[#1c2333] bg-[#131920]">
        <span className="text-[10px] text-[#6b7280] tracking-wider">SPREAD</span>
        <span className="text-[12px] font-semibold text-[#ffd700] glow-yellow tabular-nums">
          {DEMO_SNAP.spread_bps.toFixed(2)} bps
        </span>
        <span className="text-[10px] text-[#6b7280] tracking-wider">MID {DEMO_SNAP.mid.toFixed(2)}</span>
      </div>

      {/* Top of book bid */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-[#1c2333] bg-[#00ff88]/05">
        <span className="text-[13px] font-bold text-[#00ff88] tabular-nums w-16">{DEMO_SNAP.bid.toFixed(2)}</span>
        <div className="flex-1 h-2 bg-[#131920] rounded-full overflow-hidden">
          <div className="h-full bg-[#00ff88]/60 rounded-full" style={{ width: `${(DEMO_SNAP.bid_size / maxSize) * 100}%` }} />
        </div>
        <span className="text-[11px] text-[#8b95a4] tabular-nums w-14 text-right">{DEMO_SNAP.bid_size.toLocaleString()}</span>
      </div>

      {/* Bid ladder */}
      {DEMO_BIDS.map((l, i) => {
        const opacity = 0.75 - i * 0.20
        const barW = (l.size / maxSize) * 100
        return (
          <div key={l.price} className="flex items-center gap-2 px-4 py-1.5 border-b border-[#1c2333]/50"
            style={{ opacity }}>
            <span className="text-[11px] text-[#00ff88] tabular-nums w-16">{l.price.toFixed(2)}</span>
            <div className="flex-1 h-1.5 bg-[#131920] rounded-full overflow-hidden">
              <div className="h-full bg-[#00ff88]/50 rounded-full" style={{ width: `${barW}%` }} />
            </div>
            <span className="text-[10px] text-[#6b7280] tabular-nums w-14 text-right">{l.size.toLocaleString()}</span>
          </div>
        )
      })}

      {/* Last trade */}
      <div className="px-4 py-3">
        <div className="stat-label mb-2">LAST TRADE</div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[16px] font-bold tabular-nums text-[#e6edf3]">{DEMO_SNAP.last_trade_price.toFixed(2)}</span>
          <span className="text-[11px] text-[#6b7280]">{DEMO_SNAP.last_trade_size.toLocaleString()} sh</span>
          <span className="text-[11px] font-bold px-2.5 py-1 border border-[#00ff88]/40 text-[#00ff88] bg-[#00ff88]/10">
            ▲ BUY
          </span>
        </div>
      </div>
    </div>
  )
}

// ── Live layout ───────────────────────────────────────────────────
export default function OrderBookPanel({ snapshot, connected }) {
  const prevBidRef = useRef(null)
  const prevAskRef = useRef(null)
  const [bidFlash, setBidFlash] = useState(null)
  const [askFlash, setAskFlash] = useState(null)
  const flashTimer = useRef({})

  useEffect(() => {
    if (!snapshot) return
    const { bid, ask } = snapshot
    if (prevBidRef.current !== null && bid !== prevBidRef.current) {
      setBidFlash(bid > prevBidRef.current ? 'up' : 'down')
      clearTimeout(flashTimer.current.bid)
      flashTimer.current.bid = setTimeout(() => setBidFlash(null), 380)
    }
    prevBidRef.current = bid
    if (prevAskRef.current !== null && ask !== prevAskRef.current) {
      setAskFlash(ask > prevAskRef.current ? 'up' : 'down')
      clearTimeout(flashTimer.current.ask)
      flashTimer.current.ask = setTimeout(() => setAskFlash(null), 380)
    }
    prevAskRef.current = ask
  }, [snapshot?.bid, snapshot?.ask])

  const isDemo = !snapshot

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="accent bg-[#00ff88]" />
        ORDER BOOK
        {snapshot && (
          <span className="text-[10px] text-[#6b7280] tracking-normal normal-case font-normal ml-1">
            {snapshot.ticker}
          </span>
        )}
        {isDemo && <DemoBadge />}
      </div>

      {/* Demo mode: rich ladder view */}
      {isDemo && <DemoBook />}

      {/* Live mode: single-level display */}
      {!isDemo && (
        <div>
          <div className={`px-4 py-3 border-b border-[#1c2333] ${bidFlash === 'up' ? 'flash-green' : bidFlash === 'down' ? 'flash-red' : ''}`}>
            <div className="flex justify-between items-baseline">
              <span className="stat-label">BID</span>
              <span className="text-[10px] text-[#6b7280]">{snapshot.bid_size?.toLocaleString()} sh</span>
            </div>
            <div className="text-[28px] font-bold tabular-nums text-[#00ff88] glow-green leading-tight mt-0.5">
              {snapshot.bid?.toFixed(2)}
            </div>
          </div>

          <div className={`px-4 py-3 border-b border-[#1c2333] ${askFlash === 'up' ? 'flash-green' : askFlash === 'down' ? 'flash-red' : ''}`}>
            <div className="flex justify-between items-baseline">
              <span className="stat-label">ASK</span>
              <span className="text-[10px] text-[#6b7280]">{snapshot.ask_size?.toLocaleString()} sh</span>
            </div>
            <div className="text-[28px] font-bold tabular-nums text-[#ff4d4d] glow-red leading-tight mt-0.5">
              {snapshot.ask?.toFixed(2)}
            </div>
          </div>

          <div className="grid grid-cols-2 divide-x divide-[#1c2333] border-b border-[#1c2333]">
            <div className="px-4 py-2.5">
              <div className="stat-label">MID</div>
              <div className="text-[18px] font-bold tabular-nums text-[#c9d1d9]">{snapshot.mid?.toFixed(2)}</div>
            </div>
            <div className="px-4 py-2.5">
              <div className="stat-label">SPREAD</div>
              <div className="text-[18px] font-bold tabular-nums text-[#ffd700] glow-yellow">
                {snapshot.spread_bps?.toFixed(2)}
                <span className="text-[12px] text-[#ffd700]/60 ml-1">bps</span>
              </div>
            </div>
          </div>

          <DepthBar bidSize={snapshot.bid_size} askSize={snapshot.ask_size} />

          <div className="px-4 py-3">
            <div className="stat-label mb-2">LAST TRADE</div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[17px] font-bold tabular-nums text-[#e6edf3]">
                {snapshot.last_trade_price?.toFixed(2) ?? '—'}
              </span>
              <span className="text-[11px] text-[#6b7280] tabular-nums">
                {snapshot.last_trade_size?.toLocaleString() ?? '—'} sh
              </span>
              <span className={`text-[11px] font-bold px-2.5 py-1 border ${
                snapshot.trade_side === 'BUY'  ? 'border-[#00ff88]/40 text-[#00ff88] bg-[#00ff88]/10' :
                snapshot.trade_side === 'SELL' ? 'border-[#ff4d4d]/40 text-[#ff4d4d] bg-[#ff4d4d]/10' :
                'border-[#2d3748] text-[#6b7280]'
              }`}>
                {snapshot.trade_side}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
