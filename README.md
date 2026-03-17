# Order Flow Elite — Multi-Asset Dashboard

A single-file, zero-dependency trading dashboard for order flow analysis across crypto, stocks, ETFs, and commodities.

**No build step. No server. Open `index.html` in any modern browser.**

---

## Screenshot

```
┌─────────────────────────────────────────────────────────────────┐
│ ORDER FLOW ELITE v7.0 │ BTCUSDT ▼ │ 1m 5m 15m 1h 4h 1D │ LIVE │
│ Price: 67,420  +2.14%  HIGH: 68,100  LOW: 66,900  FUNDING: +0.01%│
│ SENTIMENT: 42 FEAR                                               │
├──────────┬──────────────────────────────────┬───────────────────┤
│ SIGNAL   │           CHART                  │ TRADES BACKTEST   │
│ ▲ LONG   │      [Candlestick / Delta / DOM] │ SCANNER NEWS      │
│ 5/5 cond │                                  │ ALERTS SETTINGS   │
│ BULL DIV │                                  │                   │
│ ABSORPT. │                                  │                   │
└──────────┴──────────────────────────────────┴───────────────────┘
```

---

## Features

### Data Sources (all free, no API key required)
| Source | Usage |
|---|---|
| **Binance** REST + WebSocket | Crypto OHLCV, real-time streaming, 24h ticker |
| **Binance Futures** | Funding rate, open interest |
| **Yahoo Finance** (via CORS proxy) | Stocks, ETFs, indices |
| **Alternative.me** | Crypto Fear & Greed Index |
| **GDELT Doc API v2** | Global news feed per ticker |

### Signal Engine
Five-condition order flow signal computed on every bar:

| # | Condition | Description |
|---|---|---|
| 1 | **Bull Trend** | EMA50 > EMA200 (uptrend structure) |
| 2 | **HTF Vol Spike** | Current volume > N× rolling average |
| 3 | **Bull Divergence** | Pivot low with increasing buy volume |
| 4 | **Hidden Accumulation** | Buy > Sell volume while price ≤ prev close |
| 5 | **No Bull Exhaustion** | Positive delta without price follow-through |

**Long Entry**: All 5 conditions satisfied
**Short Entry**: Inverse conditions met
**Score**: 0–5 conditions active

### MCDX Plus
Sliding-window chip distribution model:
- **PC (Profit Chip)**: Percentage of floating supply in profit
- **FC (Float Chip)**: Actively traded supply
- **LC (Locked Chip)**: Long-term held supply
- **Behaviors**: Strong Hold / Breakout Ready / Distribution / Accumulation

### Charts
- **Candles** — OHLC with EMA-50/200 overlays, signal arrows, alert lines
- **Delta** — Bar-by-bar buy minus sell volume
- **DOM** — Cumulative session dominance (buy ÷ total dollar flow)
- **Volume** — Buy/sell volume with MA overlay
- Pan with drag, zoom with scroll wheel

### Multi-Timeframe (MTF) Confluence Matrix
Fetches 1m/5m/15m/1h/4h/1d data in parallel and runs the full indicator on each — shows bullish/bearish regime across all timeframes simultaneously. Click any cell to switch to that timeframe.

### Backtesting
Replays the 5-condition signal bar-by-bar over loaded history.

**Metrics reported**: Total P&L, Win Rate, Expectancy, Max Drawdown, Sharpe Ratio, Avg Win/Loss

> **Warning**: All backtests are in-sample (same data used to build indicators). Do not treat results as predictive.

### Full Scanner
Fetches 60 real bars for each favorited ticker, runs the full indicator engine, and reports long/short/wait signals with scores. Start/stop via SCANNER tab.

### Price Alerts
Set price level alerts for any ticker. Triggers with browser Push Notification and audio alert. Persisted in `localStorage`.

### Signal-Based Alerts (v7)
Beyond price levels, alerts can now trigger on:
- `SIGNAL` — fires when the indicator generates a Long or Short entry
- `PRICE` — fires when price crosses a specific level

### Fear & Greed Index (v7)
Displays the [Alternative.me Crypto Fear & Greed Index](https://alternative.me/crypto/fear-and-greed-index/) in the asset bar for all crypto tickers. Updated every 10 minutes. No API key required.

| Score | Classification | Color |
|---|---|---|
| 0–25 | Extreme Fear | Red |
| 26–45 | Fear | Amber |
| 46–55 | Neutral | Gray |
| 56–75 | Greed | Blue |
| 76–100 | Extreme Greed | Green |

### Funding Rate + Open Interest (v7)
For crypto perpetual futures, fetches from Binance Futures:
- **Funding Rate**: Positive = longs paying shorts (crowded longs, reversal risk)
- **Open Interest**: Total contract value in notional USD

### GDELT News Feed (v7)
The **NEWS** tab fetches live news headlines via the [GDELT Doc API v2](https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/) — a completely free, no-authentication, CORS-compatible API. Up to 15 articles per ticker over the last 6–24 hours. Cached for 5 minutes.

### AI Signal Validator
Sends current indicator state + recent news headlines + Fear & Greed score to a configurable Claude API endpoint and returns a 2-sentence analysis with a confidence score (0–100).

Requires a Cloudflare Worker proxy to the Anthropic API (see configuration below).

### Manual Trading
Open/close trades manually with the `+ TRADE` button. Tracks P&L, draws equity curve, exports to CSV.

---

## Keyboard Shortcuts

| Key | Action |
|---|---|
| `1`–`6` | Switch timeframe (1m/5m/15m/1h/4h/1D) |
| `C` | Candlestick view |
| `D` | Delta view |
| `O` | DOM dominance view |
| `/` | Open ticker search |
| `Escape` | Close dropdown |
| `T` | Trades tab |
| `B` | Backtest tab (runs immediately) |
| `P` | Portfolio/Scanner tab |
| `N` | News tab |
| `A` | Alerts tab |
| `S` | Settings tab |

---

## Configuration

Open the **SETTINGS** tab to configure:

### Indicator Parameters
- **VOL MA Length** (5–50, default 20): Period for the volume moving average used to detect spikes
- **Spike Multiplier** (1.5–5.0, default 2.0): Volume must exceed `MA × multiplier` to qualify as an HTF spike

### AI Signal Validator
Point to a Cloudflare Worker that proxies requests to the Anthropic Claude API:

```javascript
// worker.js
export default {
  async fetch(request) {
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
    // Add origin validation here for security:
    // const origin = request.headers.get('Origin');
    // if (!allowedOrigins.includes(origin)) return new Response('Forbidden', { status: 403 });
    const { prompt, model, max_tokens } = await request.json();
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY, // bound as a Worker secret
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: model || 'claude-haiku-4-5-20251001',
        max_tokens: max_tokens || 220,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    const data = await resp.json();
    return new Response(JSON.stringify({ content: data.content?.[0]?.text || '' }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}
```

### CORS Proxy (optional)
By default, Yahoo Finance data is fetched through `corsproxy.io`. You can configure your own proxy in Settings for improved reliability:

```
Self-hosted: https://your-proxy.example.com/?
```

Set any string ending in `?` or `=` that accepts `<proxy_url>?<encoded_target_url>`.

---

## Tickers

### Built-in
| Category | Symbols |
|---|---|
| Crypto | BTCUSDT, ETHUSDT, SOLUSDT, BNBUSDT, XRPUSDT, DOGEUSDT, AVAXUSDT, ADAUSDT |
| Mega Cap | NVDA, AAPL, MSFT, GOOGL, AMZN, META, TSLA, NFLX |
| ETF/Index | SPY, QQQ, IWM, DIA, GLD, TLT |
| Commodities | GC=F, CL=F, SI=F, NG=F |

### Custom Symbols
Type any symbol in the CUSTOM SYMBOL box in the ticker dropdown:
- Crypto: `LINKUSDT`, `DOTUSDT`, etc.
- Stocks: `AMZN`, `BABA`, etc.
- Yahoo Finance format: `BTC-USD`, `^VIX`

---

## Known Limitations

- **No real order book**: Buy/sell volume for stocks is approximated using the high-low-close method (Pine Script). Only Binance crypto tickers have true taker buy/sell data from the exchange.
- **In-sample backtest**: The backtest uses the same 300 bars displayed on the chart. Walk-forward validation is not available.
- **Yahoo Finance via proxy**: If both `corsproxy.io` and `allorigins.win` are down, stocks/ETFs will fail to load. Configure your own proxy in Settings as a fallback.
- **GDELT coverage**: GDELT indexes English-language web sources. Coverage for smaller altcoins or thinly-covered stocks may be limited.
- **Funding rate**: Only available for Binance perpetual futures (crypto). Not available for stocks or spot crypto.

---

## Data Attribution

| Source | License / Terms |
|---|---|
| Binance | [Binance Terms of Service](https://www.binance.com/en/terms) |
| Yahoo Finance | Unofficial API — no commercial redistribution |
| Alternative.me F&G | [Free to use with attribution](https://alternative.me/crypto/api/) |
| GDELT Doc API | [GDELT Open Platform](https://www.gdeltproject.org/about.html) — free for all uses |

---

## Version History

| Version | Changes |
|---|---|
| v7.0 | GDELT news feed, Fear & Greed Index, Funding Rate/OI, bar validation, CORS proxy config, signal alerts, AI prompt enriched with market context |
| v6.0 | WebSocket streaming, backtesting engine, MTF confluence matrix, price alerts, AI validator, full scanner |
| v5.3 | Performance audit: O(n) sliding window indicators, AbortController, RAF render system, Page Visibility API |
| v5.0 | MCDX Plus indicator, manual trading module, equity curve, CSV export |
