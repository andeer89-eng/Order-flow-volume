# Performance Rules

## WebSocket Tick Handler (highest priority)

The `onmessage` handler fires on every Binance kline tick. Rules:

- **No O(n) operations inside the tick handler.** No `array.reduce()`, `array.forEach()`, or full recalculation on every message.
- Cumulative volume uses `S._cumN`, `S._cumLastBuy`, `S._cumLastSell` for incremental tracking — do NOT call `recalcCumVolume()` with a full array scan on every tick.
- Bar updates: same-timestamp → update in place at `S.bars[last]`. New timestamp → `push()` then cap at `MAX_BARS = 300`.
- `htfVols` capped at 60 entries. Splice when exceeded.
- Canvas redraws MUST go through `scheduleRedraw()` / `requestAnimationFrame` — never call the draw function directly from the tick handler.

## Canvas Rendering

- Each view (price, delta, flow, DOM, volume) has its own dedicated draw function. Do not combine them.
- `scheduleRedraw()` coalesces multiple invalidation requests into a single `requestAnimationFrame` — always use it, never call draw functions synchronously.
- Avoid creating new arrays or objects inside draw functions on every frame. Pre-allocate where possible.
- Gradient creation is expensive — cache gradients keyed by color and height, recreate only when dimensions change.

## Data Aggregation

- 4h Yahoo Finance bars use `aggregate4hBars()` — never re-aggregate on every render, cache in `S.bars` after loading.
- HTF volume aggregation (`S.htfVols`) is incremental — append only, do not rebuild the full array on each update.
- `computeIndicatorsForBars()` runs full indicator pipeline on arbitrary bar arrays (backtest/MTF). Do not call it inside the live WebSocket path.

## Memory

- `S.bars` hard cap: 300. Enforce with `if (S.bars.length > 300) S.bars.shift()`.
- `S.htfVols` hard cap: 60. Same pattern.
- AbortController for fetch requests — cancel in-flight requests on ticker switch to prevent memory leaks and stale data application.
- WebSocket: call `ws.close()` before creating a new connection on ticker/timeframe switch. Store reference in `S.ws`.

## Indicator Computation

- EMA is incremental: `ema = alpha * close + (1 - alpha) * prevEma`. Never recalculate from scratch for every bar on every tick.
- RSI uses Wilder's smoothing (period 14). Recalculate only for the new/updated bar.
- `runIndicators()` runs after bar updates, not inside the raw tick handler.

## Benchmarks (targets)

| Operation | Target |
|-----------|--------|
| WebSocket tick handler | < 2ms |
| Canvas redraw (full) | < 16ms (60fps budget) |
| Historical load + indicator run | < 500ms |
| Ticker switch (close WS + new load) | < 1.5s |
