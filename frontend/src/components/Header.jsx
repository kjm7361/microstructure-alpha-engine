import { useState } from 'react'

const PRESETS = ['AAPL', 'TSLA', 'SPY', 'NVDA', 'MSFT', 'AMZN', 'GOOGL', 'META', 'QQQ', 'AMD']

export default function Header({ ticker, onTickerChange, connected, onConnect, onDisconnect, isSimulated }) {
  const [customVal, setCustomVal] = useState('')

  const handlePreset = (t) => {
    setCustomVal('')       // clear the text input so it never duplicates a preset
    onTickerChange(t)
  }

  const handleCustom = (e) => {
    const v = e.target.value.toUpperCase().slice(0, 6)
    setCustomVal(v)
    if (v) onTickerChange(v)
  }

  const isPreset      = PRESETS.includes(ticker)
  const customActive  = !isPreset && !!ticker

  return (
    <div className="border-b border-[#1c2333] bg-[#0d1117] px-4 py-3 flex flex-wrap items-center gap-y-2 justify-between">

      {/* ── Brand ── */}
      <div className="flex items-center gap-3 min-w-0">
        <span className="w-2.5 h-2.5 rounded-full bg-[#00ff88] shadow-[0_0_10px_#00ff88] flex-shrink-0" />
        <span className="text-[#00ff88] font-bold tracking-[0.14em] text-[13px] glow-green whitespace-nowrap">
          MICROSTRUCTURE ALPHA ENGINE
        </span>
        {isSimulated && (
          <span className="text-[10px] px-2 py-0.5 border border-[#ffd700]/40 text-[#ffd700] tracking-widest whitespace-nowrap">
            SIM
          </span>
        )}
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

          {/* Custom ticker — only shows value when it's NOT a preset */}
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
              : 'border-[#00ff88]/60 text-[#00ff88] hover:bg-[#00ff88]/10'
          }`}
        >
          {connected ? 'DISCONNECT' : 'CONNECT'}
        </button>

        {/* Status dot */}
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
            connected ? 'bg-[#00ff88] shadow-[0_0_7px_#00ff88]' : 'bg-[#2d3748]'
          }`} />
          <span className={`text-[11px] tracking-widest ${connected ? 'text-[#00ff88]' : 'text-[#6b7280]'}`}>
            {connected ? 'LIVE' : 'OFFLINE'}
          </span>
        </div>

      </div>
    </div>
  )
}
