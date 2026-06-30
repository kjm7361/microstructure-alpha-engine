function fmtTime(ts) {
  return new Date(ts * 1000).toLocaleTimeString('en-US', {
    hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

// Realistic demo trades (AAPL-like prices, varied sizes)
const now = () => Date.now() / 1000
const DEMO_TRADES = [
  { price: 184.97, size: 312,  side: 'BUY',  ago: 3  },
  { price: 184.94, size: 500,  side: 'SELL', ago: 7  },
  { price: 185.01, size: 100,  side: 'BUY',  ago: 11 },
  { price: 184.98, size: 1200, side: 'BUY',  ago: 15 },
  { price: 184.93, size: 250,  side: 'SELL', ago: 20 },
  { price: 185.03, size: 800,  side: 'BUY',  ago: 26 },
  { price: 184.96, size: 450,  side: 'SELL', ago: 33 },
  { price: 184.99, size: 600,  side: 'BUY',  ago: 41 },
  { price: 184.92, size: 350,  side: 'SELL', ago: 50 },
  { price: 185.00, size: 700,  side: 'BUY',  ago: 60 },
].map(t => ({ ...t, timestamp: now() - t.ago }))

// Skeleton row shown when connected but feed not yet flowing
function SkeletonRow() {
  return (
    <div className="grid grid-cols-4 px-3 py-2.5 border-b border-[#0d1117] items-center animate-pulse">
      <span className="h-2.5 w-14 bg-[#1c2333] rounded" />
      <span className="h-2.5 w-12 bg-[#1c2333] rounded" />
      <span className="h-2.5 w-10 bg-[#1c2333] rounded" />
      <span className="h-2.5 w-6  bg-[#1c2333] rounded" />
    </div>
  )
}

const COLS = ['TIME', 'PRICE', 'SIZE', 'SIDE']

export default function LiveTradesFeed({ trades, connected }) {
  // When connected but no real trades yet → skeleton rows
  // When disconnected and no trades → demo trades
  const showSkeleton = connected && trades.length === 0
  const showDemo     = !connected && trades.length === 0
  const displayTrades = trades.length > 0 ? trades : (showDemo ? DEMO_TRADES : [])
  const isDemo       = showDemo

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="accent bg-[#00ff88]" />
        LIVE TRADES
        <span className="ml-auto flex items-center gap-2">
          {isDemo && <span className="text-[9px] text-[#ffd700]/50 tracking-widest">DEMO</span>}
          {trades.length > 0 && (
            <span className="text-[10px] text-[#6b7280] tracking-normal normal-case font-normal">
              {trades.length} recent
            </span>
          )}
        </span>
      </div>

      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Column headers */}
        <div className="grid grid-cols-4 px-3 py-2 border-b border-[#1c2333] bg-[#131920] flex-shrink-0">
          {COLS.map(h => (
            <div key={h} className="text-[10px] text-[#8b95a4] tracking-wider">{h}</div>
          ))}
        </div>

        {/* Skeleton rows when connected but awaiting feed */}
        {showSkeleton && (
          <div className="flex-1">
            {Array.from({ length: 10 }).map((_, i) => <SkeletonRow key={i} />)}
          </div>
        )}

        {/* Trade rows (real or demo) */}
        {!showSkeleton && (
          <div className="overflow-y-auto flex-1">
            {displayTrades.map((t, i) => (
              <div
                key={`${t.timestamp}-${i}`}
                className={`grid grid-cols-4 px-3 py-2.5 border-b border-[#0d1117] items-center ${
                  !isDemo && i === 0 ? (t.side === 'BUY' ? 'flash-green' : 'flash-red') : ''
                }`}
                style={{ opacity: isDemo ? (i === 0 ? 0.75 : 0.75 - i * 0.03) : 1 }}
              >
                <span className="text-[10px] text-[#6b7280] tabular-nums">
                  {fmtTime(t.timestamp)}
                </span>
                <span className={`text-[12px] font-semibold tabular-nums ${isDemo ? 'text-[#c9d1d9]/70' : 'text-[#e6edf3]'}`}>
                  {t.price?.toFixed(2)}
                </span>
                <span className="text-[11px] text-[#8b95a4] tabular-nums">
                  {t.size?.toLocaleString()}
                </span>
                <span className={`text-[11px] font-bold ${
                  t.side === 'BUY'
                    ? (isDemo ? 'text-[#00ff88]/60' : 'text-[#00ff88]')
                    : (isDemo ? 'text-[#ff4d4d]/60' : 'text-[#ff4d4d]')
                }`}>
                  {t.side === 'BUY' ? '▲ B' : '▼ S'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
