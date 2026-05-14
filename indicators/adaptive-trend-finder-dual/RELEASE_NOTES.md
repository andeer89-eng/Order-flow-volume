# Adaptive Trend Finder (log) — Dual

Pine Script v6 fork of Julien Eche's Adaptive Trend Finder. Renders short-term and long-term log-regression channels simultaneously in a single indicator, with user-editable candidate period lists.

## What's new vs. the original

| Area | Original | This fork |
|---|---|---|
| Channels visible | One at a time (Short OR Long via toggle) | Both simultaneously, independently toggleable |
| Period candidates | Hardcoded 19-element arrays | CSV string inputs, any count (2–5000 each) |
| `max_bars_back` | 1200 | 5000 (TradingView v6 ceiling) |
| Styling | Single set of color/style inputs | Independent color/style/transparency per channel |
| Tables | One table | Two tables with independent position & size |

## Bug fixes vs. original v1

- **Line transparency preserved on update.** The original passed `colorInput` to `line.set_color()` on update, stripping the configured channel transparency on every realtime tick. Channel lines now retain their configured alpha.
- **Table created once, not per-tick.** The original ran `table.new()` on every barstate.islast tick. Now wrapped in `if na(t)` like the line handles.

## Performance improvements

- `math.log(source)` computed once per bar at script level instead of once per period candidate (was 19×, now 1× across both channel sets).
- 20-branch switch replaced with `array.max` + `array.indexof` pattern.
- All `[]` history reads consolidated into a single top-level loop populating a buffer; `calcDev` operates on the buffer to avoid Pine v6's history-reference-inside-function-loops behavior.
- Channel endpoints, resolved colors, and resolved styles computed once per tick instead of inline at every line operation.
- Five small helpers (`getTablePos`, `getLineStyle`, `getExtend`, `getTextSize`, `tfMultiplier`) replace repeated ternary chains.
- Cleanup of orphan line/table objects when channels are toggled off mid-session.

## How it works

1. On every bar, `math.log(sourceInput)` is computed (cheap, one operation).
2. On the last bar only, a buffer of the most recent `max(periods)` log values is built.
3. For each candidate period in each enabled channel, `calcDev` runs a linear regression on the log buffer and returns standard deviation, Pearson's R, slope, and intercept.
4. The period with the highest Pearson's R in each list is selected, and its channel is drawn.
5. Two tables show the selected period, trend strength, and (on D/W timeframes) annualized return for each channel.

All heavy work is gated to `barstate.islast`, so historical bars cost ~nothing.

## Inputs

**DISPLAY**
- Show Short-Term Channel (default on)
- Show Long-Term Channel (default off)

**PERIOD CANDIDATES**
- Short-Term Periods (CSV) — default: `20,30,…,200` (19 values)
- Long-Term Periods (CSV) — default: `300,350,…,1200` (19 values)
- Accepts any count. Whitespace tolerated. Values outside [2, 5000] silently dropped.

**SHORT-TERM CHANNEL / LONG-TERM CHANNEL** (mirrored inputs)
- Deviation Multiplier
- Channel color + line style + extend mode + fill/line transparency
- Midline color + transparency + width + style

**SHORT-TERM TABLE / LONG-TERM TABLE** (mirrored inputs)
- Show Auto-Selected Period / Trend Strength / Pearson's R / Annualized Return
- Position + Text Size

## Usage notes

- Fewer candidates = faster execution on the last bar. Drop from 19 to 8 candidates if you want a faster narrow scan, or expand to 30+ for dense sampling.
- The buffer is sized to the max value across both enabled channels, so disabling Long-Term skips the long-period overhead automatically.
- On young symbols where requested lookback exceeds available history, those candidates return `na` and are skipped — the channel still draws using the best valid fit.
- For Pearson's R display, the sign convention matches the original (positive R inverted when slope is positive). To change this, edit the `'Pearson\'s R: '` line in `updateTable`.

## File

- `AdaptiveTrendFinder_Dual.pine` — the indicator
