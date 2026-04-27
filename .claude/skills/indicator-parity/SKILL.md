---
name: indicator-parity
description: Use when changing any signal logic, RSI, EMA, CVD, divergence, exhaustion, volume delta, or entry/exit conditions in index.html or order_flow_elite.pine
---

## Overview

Every indicator calculation exists in two places: `runIndicators()` in `index.html` (JS) and `order_flow_elite.pine` (Pine Script v6). These MUST stay identical. Divergence between them means the dashboard shows different signals than TradingView.

## When to Use

- Editing `runIndicators()`, `computeIndicatorsForBars()`, or any helper (`calcRSI`, `sma`, `ema`, `calcSessionVWAP`)
- Changing entry/exit conditions (`longEntry`, `shortEntry`, `longExit`, `shortExit`)
- Modifying divergence, exhaustion, absorption, hidden accumulation/distribution logic
- Updating RSI thresholds (`rsiOB`, `rsiOS`), EMA periods, or spike multiplier defaults
- Any change to `order_flow_elite.pine`

## Core Pattern

**Before (broken):** Edit `runIndicators()` in `index.html`. Forget to update Pine Script. Dashboard and TradingView now disagree silently.

**After (correct):**
1. Identify the exact calculation to change
2. Make the change in BOTH files simultaneously
3. Verify the logic matches line-by-line
4. Update the embedded string inside `downloadIndicator()` in `index.html` to match `order_flow_elite.pine`
5. Run tests: `node tests/indicators.test.js`

## Quick Reference

| JS location | Pine Script equivalent |
|---|---|
| `calcRSI(closes, 14)` | `ta.rsi(close, 14)` — Wilder's smoothing, period 14 |
| `ema(closes, 50)` | `ta.ema(close, 50)` |
| `calcSessionVWAP(bars)` | `ta.vwap(high, low, close)` with daily reset |
| `cur.delta = buyVol - sellVol` | `delta = buyVol - sellVol` |
| `buyVol = vol * (close-low)/range` | `buyVol = volume * (close-low) / (high-low)` |
| `rsiOB = 65`, `rsiOS = 35` | `rsiOB = input.int(65)`, `rsiOS = input.int(35)` |
| `htfSpike = htfVol > htfMAv * spikeMult` | `htfSpike = htfVol > htfMA * spikeMult` |

## Implementation

### Step 1 — Locate both sides of the calculation

```bash
grep -n "bullDiv\|bearDiv\|hiddenAccum\|bullExhaust" index.html | head -20
grep -n "bullDiv\|bearDiv\|hiddenAccum\|bullExhaust" order_flow_elite.pine
```

### Step 2 — Change both files

Make the same logical change in:
- `index.html` → `runIndicators()` (line ~1745) and `computeIndicatorsForBars()` (line ~1696)
- `order_flow_elite.pine` → matching section

### Step 3 — Sync downloadIndicator()

The string literal inside `downloadIndicator()` in `index.html` (~line 3700) MUST be identical to `order_flow_elite.pine`. After editing the `.pine` file, copy its full content and replace the template literal.

### Step 4 — Run the test suite

```bash
node tests/indicators.test.js
```

All 93 tests must pass. If any fail, fix before committing.

### Step 5 — Verify RSI uses Wilder's smoothing

JS (`calcRSI`): uses exponential smoothing with `1/period` factor (not standard EMA).
Pine: `ta.rsi()` uses Wilder's by default.
These match — do NOT change `calcRSI` to use standard EMA.

## Common Mistakes

- Editing only `index.html` and assuming Pine Script "doesn't matter for now"
- Forgetting `computeIndicatorsForBars()` — it's a separate copy used by the backtest engine and scanner
- Using `low[10]` / `delta[5]` style offsets for divergence — these repaint. Use stored `var float` pivot references
- Changing `k.V` to `k.Q` in WebSocket handler — `k.V` is taker buy volume (base), `k.Q` is quote volume
