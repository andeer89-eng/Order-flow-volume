# Order Flow Volume - Trading Dashboard

## Project Overview

Single-page real-time trading dashboard with canvas-based charting, order flow
analysis, and multi-timeframe confluence detection.

**Stack**: Vanilla HTML/CSS/JS (no build system), Binance WebSocket + REST,
Yahoo Finance REST (via CORS proxies), Canvas 2D API, localStorage

**Pine Script**: `order_flow_elite.pine` — TradingView Pine Script v6 indicator
that the JS engine must maintain parity with.

## Architecture

Single file: `index.html` (~3,950 lines) containing embedded CSS, HTML, and JS.

### Global State

All mutable state lives in the `S` object. Key properties:

- `S.bars[]` — OHLCV+delta bar array (max 300)
- `S.sym` — Current ticker symbol
- `S.tf` — Current timeframe
- `S.ws` — Active WebSocket connection
- `S.htfVols[]` — Higher timeframe volume aggregates (max 60)
- `S.cumBuy`, `S.cumSell` — Cumulative volume running totals
- `S.trades[]` — Manual portfolio trades (localStorage-persisted)
- `S.favorites[]` — Watchlist symbols (localStorage-persisted)

### Data Sources

- **Crypto**: Binance REST (`/api/v3/klines`) + WebSocket (`/ws/{sym}@kline_{interval}`)
- **Stocks/ETFs**: Yahoo Finance via `corsproxy.io` or `allorigins.win` (CORS proxies)
- **Intervals**: 1m, 5m, 15m, 1h, 4h (4h aggregated client-side from 1h for Yahoo)

### Key Functions

| Function | Purpose |
|---|---|
| `calcRSI(closes, period)` | Wilder's smoothing RSI |
| `sma(arr, n)` | Simple moving average |
| `runIndicators()` | Main indicator pipeline (EMA, VWAP, CVD, divergence, signals) |
| `computeIndicatorsForBars(bars)` | Indicator computation for arbitrary bar arrays (MTF/backtest) |
| `_mapBinanceBar(k)` | Shared Binance kline → bar object mapper |
| `_mapYahooBar(t, q, i)` | Shared Yahoo Finance → bar object mapper |
| `aggregate4hBars(bars)` | Client-side 1h → 4h aggregation |
| `recalcCumVolume()` | Incremental cumulative buy/sell volume |
| `esc(s)` | HTML entity escaping for XSS prevention |
| `logAlert(level, msg)` | Alert/notification system |

## Critical Rules

### Security

- All user input rendered in DOM **MUST** pass through `esc()` function
- Never expose API keys in committed code
- CORS proxy URLs are configurable, not secrets, but avoid hardcoding new ones
- The AI endpoint field accepts user-provided URLs — validate format before fetch
- Error messages must not leak internal state or stack traces

### Indicator Parity

- JS indicator engine **MUST** match Pine Script logic in `order_flow_elite.pine`
- RSI uses Wilder's smoothing (period 14, OB=65, OS=35)
- Entry signals require: `trend + htfSpike + RSI filter + divergence + !exhaust`
- Any change to signal logic must be reflected in both JS and Pine Script

### WebSocket Data

- Taker buy volume uses field `k.V` (base asset volume), **NOT** `k.Q` (quote asset volume)
- Bar updates: same-timestamp → update in place; new timestamp → push new bar
- Connection uses exponential backoff on failure
- Always filter `AbortError` from error logging in fetch catch blocks

### Performance

- `recalcCumVolume()` uses incremental tracking via `S._cumN`, `S._cumLastBuy`, `S._cumLastSell`
- Canvas redraws throttled via `scheduleRedraw()` / `requestAnimationFrame`
- Bar array capped at 300 entries; `htfVols` capped at 60
- Avoid O(n) reduce/recalculation on every WebSocket tick

### Code Style

- No emojis in code or comments
- Prefer `const` over `let`; avoid `var`
- Functions should be under 50 lines where practical
- No silent `catch(_) {}` — always log errors via `logAlert()`
- Use descriptive variable names; avoid single-letter names except loop counters

## File Structure

```
index.html                    # Monolithic dashboard (CSS + HTML + JS, ~3950 lines)
order_flow_elite.pine         # TradingView Pine Script v6 indicator (285 lines)
CODEBASE_ANALYSIS.md          # Detailed codebase analysis with findings
REPOSITORY_PATTERN_ANALYSIS.md # Cross-repo pattern analysis and recommendations
CLAUDE.md                     # This file — project context for Claude Code
.gitignore                    # Git ignore rules
```

## Git Workflow

- **Conventional commits**: `feat:`, `fix:`, `perf:`, `refactor:`, `docs:`, `test:`
- **Scopes**: `(chart)`, `(ws)`, `(indicators)`, `(backtest)`, `(xss)`, `(ui)`
- Feature branches from `main`
- Test indicator calculations against known reference values before merge
- Never commit with `--no-verify`

## Known Constraints

- Single-file architecture limits modularization — future goal is decomposition
- Yahoo Finance 4h data requires client-side aggregation from 1h bars
- CORS proxies may have rate limits or downtime — fallback chain in place
- Pine Script v6 syntax differs from JS — manual translation required
- No build system — all JS runs directly in browser via `<script>` tags
