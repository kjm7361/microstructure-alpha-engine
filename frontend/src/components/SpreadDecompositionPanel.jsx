import { useState, useEffect } from 'react'

const DEMO = {
  total_spread_bps:       3.82,
  adverse_selection_bps:  1.53,
  inventory_bps:          1.15,
  processing_bps:         1.14,
}

export default function SpreadDecompositionPanel({ ticker, connected }) {
  const [data, setData] = useState(null)

  useEffect(() => {
    if (!connected) { setData(null); return }
    const poll = async () => {
      try {
        const r = await fetch(`/api/spread-decomposition?ticker=${ticker}`)
        if (r.ok) setData(await r.json())
      } catch {}
    }
    poll()
    const id = setInterval(poll, 2000)
    return () => clearInterval(id)
  }, [connected, ticker])

  const display = data ?? DEMO
  const isDemo  = !data
  const total   = display.total_spread_bps ?? 0

  const components = [
    {
      label:  'ADVERSE SELECTION',
      short:  'Informed trading (Kyle λ)',
      value:  display.adverse_selection_bps,
      pct:    total > 0 ? (display.adverse_selection_bps / total) * 100 : 0,
      color:  '#ff4d4d',
      bg:     'rgba(255,77,77,0.14)',
    },
    {
      label:  'INVENTORY HOLDING',
      short:  'Market maker position risk',
      value:  display.inventory_bps,
      pct:    total > 0 ? (display.inventory_bps / total) * 100 : 0,
      color:  '#ffd700',
      bg:     'rgba(255,215,0,0.14)',
    },
    {
      label:  'ORDER PROCESSING',
      short:  'Roll (1984) residual',
      value:  display.processing_bps,
      pct:    total > 0 ? (display.processing_bps / total) * 100 : 0,
      color:  '#00ff88',
      bg:     'rgba(0,255,136,0.14)',
    },
  ]

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="accent bg-[#ff4d4d]" />
        SPREAD DECOMPOSITION
        <span className="ml-auto flex items-center gap-3">
          {isDemo && <span className="text-[9px] text-[#ffd700]/50 tracking-widest">DEMO</span>}
          <span className={`tracking-normal normal-case font-normal text-[11px] tabular-nums ${isDemo ? 'text-[#ffd700]/60' : 'text-[#ffd700]'}`}>
            {total.toFixed(2)} bps
          </span>
        </span>
      </div>

      <div className="px-4 py-4 flex flex-col gap-4 flex-1">

        {/* ── Total spread hero ── */}
        <div>
          <div className="stat-label mb-1">TOTAL BID-ASK SPREAD</div>
          <div className={`text-[28px] font-bold tabular-nums leading-none ${isDemo ? 'text-[#ffd700]/70' : 'text-[#ffd700] glow-yellow'}`}>
            {total.toFixed(2)}
            <span className={`text-[14px] ml-1.5 ${isDemo ? 'text-[#ffd700]/40' : 'text-[#ffd700]/60'}`}>bps</span>
          </div>
        </div>

        {/* ── Stacked bar ── */}
        <div>
          <div className="stat-label mb-2">COMPONENT BREAKDOWN</div>
          <div className="flex h-4 overflow-hidden rounded-sm gap-px">
            {components.map(c => (
              <div
                key={c.label}
                style={{
                  width: `${c.pct}%`,
                  background: c.bg,
                  borderTop: `2px solid ${c.color}${isDemo ? '99' : ''}`,
                  opacity: isDemo ? 0.75 : 1,
                  transition: 'width 0.6s ease',
                }}
              />
            ))}
          </div>
          <div className="flex justify-between mt-1.5">
            {components.map(c => (
              <span key={c.label} className="text-[10px] tabular-nums" style={{ color: c.color, opacity: isDemo ? 0.65 : 1 }}>
                {c.pct.toFixed(0)}%
              </span>
            ))}
          </div>
        </div>

        {/* ── Component bars ── */}
        <div className="space-y-4 flex-1">
          {components.map(c => (
            <div key={c.label}>
              <div className="flex justify-between items-baseline mb-1.5">
                <span className="text-[11px] font-semibold tracking-wider" style={{ color: c.color, opacity: isDemo ? 0.65 : 1 }}>
                  {c.label}
                </span>
                <span className="text-[14px] font-bold tabular-nums" style={{ color: c.color, opacity: isDemo ? 0.65 : 1 }}>
                  {c.value.toFixed(2)} <span className="text-[10px] opacity-60">bps</span>
                </span>
              </div>
              <div className="w-full h-2 bg-[#131920] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${c.pct}%`, background: c.color, opacity: isDemo ? 0.4 : 0.65 }}
                />
              </div>
              <div className="text-[10px] text-[#6b7280] mt-1">{c.short}</div>
            </div>
          ))}
        </div>

        {/* ── Footer ── */}
        <div className="border-t border-[#1c2333] pt-2 mt-1">
          <span className="text-[10px] text-[#6b7280]">Roll (1984) + Glosten-Milgrom (1985)</span>
        </div>

      </div>
    </div>
  )
}
