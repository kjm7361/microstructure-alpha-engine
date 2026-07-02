import { useState, useEffect } from 'react'
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine } from 'recharts'

const DEMO = {
  signal: 'BUY',
  current_ofi: 1247,
  ofi_return_correlation: 0.38,
  ofi_series: [
    120, -80, 340, 180, -220, 420, 380, -150, 280, 190,
    310, -90, 240, 380, 410, 290, -120, 350, 420, 510,
    380, 260, -80, 440, 510, 360, 290, 480, 520, 410,
  ],
}

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const v = payload[0]?.value ?? 0
  return (
    <div className="bg-[#161b22] border border-[#1c2333] px-3 py-1.5 text-[10px] text-[#c9d1d9]">
      OFI: {v > 0 ? '+' : ''}{v.toFixed(0)}
    </div>
  )
}

export default function OFIPanel({ ticker, connected }) {
  const [data, setData] = useState(null)

  useEffect(() => {
    if (!connected) { setData(null); return }
    const poll = async () => {
      try {
        const r = await fetch(`/api/ofi?ticker=${ticker}&window=50`)
        if (r.ok) setData(await r.json())
      } catch {}
    }
    poll()
    const id = setInterval(poll, 1000)
    return () => clearInterval(id)
  }, [connected, ticker])

  const display  = data ?? DEMO
  const isDemo   = !data
  const signal   = display.signal ?? 'NEUTRAL'

  const signalColor  = signal === 'BUY' ? '#00ff88' : signal === 'SELL' ? '#ff4d4d' : '#8b95a4'
  const signalBg     = signal === 'BUY' ? 'rgba(0,255,136,0.07)' : signal === 'SELL' ? 'rgba(255,77,77,0.07)' : 'transparent'
  const accentBorder = signal === 'BUY' ? '#00ff88' : signal === 'SELL' ? '#ff4d4d' : '#1c2333'

  const chartData = display.ofi_series.map((v, i) => ({ i, ofi: v }))
  const maxOfi    = Math.max(...chartData.map(d => Math.abs(d.ofi)), 1)

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="accent bg-[#ffd700]" />
        ORDER FLOW IMBALANCE
        {isDemo && <span className="ml-auto text-[9px] text-[#ffd700]/50 tracking-widest">DEMO</span>}
      </div>

      {/* ── Signal hero ── */}
      <div
        className="px-4 py-4 border-b border-[#1c2333]"
        style={{ background: signalBg, borderLeft: `3px solid ${accentBorder}` }}
      >
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="stat-label mb-2">SIGNAL</div>
            <div className="text-[32px] font-bold tracking-widest leading-none" style={{ color: signalColor }}>
              {signal === 'BUY' ? '▲ ' : signal === 'SELL' ? '▼ ' : '● '}{signal}
            </div>
          </div>
          <div className="text-right">
            <div className="stat-label mb-1">NET OFI</div>
            <div className="text-[22px] font-bold tabular-nums leading-none" style={{ color: signalColor }}>
              {display.current_ofi > 0 ? '+' : ''}{display.current_ofi?.toFixed(0)}
            </div>
            <div className="text-[10px] text-[#6b7280] mt-1.5">
              ρ(OFI,ret) = <span className="text-[#c9d1d9]">{display.ofi_return_correlation?.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── OFI time series ── */}
      <div className="px-4 pt-3 pb-1 flex-1">
        <div className="stat-label mb-2">OFI SERIES — last {chartData.length} ticks</div>
        <ResponsiveContainer width="100%" height={140}>
          <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 2, bottom: 4 }}>
            <XAxis dataKey="i" hide />
            <YAxis
              domain={[-maxOfi * 1.15, maxOfi * 1.15]}
              tick={{ fontSize: 10, fill: '#6b7280', fontFamily: 'monospace' }}
              tickFormatter={v => Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toFixed(0)}
              axisLine={false} tickLine={false} width={36}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={0} stroke="#2d3748" strokeWidth={1} />
            <defs>
              <linearGradient id="ofiGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#ffd700" stopOpacity={isDemo ? 0.18 : 0.28} />
                <stop offset="95%" stopColor="#ffd700" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <Area
              type="monotone" dataKey="ofi"
              stroke={isDemo ? '#ffd70080' : '#ffd700'} strokeWidth={1.5}
              fill="url(#ofiGrad)" isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* ── Footer ── */}
      <div className="border-t border-[#1c2333] px-4 py-2">
        <span className="text-[10px] text-[#6b7280]">
          OFI = Σ Δbid_sz − Σ Δask_sz &nbsp;|&nbsp;{' '}
          <a href="https://arxiv.org/abs/1011.6402" target="_blank" rel="noopener noreferrer"
            className="hover:text-[#8b95a4] hover:underline underline-offset-2 transition-colors">
            Cont, Kukanov &amp; Stoikov (2014)
          </a>
        </span>
      </div>
    </div>
  )
}
