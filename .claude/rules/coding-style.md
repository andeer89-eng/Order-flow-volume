# Coding Style Rules

## File Organization

- Target: 200-400 lines per file (800 max)
- Current `index.html` is a known exception pending modular decomposition
- New functionality should be structured for future extraction

## Functions

- Maximum 50 lines per function where practical
- Maximum 4 levels of nesting
- Use descriptive verb-noun names: `fetchBinanceData()`, `calcRSI()`, `renderChart()`
- Single-letter variable names only for loop counters (`i`, `j`, `n`)

## Variables

- Prefer `const` over `let`; never use `var`
- Use descriptive names: `bucketTime` not `bt`, `takerBuyVol` not `tbv`
- Named constants for magic numbers: `const MAX_BARS = 300` not inline `300`

## Error Handling

- Never use silent `catch(_) {}` blocks
- Always log errors via `logAlert()` with descriptive messages
- Filter `AbortError` from fetch error logging
- Include context in error messages: which function, which data source

## State Management

- All mutable state lives in the `S` object
- Prefer incremental updates over full recalculation
- Cap arrays at documented limits (bars: 300, htfVols: 60)

## Comments

- No emojis in code or comments
- Comment the "why", not the "what"
- Document non-obvious algorithms (Wilder's smoothing, monotonic deque)
- Keep comments concise and current
