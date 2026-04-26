# Order Flow Volume Suite ELITE

AI agent context for Claude Code. Read this before touching any file.

## Project at a Glance

A professional trading dashboard + TradingView Pine Script indicator for real-time order flow analysis.

| File | Size | Purpose |
|------|------|---------|
| `index.html` | ~4,250 lines | Self-contained web dashboard — vanilla JS/CSS/HTML, no build step |
| `order_flow_elite.pine` | ~285 lines | Pine Script v6 volume-pane indicator for TradingView (`overlay=false`) |
| `order_flow_overlay.pine` | ~300 lines | Pine Script v6 price-chart overlay for TradingView (`overlay=true`) — PDH/PDL, ORB, SSL Hybrid, EMA Cloud, Session markers, Traffic Light |

**Stack**: Vanilla HTML/CSS/JS (no build system), Binance WebSocket + REST,
Yahoo Finance REST (via CORS proxies), Canvas 2D API, localStorage.

**Zero external dependencies.** No npm, no package.json, no build tools. Open `index.html` in a browser to run.

---

## Architecture: index.html

### Layout (top → bottom, left → right)
```
Header (52px)     — ticker selector, timeframe buttons, action buttons
Asset Info Bar    — price, 24h high/low, volume, market cap
Workspace (3 panels):
  Left  (254px)  — signal, MCDX, regime, metrics, entry conditions, detection flags
  Center (flex)  — dual-pane chart (price + volume/delta/flow/DOM views)
  Right (290px)  — tabs: Trades | Backtest | Scanner | Alerts | Settings | Guide
```

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
| Source | Protocol | Usage |
|--------|----------|-------|
| `wss://stream.binance.com:9443/ws/{sym}@kline_{tf}` | WebSocket | Crypto real-time bars |
| `https://api.binance.com/api/v3/klines` | REST | Crypto historical bars & 24h ticker |
| `https://query1.finance.yahoo.com/v8/finance/chart/{sym}` | REST | Stocks/ETFs/indices |
| `https://corsproxy.io/?{url}` | CORS proxy | Yahoo Finance primary proxy |
| `https://api.allorigins.win/raw?url={url}` | CORS proxy | Yahoo Finance fallback proxy |

4h bars for Yahoo Finance are aggregated client-side from 1h bars via `aggregate4hBars()`.

### localStorage Keys
| Key | Contents |
|-----|---------|
| `of_manual_trades` | Trade journal (JSON array) |
| `of_favorites` | Starred tickers (JSON array) |
| `of_watchlist` | Watchlist tickers (JSON array) |
| `of_price_alerts` | Price alert definitions (JSON array) |
| `of_ai_endpoint` | Claude API endpoint URL (string) |
| `of_theme` | `'light'` or `'dark'` |

### Supported Tickers
- **Crypto (Binance):** BTCUSDT, ETHUSDT, SOLUSDT, BNBUSDT, XRPUSDT, DOGEUSDT, AVAXUSDT, ADAUSDT
- **Mega Cap Stocks:** NVDA, AAPL, MSFT, GOOGL, AMZN, META, TSLA, NFLX
- **ETF/Index:** SPY, QQQ, IWM, DIA, GLD, TLT
- **Commodities:** GC=F, CL=F, SI=F, NG=F

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
| `downloadIndicator()` | Client-side Pine Script file download (volume-pane indicator) |
| `downloadOverlayIndicator()` | Client-side download for overlay Pine Script (PDH/PDL, ORB, SSL, etc.) |

### Keyboard Shortcuts
| Key | Action |
|-----|--------|
| `1-6` | Set timeframe (1m/5m/15m/1h/4h/1d) |
| `c/C` | Price/candles view |
| `d/D` | Delta view |
| `o/O` | DOM view |
| `/` | Focus ticker search |
| `Escape` | Close dropdown |
| `b/B` | Backtest tab |
| `t/T` | Trades tab |
| `a/A` | Alerts tab |
| `s/S` | Settings tab |
| `p/P` | Portfolio/scanner tab |

---

## Architecture: order_flow_elite.pine

Pine Script v6 indicator (`overlay=false`, `max_bars_back=500`).

### Core Calculations (in order)
1. **Trend Regime** — VWAP (daily reset) + EMA50/EMA200. Bull = price > VWAP AND EMA50 > EMA200.
2. **Volume Delta** — `buyVol = vol × (close-low)/range`, `sellVol = vol × (high-close)/range`, `delta = buyVol - sellVol`
3. **Imbalance** — `delta/volume` normalized to [-1, +1]
4. **CVD** — Session-cumulative delta, resets each new day
5. **Dollar Flow** — `buyDol = buyVol × close`, accumulated per session
6. **Absorption/Hidden Flow** — volume microstructure patterns
7. **HTF Spike** — Single `request.security()` tuple call for volume vs MA on higher timeframe
8. **Divergence** — Non-repainting: stores previous pivot price+delta in `var` variables, compares new confirmed pivot vs previous
9. **RSI Filter** — Blocks entries at momentum extremes (overbought/oversold)
10. **Entries/Exits** — `barstate.isconfirmed` only (no repainting)

### Critical: No-Repaint Rule
All entry/exit signals must use `barstate.isconfirmed`. Never use `barstate.islast` for signals. The divergence logic uses stored `var float` pivot references — do not revert to `low[10]`/`delta[5]` style offsets.

---

## Critical Rules

### Security

- All user input rendered in DOM **MUST** pass through `esc()` (line ~1064 of index.html)
- Never hardcode API keys, tokens, or secrets — use environment variables or the Settings tab
- CORS proxy URLs (`corsproxy.io`, `allorigins.win`) are public and unauthenticated — never route sensitive data through them
- The AI endpoint field accepts user-provided URLs — validate format before fetch
- Error messages must not leak internal state or stack traces
- `localStorage` is unencrypted and origin-scoped — do not store credentials or PII

### Indicator Parity

- JS indicator engine **MUST** match Pine Script logic in `order_flow_elite.pine`
- RSI uses Wilder's smoothing (period 14, OB=65, OS=35)
- Entry signals require: `trend + htfSpike + RSI filter + divergence + !exhaust`
- Any change to signal logic must be reflected in both JS and Pine Script
- When Pine Script changes: update `order_flow_elite.pine` AND the string in `downloadIndicator()`
- When overlay Pine Script changes: update `order_flow_overlay.pine` AND the string in `downloadOverlayIndicator()`

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

- **Single-file architecture** — all JS/CSS stays inline in `index.html`. Do not create separate `.js` or `.css` files unless explicitly requested
- Functions follow camelCase, CSS classes use kebab-case
- Prefer `const` over `let`; avoid `var`
- Functions should be under 50 lines where practical
- No silent `catch(_) {}` — always log errors via `logAlert()`
- Use descriptive variable names; avoid single-letter names except loop counters
- Pine Script v6: use `var` for persistent variables, `:=` for reassignment, ternary over `if/else` for simple assignments

---

## File Structure

```
index.html                     # Monolithic dashboard (CSS + HTML + JS, ~4250 lines)
order_flow_elite.pine          # TradingView Pine Script v6 indicator (285 lines)
order_flow_overlay.pine        # TradingView overlay indicator — PDH/PDL, ORB, SSL, EMA Cloud (~300 lines)
CLAUDE.md                      # This file — project context for Claude Code
README.md                      # Human-facing documentation
.gitignore                     # Git ignore rules
.htmlhintrc                    # HTMLHint linting config
.claude/
  settings.json                # Claude Code hooks and quality gates
  agents/
    trading-logic-reviewer.md  # Specialist agent: financial logic, Pine parity, XSS review
  skills/
    indicator-parity/          # Enforce JS ↔ Pine Script calculation parity
    pine-script-update/        # Workflow for .pine edits + downloadIndicator() sync
    data-validation/           # WebSocket + REST data boundary validation
    security-check/            # XSS (esc()), CSP, no hardcoded secrets
    websocket-debugging/       # 4-phase WS bug investigation framework
.github/
  workflows/ci.yml             # CI pipeline (pine validation, secrets, lint, structure)
  PULL_REQUEST_TEMPLATE.md     # PR checklist
  ISSUE_TEMPLATE/              # Bug report and feature request templates
deltalytix-integration/        # Deltalytix server-side files (Prisma schema, API routes, keygen)
tests/
  indicators.test.js           # Indicator & utility test suite (93 tests)
```

---

## Skills (Superpowers-style)

Invoke these via the `Skill` tool in Claude Code. Each provides a mandatory workflow checklist for high-risk operations.

| Skill | Invoke when… |
|---|---|
| `indicator-parity` | Changing any signal logic, RSI, EMA, CVD, divergence, or entry/exit conditions |
| `pine-script-update` | Editing any `.pine` file or the download button |
| `data-validation` | Writing or modifying WebSocket handlers or REST fetch callbacks |
| `security-check` | Adding `innerHTML`, new external fetch targets, or `localStorage` reads |
| `websocket-debugging` | Live dot stuck, bars not updating, ticker switch leaves stale data |

**Specialist agent:** `trading-logic-reviewer` — use via the Agent tool to get a structured code review focused on financial logic accuracy, Pine parity, no-repaint rules, and XSS.

---

## Testing

Run the indicator test suite:

```bash
node tests/indicators.test.js
```

Tests cover: `esc()`, `sma()`, `ema()`, `calcRSI()`, `_mapBinanceBar()`,
`_mapYahooBar()`, `aggregate4hBars()`. Verify all tests pass before merging
changes to indicator logic.

Manual dashboard testing:
1. Open `index.html` in a modern browser (Chrome/Firefox/Edge)
2. Select a crypto ticker → verify WebSocket connects (green dot in header)
3. Select a stock ticker → verify Yahoo Finance data loads via CORS proxy
4. Click `⬇ PINE SCRIPT` → verify file downloads correctly

---

## Git Workflow

- **Conventional commits**: `feat:`, `fix:`, `perf:`, `refactor:`, `docs:`, `test:`
- **Scopes**: `(chart)`, `(ws)`, `(indicators)`, `(backtest)`, `(xss)`, `(ui)`, `(pine)`
- Feature branches from `main`
- Test indicator calculations against known reference values before merge
- Never commit with `--no-verify`

---

## Common Tasks

**Add a new ticker:** Add an entry to the `TICKERS` object (line ~979) with `{ sym, name, type, yf, binance? }`.

**Change indicator logic:** Edit `order_flow_elite.pine` first, verify in TradingView, then sync the string in `downloadIndicator()`. Run `node tests/indicators.test.js` to confirm JS parity.

**Change overlay indicator:** Edit `order_flow_overlay.pine` first, verify in TradingView, then sync the string in `downloadOverlayIndicator()` in `index.html`.

**Overlay canvas features (PDH/PDL, ORB, EMA 8):** These are computed in `runIndicators()` and stored in `S._pdh`, `S._pdl`, `S._orbH`, `S._orbL`, `S._e8`. They are drawn in `drawOverlays()` after the VWAP section.

**Add a dashboard metric:** Add a row to the `METRICS` section in the left panel HTML and wire it to the `S` state object via the `updateDashboard()` function.

**Modify chart views:** Chart rendering is in the canvas-based viewport system (~line 1600–2400). Each view (price/delta/flow/DOM/volume) has its own draw function.

---

## Known Constraints

- Single-file architecture limits modularization — future goal is decomposition
- Yahoo Finance 4h data requires client-side aggregation from 1h bars
- CORS proxies may have rate limits or downtime — fallback chain in place
- Pine Script v6 syntax differs from JS — manual translation required
- No build system — all JS runs directly in browser via `<script>` tags
