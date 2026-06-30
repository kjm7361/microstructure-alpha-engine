import { useState, useEffect, useRef, useCallback } from 'react'
import Header from './components/Header'
import OrderBookPanel from './components/OrderBookPanel'
import KyleLambdaPanel from './components/KyleLambdaPanel'
import OFIPanel from './components/OFIPanel'
import AlmgrenChrissPanel from './components/AlmgrenChrissPanel'
import SpreadDecompositionPanel from './components/SpreadDecompositionPanel'
import LiveTradesFeed from './components/LiveTradesFeed'

export default function App() {
  const [ticker, setTicker]           = useState('AAPL')
  const [connected, setConnected]     = useState(false)
  const [snapshot, setSnapshot]       = useState(null)
  const [trades, setTrades]           = useState([])
  const [isSimulated, setIsSimulated] = useState(false)
  const wsRef = useRef(null)

  const connect = useCallback((t) => {
    if (wsRef.current) wsRef.current.close()
    const ws = new WebSocket(`ws://localhost:8000/ws/orderbook?ticker=${t}`)
    ws.onopen    = () => setConnected(true)
    ws.onclose   = () => setConnected(false)
    ws.onerror   = () => setConnected(false)
    ws.onmessage = (e) => {
      const data = JSON.parse(e.data)
      if (data.type === 'snapshot') {
        setSnapshot(data)
        setIsSimulated(!!data.is_simulated)
        if (data.last_trade_price) {
          setTrades(prev => [{
            timestamp:  data.timestamp,
            price:      data.last_trade_price,
            size:       data.last_trade_size,
            side:       data.trade_side,
            spread_bps: data.spread_bps,
          }, ...prev].slice(0, 30))
        }
      }
    }
    wsRef.current = ws
  }, [])

  const disconnect = useCallback(() => {
    wsRef.current?.close()
    wsRef.current = null
    setConnected(false)
    setSnapshot(null)
    setTrades([])
  }, [])

  useEffect(() => () => wsRef.current?.close(), [])

  return (
    <div className="min-h-screen bg-[#0a0e14] font-mono text-[#c9d1d9] select-none">
      <Header
        ticker={ticker}
        onTickerChange={setTicker}
        connected={connected}
        onConnect={() => connect(ticker)}
        onDisconnect={disconnect}
        isSimulated={isSimulated}
      />

      {/*
        Desktop (md+): 12-column grid, 2 rows
          Row 1 — OrderBook(3) | KyleLambda(5) | OFI(4)
          Row 2 — AlmgrenChriss(5) | SpreadDecomp(4) | LiveTrades(3)

        Mobile: single column, priority order:
          OrderBook → OFI → KyleLambda → AlmgrenChriss → SpreadDecomp → LiveTrades
        The `order-*` / `md:order-*` classes control this swap.
      */}
      <div className="p-3 grid grid-cols-1 md:grid-cols-12 gap-3 items-start">

        {/* OrderBook — mobile 1st, desktop row-1 col 1-3 */}
        <div className="order-1 md:col-span-3 md:order-1">
          <OrderBookPanel snapshot={snapshot} connected={connected} />
        </div>

        {/* OFI — mobile 2nd, desktop row-1 col 9-12 */}
        <div className="order-2 md:col-span-4 md:order-3">
          <OFIPanel ticker={ticker} connected={connected} />
        </div>

        {/* KyleLambda — mobile 3rd, desktop row-1 col 4-8 */}
        <div className="order-3 md:col-span-5 md:order-2">
          <KyleLambdaPanel ticker={ticker} connected={connected} />
        </div>

        {/* AlmgrenChriss — mobile 4th, desktop row-2 col 1-5 */}
        <div className="order-4 md:col-span-5 md:order-4">
          <AlmgrenChrissPanel ticker={ticker} connected={connected} />
        </div>

        {/* SpreadDecomp — mobile 5th, desktop row-2 col 6-9 */}
        <div className="order-5 md:col-span-4 md:order-5">
          <SpreadDecompositionPanel ticker={ticker} connected={connected} />
        </div>

        {/* LiveTrades — mobile 6th, desktop row-2 col 10-12 */}
        <div className="order-6 md:col-span-3 md:order-6">
          <LiveTradesFeed trades={trades} connected={connected} />
        </div>

      </div>
    </div>
  )
}
