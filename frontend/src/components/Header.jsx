import { useState } from 'react'

const PRESETS = [
  'AAPL', 'TSLA', 'NVDA', 'MSFT', 'AMZN', 'GOOGL', 'META', 'AMD',
  'NFLX', 'JPM', 'COIN', 'PLTR', 'HOOD', 'ORCL', 'CRM',
  'SPY', 'QQQ', 'IWM', 'GLD', 'TLT',
]

// mode ∈ 'live' | 'simulation' | 'offline'
const MODE_CONFIG = {
  live:       { dot: 'bg-[#00ff88] shadow-[0_0_7px_#00ff88]',  label: 'LIVE DATA',   text: 'text-[#00ff88]' },
  simulation: { dot: 'bg-[#ffd700] shadow-[0_0_6px_#ffd700]',  label: 'SIMULATION',  text: 'text-[#ffd700]' },
  offline:    { dot: 'bg-[#ff4d4d] shadow-[0_0_6px_#ff4d4d]',  label: 'OFFLINE',     text: 'text-[#ff4d4d]' },
}

export default function Header({ ticker, onTickerChange, connected, onConnect, onDisconnect, mode, modeReason }) {
  const [customVal, setCustomVal] = useState('')

  const handlePreset = (t) => {
    setCustomVal('')
    onTickerChange(t)
  }

  const handleCustom = (e) => {
    const v = e.target.value.toUpperCase().slice(0, 6)
    setCustomVal(v)
    if (v) onTickerChange(v)
  }

  const isPreset     = PRESETS.includes(ticker)
  const customActive = !isPreset && !!ticker
  const cfg          = MODE_CONFIG[mode] ?? MODE_CONFIG.offline

  return (
    <div className="border-b border-[#1c2333] bg-[#0d1117] px-4 py-3 flex flex-wrap items-center gap-y-2 justify-between">

      {/* ── Brand ── */}
      <div className="flex items-center gap-3 min-w-0">
        <span className="w-2.5 h-2.5 rounded-full bg-[#00ff88] shadow-[0_0_10px_#00ff88] flex-shrink-0" />
        <span className="text-[#00ff88] font-bold tracking-[0.14em] text-[13px] glow-green whitespace-nowrap">
          MICROSTRUCTURE ALPHA ENGINE
        </span>
      </div>

      {/* ── Controls ── */}
      <div className="flex flex-wrap items-center gap-2">

        {/* Preset ticker buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {PRESETS.map(t => (
            <button
              key={t}
              onClick={() => handlePreset(t)}
              className={`px-3 py-1.5 text-[11px] tracking-wider border transition-all ${
                ticker === t
                  ? 'border-[#00ff88] text-[#00ff88] bg-[#00ff88]/12 font-semibold shadow-[0_0_10px_rgba(0,255,136,0.18)]'
                  : 'border-[#1c2333] text-[#6b7280] hover:border-[#2d3748] hover:text-[#c9d1d9]'
              }`}
            >
              {t}
            </button>
          ))}

          {/* Custom ticker input */}
          <input
            type="text"
            value={customActive ? ticker : customVal}
            onChange={handleCustom}
            onBlur={() => { if (!customVal && !customActive) setCustomVal('') }}
            placeholder="CUSTOM"
            className={`w-20 px-2.5 py-1.5 text-[11px] bg-transparent border tracking-wider focus:outline-none placeholder-[#2d3748] ${
              customActive
                ? 'border-[#00ff88] text-[#00ff88] shadow-[0_0_10px_rgba(0,255,136,0.18)]'
                : 'border-[#1c2333] text-[#c9d1d9] focus:border-[#00ff88]/50'
            }`}
          />
        </div>

        <div className="w-px h-5 bg-[#1c2333]" />

        {/* Connect / Disconnect */}
        <button
          onClick={connected ? onDisconnect : onConnect}
          className={`px-4 py-1.5 text-[11px] font-semibold tracking-[0.10em] border transition-all ${
            connected
              ? 'border-[#ff4d4d]/60 text-[#ff4d4d] hover:bg-[#ff4d4d]/10'
              : 'border-[#00ff88] text-[#00ff88] bg-[#00ff88]/8 shadow-[0_0_10px_rgba(0,255,136,0.22)] hover:bg-[#00ff88]/14'
          }`}
        >
          {connected ? 'DISCONNECT' : 'CONNECT'}
        </button>

        {/* ── Status indicator ── */}
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
          <div className="flex flex-col leading-none">
            <span className={`text-[11px] tracking-widest ${cfg.text}`}>
              {cfg.label}
            </span>
            {mode === 'simulation' && modeReason && (
              <span className="text-[8px] text-[#ffd700]/50 tracking-wide mt-0.5 max-w-[180px] truncate">
                {modeReason}
              </span>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
