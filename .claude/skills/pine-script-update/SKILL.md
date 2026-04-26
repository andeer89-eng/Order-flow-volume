---
name: pine-script-update
description: Use when downloading, modifying, or adding features to order_flow_elite.pine or order_flow_overlay.pine, or when asked to update the Pine Script download button
---

## Overview

There are two Pine Script files and two download functions. Every change to a `.pine` file requires a matching update to its embedded string in `index.html`. Out-of-sync strings mean users download stale code.

## When to Use

- Any edit to `order_flow_elite.pine`
- Any edit to `order_flow_overlay.pine`
- Adding a new feature that should appear in TradingView
- User reports downloaded Pine Script doesn't match dashboard behaviour

## Core Pattern

**Broken:** Edit `.pine` file. Don't update `downloadIndicator()`. Users download old version.

**Correct:** Edit `.pine` → verify in TradingView → copy full content → update string in `index.html`.

## Quick Reference

| Pine Script file | Download function in index.html | Output filename |
|---|---|---|
| `order_flow_elite.pine` | `downloadIndicator()` (~line 3700) | `Order_Flow_Volume_Suite_ELITE_v6.pine` |
| `order_flow_overlay.pine` | `downloadOverlayIndicator()` (~line 3960) | `Order_Flow_Overlay_Suite_v6.pine` |

## Implementation

### For order_flow_elite.pine changes

1. Edit `order_flow_elite.pine`
2. Verify the change compiles (check Pine Script v6 syntax)
3. Confirm `barstate.isconfirmed` is used on all entry/exit signals
4. Confirm `request.security()` uses tuple form (single call, not two separate calls)
5. Find `downloadIndicator()` in `index.html`:
   ```bash
   grep -n "function downloadIndicator" index.html
   ```
6. Replace the template literal content (everything between the backticks after `const pine = \``) with the full content of `order_flow_elite.pine`
7. Run indicator parity check: `node tests/indicators.test.js`

### For order_flow_overlay.pine changes

1. Edit `order_flow_overlay.pine`
2. Verify `overlay=true` is declared
3. Confirm all `request.security()` calls use lookahead only where safe (PDH/PDL uses `lookahead_on`, ATR uses `lookahead_off`)
4. Find `downloadOverlayIndicator()` in `index.html`:
   ```bash
   grep -n "function downloadOverlayIndicator" index.html
   ```
5. Replace the template literal content with the full content of `order_flow_overlay.pine`

### Pine Script v6 syntax rules (enforce these)

```pine
// Correct: tuple security call (one request)
[htfVol, htfMA] = request.security(syminfo.tickerid, htf, [volume, ta.sma(volume, 20)])

// Wrong: two separate security calls
htfVol = request.security(...)
htfMA  = request.security(...)   // wastes a call, risks sync issues

// Correct: non-repainting divergence
var float prevPivotLow = na
if hasPivotLow
    prevPivotLow := low

// Wrong: index-offset divergence (repaints)
bullDiv = low < low[10] and delta > delta[5]
```

## Common Mistakes

- Leaving the embedded string unchanged after editing the `.pine` file
- Using `barstate.islast` instead of `barstate.isconfirmed` for signals
- Adding a `request.security()` call without checking if it can be combined with an existing tuple call
- Breaking the template literal by including a backtick character in Pine Script comments (escape with `\``)
- Forgetting to update CLAUDE.md line counts for the `.pine` files after large additions
