---
name: data-validation
description: Use when handling Binance WebSocket messages, Yahoo Finance REST responses, or any external API data before using it in calculations or DOM rendering
---

## Overview

Trading data from external sources is untrusted. Null fields, stale bars, or malformed WebSocket messages cause silent NaN bugs in P&L calculations, volume metrics, and chart rendering. Validate at the boundary — never assume fields exist.

## When to Use

- Writing or modifying WebSocket message handlers (`ws.onmessage`)
- Processing Binance kline data (`_mapBinanceBar`, `fetchBinanceHistory`)
- Processing Yahoo Finance chart responses (`_mapYahooBar`, `fetchYahooPoll`)
- Any `fetch()` callback that populates `S.bars`
- Adding a new data source or broker integration

## Core Pattern

**Broken:** `const buyVol = msg.k.V * price` — crashes if `k` is missing or `V` is undefined.

**Correct:** Validate presence and type before arithmetic; skip or log on invalid data.

## Quick Reference

### Binance WebSocket fields (kline event `k`)

| Field | Meaning | Validation |
|---|---|---|
| `k.t` | Bar open time (ms) | `Number.isFinite(+k.t)` |
| `k.o/h/l/c` | OHLC prices | `Number.isFinite(+k.x)` for each |
| `k.v` | Base asset volume | `Number.isFinite(+k.v) && +k.v >= 0` |
| `k.V` | Taker buy base volume | `Number.isFinite(+k.V)` — **use this, NOT `k.Q`** |
| `k.Q` | Taker buy quote volume | Do NOT use for buy volume — quote units |
| `k.x` | Is bar closed? | `k.x === true` for confirmed bar |

### Yahoo Finance response structure

```javascript
// Always null-check before array access
const q = result?.indicators?.quote?.[0];
if (!q) return;
const opens  = q.open  ?? [];
const highs  = q.high  ?? [];
const lows   = q.low   ?? [];
const closes = q.close ?? [];
const vols   = q.volume ?? [];
// Skip bars with null OHLCV
if (closes[i] == null || vols[i] == null) continue;
```

## Implementation

### WebSocket handler validation template

```javascript
ws.onmessage = (evt) => {
  let msg;
  try { msg = JSON.parse(evt.data); } catch { return; }
  const k = msg?.k;
  if (!k) return;
  // Validate critical numeric fields before any arithmetic
  const o = +k.o, h = +k.h, l = +k.l, c = +k.c, v = +k.v, V = +k.V;
  if (!Number.isFinite(o) || !Number.isFinite(h) || !Number.isFinite(l) ||
      !Number.isFinite(c) || !Number.isFinite(v) || !Number.isFinite(V)) {
    logAlert('info', 'WS: skipping malformed kline bar');
    return;
  }
  const range = h - l;
  const buyVol  = range > 0 ? v * (c - l) / range : v * 0.5;
  // ... rest of handler
};
```

### REST response validation template

```javascript
async function fetchYahooPoll(sym) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const result = data?.chart?.result?.[0];
  if (!result) { logAlert('info', 'Yahoo: empty result'); return false; }
  const q = result.indicators?.quote?.[0];
  if (!q) { logAlert('info', 'Yahoo: no quote data'); return false; }
  const timestamps = result.timestamp ?? [];
  const opens  = q.open   ?? [];
  const highs  = q.high   ?? [];
  const lows   = q.low    ?? [];
  const closes = q.close  ?? [];
  const vols   = q.volume ?? [];
  // Guard against ragged arrays
  const n = Math.min(timestamps.length, closes.length, vols.length);
  // ... process n bars
}
```

### Error logging rules

- Always log via `logAlert('info', message)` — never `console.error` alone
- Filter `AbortError` from all fetch error handlers:
  ```javascript
  } catch(e) { if (e.name !== 'AbortError') logAlert('info', 'Source error: ' + e.message); }
  ```
- Never expose internal state or stack traces in error messages

## Common Mistakes

- Using `k.Q` (quote volume) instead of `k.V` (base buy volume) for taker buy calculation
- Assuming `result.indicators.quote[0]` always exists — Yahoo returns null on weekends and after hours
- Not checking `Number.isFinite()` — `+undefined` is `NaN`, which silently corrupts all downstream math
- Using `arr.reduce()` on a potentially empty array without a default accumulator
- Ignoring `AbortError` suppression — controller aborts during ticker switches flood the alert log
