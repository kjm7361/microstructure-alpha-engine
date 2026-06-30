import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine } from 'recharts'

const DEMO = {
  lambda: 2.31e-5,
  r_squared: 0.342,
  intercept: 1.18e-6,
  n_trades: 0,
  rolling_lambda: [
    1.82e-5, 2.10e-5, 1.94e-5, 2.43e-5, 2.28e-5, 1.96e-5, 2.51e-5, 2.19e-5,
    1.87e-5, 2.34e-5, 2.08e-5, 2.47e-5, 2.31e-5, 2.02e-5, 2.23e-5, 2.55e-5,
    2.14e-5, 2.36e-5, 2.41e-5, 2.18e-5, 2.29e-5, 2.07e-5, 2.44e-5, 2.31e-5,
  ],
}

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#161b22] border border-[#1c2333] px-3 py-1.5 text-[10px] text-[#c9d1d9]">
      λ = {payload[0]?.value?.toExponential(3)}
    </div>
  )
}

export default function KyleLambdaPanel({ ticker, connected }) {
  const [data, setData] = useState(null)

  useEffect(() => {
    if (!connected) { setData(null); return }
    const poll = async () => {
      try {
        const r = await fetch(`/api/kyle-lambda?ticker=${ticker}&window=100`)
        if (r.ok) setData(await r.json())
      } catch {}
    }
    poll()
    const id = setInterval(poll, 1500)
    return () => clearInterval(id)
  }, [connected, ticker])

  const display  = data ?? DEMO
  const isDemo   = !data
  const chartData = display.rolling_lambda.map((v, i) => ({ i, lambda: v }))
  const fmtL = (v) => v < 0.0001 ? v.toExponential(2) : v.toFixed(5)

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="accent bg-[#00d4ff]" />
        KYLE'S LAMBDA — PRICE IMPACT MODEL
        <span className="ml-auto flex items-center gap-3">
          {isDemo && <span className="text-[9px] text-[#ffd700]/50 tracking-widest">DEMO</span>}
          {!isDemo && <span className="text-[10px] text-[#6b7280] tracking-normal normal-case font-normal">n={data.n_trades} trades</span>}
        </span>
      </div>

      {/* ── Three stats ── */}
      <div className="grid grid-cols-3 divide-x divide-[#1c2333] border-b border-[#1c2333]">
        <div className="px-4 py-3">
          <div className="stat-label">KYLE'S λ</div>
          <div className="text-[26px] font-bold text-[#00d4ff] glow-cyan tabular-nums leading-tight">
            {fmtL(display.lambda)}
          </div>
          <div className="stat-sub">price impact / vol</div>
        </div>
        <div className="px-4 py-3">
          <div className="stat-label">R²  <span className="text-[#6b7280] font-normal">fit</span></div>
          <div className="text-[26px] font-bold text-[#e6edf3] tabular-nums leading-tight">
            {(display.r_squared * 100).toFixed(1)}
            <span className="text-[14px] text-[#8b95a4] ml-0.5">%</span>
          </div>
          <div className="stat-sub">OLS quality</div>
        </div>
        <div className="px-4 py-3">
          <div className="stat-label">INTERCEPT α</div>
          <div className="text-[26px] font-bold text-[#c9d1d9] tabular-nums leading-tight">
            {display.intercept?.toExponential(2)}
          </div>
          <div className="stat-sub">drift term</div>
        </div>
      </div>

      {/* ── Rolling λ chart ── */}
      <div className="px-4 pt-3 pb-1 flex-1">
        <div className="stat-label mb-2">ROLLING λ — last {chartData.length} windows</div>
        <ResponsiveContainer width="100%" height={155}>
          <LineChart data={chartData} margin={{ top: 4, right: 8, left: 2, bottom: 4 }}>
            <XAxis dataKey="i" hide />
            <YAxis
              tickFormatter={v => v === 0 ? '0' : v.toExponential(0)}
              tick={{ fontSize: 10, fill: '#6b7280', fontFamily: 'monospace' }}
              axisLine={false} tickLine={false} width={44}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={0} stroke="#1c2333" strokeDasharray="3 3" />
            <Line
              type="monotone" dataKey="lambda" stroke={isDemo ? '#00d4ff80' : '#00d4ff'}
              strokeWidth={isDemo ? 1.5 : 2} dot={false} isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ── Footer ── */}
      <div className="border-t border-[#1c2333] px-4 py-2">
        <span className="text-[10px] text-[#6b7280]">
          Δp = <span className="text-[#00d4ff]">λ</span>·Q + ε
          &nbsp;|&nbsp; Q = signed volume
          &nbsp;|&nbsp; Higher λ → less liquid
        </span>
      </div>
    </div>
  )
}
