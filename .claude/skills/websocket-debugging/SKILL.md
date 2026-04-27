---
name: websocket-debugging
description: Use when WebSocket disconnects unexpectedly, bars stop updating, the live dot is stuck, chart freezes after ticker switch, or data appears stale while connection shows green
---

## Overview

WebSocket bugs in trading dashboards follow predictable patterns: stale connection references, ticker-switch race conditions, missing reconnect backoff, or bar update logic treating every message as a new bar. Use this 4-phase framework before touching any ws code.

## When to Use

- Live dot shows green but chart isn't updating
- Switching tickers leaves the old ticker's data on screen
- Console shows repeated `WebSocket is already in CLOSING or CLOSED state` errors
- `S.bars` grows unboundedly or freezes at a fixed count
- Same-timestamp bar creates a new bar instead of updating in place

## Core Pattern (4 phases — do not skip)

### Phase 1: Root Cause Investigation

Before any code change, reproduce the bug and trace the data flow:

```javascript
// Add temporary trace to ws.onmessage:
ws.onmessage = (evt) => {
  const msg = JSON.parse(evt.data);
  console.log('[WS]', msg.k?.s, msg.k?.t, 'closed:', msg.k?.x, 'bars:', S.bars.length);
  // ... existing handler
};
```

Confirm whether:
- The message is arriving (network tab → WS frames)
- `S.ws` matches the active `ws` reference
- `S._abortController` has been aborted before the new connection opens

### Phase 2: Pattern Analysis — known WS bugs in this codebase

| Symptom | Likely cause | Location |
|---|---|---|
| Old data after ticker switch | Previous `ws` not closed before new connect | `connectWS()` |
| Duplicate bars for same timestamp | Bar update creates new bar instead of mutating | `_mapBinanceBar()` usage |
| Reconnect storm | Backoff not applied on `ws.onerror` | `ws.onerror` handler |
| AbortError floods alert log | `fetchBinanceHistory` not filtering `AbortError` | fetch catch block |
| `S.ws` is stale | `S.ws = ws` not assigned before `ws.onopen` returns | assignment order |

### Phase 3: Hypothesis

Form one hypothesis per investigation. Examples:
- "The old WebSocket is not being closed — `ws.close()` is called but the reference in `S.ws` was already overwritten"
- "The bar timestamp comparison uses `===` but Binance sends the same timestamp as both a string and a number across updates"

Test by logging the single variable in question. Do not make code changes yet.

### Phase 4: Implementation

Only after confirming the root cause:

```javascript
// Correct ticker-switch close pattern:
function connectWS(sym, tf) {
  // 1. Abort any in-flight REST fetches
  if (S._abortController) S._abortController.abort();
  S._abortController = new AbortController();

  // 2. Close existing WS cleanly
  if (S.ws) {
    S.ws.onclose = null; // prevent reconnect trigger
    S.ws.close();
    S.ws = null;
  }

  // 3. Open new connection
  const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${sym.toLowerCase()}@kline_${tf}`);
  S.ws = ws; // assign immediately — before onopen
  // ...
}
```

```javascript
// Correct bar update (same timestamp → mutate, new timestamp → push):
function handleKline(k) {
  const t = +k.t;
  const last = S.bars[S.bars.length - 1];
  if (last && last.time === t) {
    // Update in place — do NOT push a new bar
    last.close = +k.c; last.high = Math.max(last.high, +k.h);
    last.low = Math.min(last.low, +k.l); last.volume = +k.v;
    last.buyVol = +k.V; last.sellVol = last.volume - last.buyVol;
    last.delta = last.buyVol - last.sellVol;
  } else {
    S.bars.push(_mapBinanceBar(k));
    if (S.bars.length > 300) S.bars.shift();
  }
}
```

```javascript
// Exponential backoff reconnect:
let _wsRetry = 0;
ws.onerror = (e) => { logAlert('info', 'WS error — will reconnect'); };
ws.onclose = () => {
  if (S.ws !== ws) return; // stale close — ignore
  const delay = Math.min(30000, 1000 * Math.pow(2, _wsRetry++));
  setTimeout(() => connectWS(S.sym, S.tf), delay);
};
ws.onopen = () => { _wsRetry = 0; };
```

## Common Mistakes

- Calling `ws.close()` without nulling `S.ws` first — the `onclose` handler reconnects immediately
- Checking `ws.readyState === WebSocket.OPEN` before calling `ws.close()` — safe to call on any state
- Using `==` instead of `===` for timestamp comparison — Binance sends numeric ms values
- Assuming `k.x === true` means the bar is the only confirmed bar — WS sends updates for the forming bar too
- Forgetting to call `recalcCumVolume()` and `runIndicators()` after a bar update
