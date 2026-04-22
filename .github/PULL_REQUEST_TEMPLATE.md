## Summary

<!-- What changed and why? 1–3 bullet points. -->

-
-

## Change Type

- [ ] Bug fix — indicator logic, data fetch, rendering
- [ ] New feature — dashboard UI, Pine Script capability
- [ ] Performance — render speed, API efficiency
- [ ] Security — CSP, XSS, input handling, CORS
- [ ] Refactor — code quality, no behaviour change
- [ ] Documentation — CLAUDE.md, README, comments

## Testing Checklist

**Dashboard (index.html)**
- [ ] Opened `index.html` in browser with no console errors
- [ ] Tested on a **crypto ticker** (Binance WebSocket connects — green dot)
- [ ] Tested on a **stock/ETF ticker** (Yahoo Finance loads via CORS proxy)
- [ ] Tested the changed feature on 1m, 15m, and 1d timeframes
- [ ] Clicked `⬇ PINE SCRIPT` — file downloads correctly

**Pine Script (if changed)**
- [ ] Pasted into TradingView Pine Editor — compiles with no errors
- [ ] `barstate.isconfirmed` used for all entry/exit signals (no repaint)
- [ ] Updated the matching string inside `downloadIndicator()` in index.html

**Security**
- [ ] No API keys, tokens, or secrets hardcoded
- [ ] Dynamic DOM content uses `esc()` helper
- [ ] No new external origins added to CSP without updating the meta tag

## Screenshots

<!-- If the UI changed, attach before/after screenshots. -->
