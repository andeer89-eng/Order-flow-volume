# Testing Rules

## Indicator Test Suite

**Location**: `tests/indicators.test.js`
**Run**: `node tests/indicators.test.js`
**Required passing count**: 93 tests

### When tests MUST run (non-negotiable)

- Any change to `runIndicators()` or `computeIndicatorsForBars()`
- Any change to `calcRSI()`, `sma()`, `ema()`
- Any change to `_mapBinanceBar()` or `_mapYahooBar()`
- Any change to `aggregate4hBars()`
- Any change to `esc()`
- Any sync of `order_flow_elite.pine` logic into JS

### What the tests cover

| Function | What is verified |
|----------|-----------------|
| `esc()` | HTML entity escaping for `& < > " '` |
| `sma(arr, n)` | Simple moving average with edge cases (empty, short) |
| `ema(arr, n)` | Exponential moving average, Wilder's variant |
| `calcRSI(closes, period)` | Wilder's smoothing RSI, OB=65 OS=35 thresholds |
| `_mapBinanceBar(k)` | Field mapping, `k.V` for taker buy vol (not `k.Q`) |
| `_mapYahooBar(t, q, i)` | Yahoo Finance → bar object, null-safety |
| `aggregate4hBars(bars)` | 1h → 4h aggregation, OHLCV correctness |

### Adding new tests

When adding new indicator logic, add corresponding test cases in `tests/indicators.test.js`:

```js
// Pattern: describe the formula, test known reference values
test('calcNewIndicator: known reference value', () => {
  const result = calcNewIndicator(inputData);
  assert(Math.abs(result - EXPECTED) < 0.0001, `Expected ~${EXPECTED}, got ${result}`);
});
```

Always test:
1. Normal case with known reference values
2. Edge case: empty array
3. Edge case: single element
4. Edge case: all zeros

### Pine Script parity testing

After syncing JS ↔ Pine Script logic:
1. Run `node tests/indicators.test.js` — all 93 tests must pass
2. Manually verify on TradingView with BTCUSDT 1h: signals must appear at same bars
3. Compare RSI values: JS `calcRSI()` vs Pine `ta.rsi()` — should match within 0.01 after warmup

### Manual browser testing checklist

Before any merge touching chart or data logic:

- [ ] Open `index.html` in Chrome/Firefox
- [ ] Select BTCUSDT — verify green WebSocket dot, bars load
- [ ] Select NVDA (stock) — verify Yahoo Finance data loads via CORS proxy
- [ ] Switch timeframes 1m → 5m → 1h → 4h — verify bars update correctly
- [ ] Click `⬇ PINE SCRIPT` — verify file downloads with correct content
- [ ] Open DevTools Console — verify no `console.error` or uncaught exceptions

### CI checks (`.github/workflows/ci.yml`)

The CI pipeline validates:
1. Pine Script syntax (basic structure check)
2. No hardcoded secrets (`grep -r "sk-"`)
3. HTMLHint lint pass
4. File structure integrity (required files present)

CI does NOT run the Node.js test suite automatically — run it locally before pushing.
