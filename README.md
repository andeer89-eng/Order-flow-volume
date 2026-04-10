# Order Flow Volume Suite ELITE

A professional, real-time order flow trading dashboard and TradingView Pine Script v6 indicator.

## Features

- **Real-time data** — Binance WebSocket for crypto, Yahoo Finance REST for stocks/ETFs
- **Order flow metrics** — Buy/sell volume delta, session CVD, bar imbalance, dollar flow dominance
- **Multi-view charting** — Candles, Delta, Flow, DOM, Volume (TradingView-style viewport)
- **Signal engine** — Trend regime (VWAP + EMA), HTF spike detection, divergence, exhaustion
- **Backtesting** — In-browser historical simulation of the indicator strategy
- **Scanner** — Multi-symbol signal status across 30+ pre-defined tickers
- **Trade journal** — Manual entry/exit tracking with equity curve and P&L
- **Price alerts** — Browser notifications + audio when price levels are hit
- **Pine Script export** — One-click download of the indicator for TradingView

## Quick Start

No installation required. Open `index.html` in any modern browser (Chrome, Firefox, Edge, Safari).

```bash
# Clone and open
git clone https://github.com/andeer89-eng/Order-flow-volume.git
cd Order-flow-volume
open index.html          # macOS
start index.html         # Windows
xdg-open index.html      # Linux
```

## Supported Assets

| Category | Symbols |
|----------|---------|
| Crypto | BTC, ETH, SOL, BNB, XRP, DOGE, AVAX, ADA |
| Mega Cap | NVDA, AAPL, MSFT, GOOGL, AMZN, META, TSLA, NFLX |
| ETF/Index | SPY, QQQ, IWM, DIA, GLD, TLT |
| Commodities | GC=F (Gold), CL=F (Oil), SI=F (Silver), NG=F (Nat Gas) |

Custom symbol entry is supported via the ticker dropdown.

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `1–6` | Timeframes: 1m / 5m / 15m / 1h / 4h / 1d |
| `c` | Candles view |
| `d` | Delta view |
| `o` | DOM view |
| `b` | Backtest tab |
| `t` | Trades tab |
| `a` | Alerts tab |
| `s` | Settings tab |
| `p` | Portfolio / Scanner tab |
| `/` | Open ticker search |
| `Esc` | Close dropdown |

## Pine Script Indicator

The indicator (`order_flow_elite.pine`) is Pine Script v6 and runs on TradingView.

**How to use:**
1. Click `⬇ PINE SCRIPT` in the dashboard header
2. Open TradingView → Pine Editor (bottom panel)
3. Paste the downloaded file content
4. Click **Add to chart**

**Signal logic (no repainting):**
- Long: Bull trend + HTF volume spike + (divergence or hidden accumulation) + RSI not overbought
- Short: Bear trend + HTF volume spike + (divergence or hidden distribution) + RSI not oversold
- All signals confirmed with `barstate.isconfirmed`

## Files

```
Order-flow-volume/
  index.html              — Self-contained trading dashboard (~3,900 lines)
  order_flow_elite.pine   — Pine Script v6 indicator for TradingView
  CLAUDE.md               — AI agent context (Claude Code)
  README.md               — This file
  .claude/                — Claude Code hooks and settings
  .github/                — CI/CD workflows and PR/issue templates
```

## Contributing

1. Fork the repo and create a branch: `git checkout -b feature/your-feature`
2. Make changes — see `CLAUDE.md` for architecture details and coding conventions
3. Test: open `index.html` in browser, verify on at least one crypto and one stock ticker
4. Open a pull request using the provided template

## Security

- No credentials are hardcoded — the Claude API endpoint is stored in `localStorage` via the Settings tab
- CORS proxies (`corsproxy.io`, `allorigins.win`) are used for Yahoo Finance and are public/unauthenticated — do not route sensitive data through them
- All user-supplied strings are HTML-encoded via `esc()` before DOM insertion

## License

MIT
