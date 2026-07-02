import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'

// Realistic demo: AC curve decays faster than linear (convex)
const N = 40
const DEMO_TIMES   = Array.from({ length: N + 1 }, (_, i) => +(i * (30 / N)).toFixed(1))
const DEMO_OPTIMAL = DEMO_TIMES.map(t => Math.round(10000 * Math.sinh(0.12 * (30 - t)) / Math.sinh(0.12 * 30)))
const DEMO_VWAP    = DEMO_TIMES.map(t => Math.round(10000 * (1 - t / 30)))

const DEMO = {
  expected_cost: 1240,
  vwap_cost:     1583,
  savings:        343,
  kappa:         4.0e-3,
  n_steps:       N,
  times:         DEMO_TIMES,
  shares_remaining: DEMO_OPTIMAL,
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#161b22] border border-[#1c2333] px-3 py-1.5 text-[10px] text-[#c9d1d9]">
      <div className="text-[#6b7280] mb-1">t = {Number(label).toFixed(1)} min</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {Number(p.value).toLocaleString(undefined, { maximumFractionDigits: 0 })} sh
        </div>
      ))}
    </div>
  )
}

export default function AlmgrenChrissPanel({ ticker, connected }) {
  const [shares,  setShares]  = useState(10000)
  const [minutes, setMinutes] = useState(30)
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(false)

  const fetchData = async () => {
    if (!connected) return
    setLoading(true)
    try {
      const r = await fetch(`/api/almgren-chriss?ticker=${ticker}&shares=${shares}&minutes=${minutes}`)
      if (r.ok) setData(await r.json())
    } catch {}
    setLoading(false)
  }

  useEffect(() => {
    if (!connected) { setData(null); return }
    fetchData()
    const id = setInterval(fetchData, 5000)
    return () => clearInterval(id)
  }, [connected, ticker])

  const display = data ?? DEMO
  const isDemo  = !data

  const chartData = display.times.map((t, i) => ({
    t: Number(t).toFixed(1),
    optimal: Math.round(display.shares_remaining[i]),
    vwap:    isDemo
      ? DEMO_VWAP[i]
      : Math.round(display.shares_remaining[0] * (1 - i / (display.n_steps || 1))),
  }))

  // Reduce x-axis tick density to ~6 labels regardless of n_steps
  const tickInterval = Math.max(1, Math.floor(chartData.length / 6))

  const fmt = (n) => {
    if (!n && n !== 0) return '—'
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
    if (n >= 1000)      return `$${(n / 1000).toFixed(1)}k`
    return `$${n.toFixed(0)}`
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="accent bg-[#ff8c00]" />
        ALMGREN-CHRISS OPTIMAL EXECUTION
        {isDemo && <span className="ml-auto text-[9px] text-[#ffd700]/50 tracking-widest">DEMO</span>}
      </div>

      {/* ── Parameter inputs ── */}
      <div className="flex items-center gap-4 px-4 py-2.5 border-b border-[#1c2333] bg-[#131920]">
        <div className="flex items-center gap-2.5">
          <span className="stat-label" style={{ marginBottom: 0 }}>SHARES</span>
          <input
            type="number"
            value={shares}
            onChange={e => setShares(Number(e.target.value))}
            className="w-28 bg-[#0d1117] border border-[#1c2333] text-[#c9d1d9] text-[11px] px-2.5 py-1.5 focus:outline-none focus:border-[#ff8c00]/50 tabular-nums"
          />
        </div>
        <div className="flex items-center gap-2.5">
          <span className="stat-label" style={{ marginBottom: 0 }}>HORIZON</span>
          <input
            type="number"
            value={minutes}
            onChange={e => setMinutes(Number(e.target.value))}
            className="w-20 bg-[#0d1117] border border-[#1c2333] text-[#c9d1d9] text-[11px] px-2.5 py-1.5 focus:outline-none focus:border-[#ff8c00]/50 tabular-nums"
          />
          <span className="text-[10px] text-[#6b7280]">min</span>
        </div>
        <button
          onClick={fetchData}
          disabled={loading || !connected}
          className="ml-auto px-3.5 py-1.5 text-[11px] tracking-wider border border-[#ff8c00] text-[#ff8c00] hover:bg-[#ff8c00]/15 hover:shadow-[0_0_8px_rgba(255,140,0,0.3)] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {loading ? 'SOLVING...' : 'SOLVE'}
        </button>
      </div>

      {/* ── Cost stats ── */}
      <div className="grid grid-cols-3 divide-x divide-[#1c2333] border-b border-[#1c2333]">
        <div className="px-4 py-3">
          <div className="stat-label">OPTIMAL COST</div>
          <div className={`text-[22px] font-bold tabular-nums leading-tight ${isDemo ? 'text-[#ff8c00]/60' : 'text-[#ff8c00]'}`}>
            {fmt(display.expected_cost)}
          </div>
          <div className="stat-sub">market impact</div>
        </div>
        <div className="px-4 py-3">
          <div className="stat-label">VWAP COST</div>
          <div className={`text-[22px] font-bold tabular-nums leading-tight ${isDemo ? 'text-[#ff4d4d]/60' : 'text-[#ff4d4d]'}`}>
            {fmt(display.vwap_cost)}
          </div>
          <div className="stat-sub">uniform schedule</div>
        </div>
        <div className="px-4 py-3">
          <div className="stat-label">SAVINGS</div>
          <div className={`text-[22px] font-bold tabular-nums leading-tight ${isDemo ? 'text-[#00ff88]/60 ' : 'text-[#00ff88] glow-green'}`}>
            {fmt(display.savings)}
          </div>
          <div className="stat-sub">vs VWAP</div>
        </div>
      </div>

      {/* ── Execution trajectory chart ── */}
      <div className="px-4 pt-3 pb-1 flex-1">
        <div className="flex items-center justify-between mb-2">
          <div className="stat-label" style={{ marginBottom: 0 }}>EXECUTION TRAJECTORY (shares remaining)</div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div style={{ width: 14, height: 2, background: '#ff8c00' }} />
              <span className="text-[9px] text-[#6b7280] font-mono">Optimal (AC)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <svg width="14" height="3" style={{ display: 'block' }}><line x1="0" y1="1.5" x2="14" y2="1.5" stroke="#ff4d4d" strokeWidth="1.5" strokeDasharray="4 2"/></svg>
              <span className="text-[9px] text-[#6b7280] font-mono">Uniform / VWAP</span>
            </div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={170}>
          <LineChart data={chartData} margin={{ top: 4, right: 8, left: 2, bottom: 20 }}>
            <XAxis
              dataKey="t"
              interval={tickInterval}
              tick={{ fontSize: 10, fill: '#6b7280', fontFamily: 'monospace' }}
              axisLine={{ stroke: '#1c2333' }} tickLine={false}
              label={{ value: 'minutes', position: 'insideBottom', offset: -8, fontSize: 10, fill: '#6b7280' }}
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#6b7280', fontFamily: 'monospace' }}
              tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
              axisLine={false} tickLine={false} width={36}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone" dataKey="optimal" name="Optimal"
              stroke={isDemo ? '#ff8c0070' : '#ff8c00'} strokeWidth={2}
              dot={false} isAnimationActive={false}
            />
            <Line
              type="monotone" dataKey="vwap" name="VWAP"
              stroke={isDemo ? '#ff4d4d50' : '#ff4d4d'} strokeWidth={1.5}
              strokeDasharray="5 3" dot={false} isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ── Footer ── */}
      <div className="border-t border-[#1c2333] px-4 py-2">
        <span className="text-[10px] text-[#6b7280]">
          κ = {display.kappa?.toExponential(2)}
          &nbsp;|&nbsp; x*(t) = X·sinh(κ(T−t))/sinh(κT)
          &nbsp;|&nbsp;{' '}
          <a href="https://www.smallake.kr/wp-content/uploads/2016/03/optliq.pdf" target="_blank" rel="noopener noreferrer"
            className="hover:text-[#8b95a4] hover:underline underline-offset-2 transition-colors">
            Almgren &amp; Chriss (2001)
          </a>
        </span>
      </div>
    </div>
  )
}
