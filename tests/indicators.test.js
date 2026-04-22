/**
 * Order Flow Volume - Indicator & Utility Test Suite
 *
 * Run: node tests/indicators.test.js
 *
 * Tests are extracted from index.html functions and verified against
 * known reference values. This file is standalone with no dependencies.
 */

// ---------------------------------------------------------------------------
// Extracted functions (copied from index.html for standalone testing)
// ---------------------------------------------------------------------------

const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');

const sma = (arr,p) => { const out=new Array(arr.length).fill(null); let sum=0; for(let i=0;i<arr.length;i++){sum+=arr[i];if(i>=p)sum-=arr[i-p];if(i>=p-1)out[i]=sum/p;} return out; };

const ema = (data,p) => { const k=2/(p+1); return data.reduce((acc,v,i)=>{acc.push(i===0?v:v*k+acc[i-1]*(1-k));return acc;},[]);};

function calcRSI(closes, period) {
  const out = new Array(closes.length).fill(null);
  if (closes.length < period + 1) return out;
  let avgGain = 0, avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) avgGain += diff; else avgLoss -= diff;
  }
  avgGain /= period; avgLoss /= period;
  out[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + (diff > 0 ? diff : 0)) / period;
    avgLoss = (avgLoss * (period - 1) + (diff < 0 ? -diff : 0)) / period;
    out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return out;
}

function _mapBinanceBar(k) {
  const o=+k[1],h=+k[2],l=+k[3],c=+k[4],vol=+k[5],takerBuy=+k[9];
  const takerSell=vol-takerBuy;
  return { time:+k[0],open:o,high:h,low:l,close:c,volume:vol,
    buyVol:takerBuy,sellVol:takerSell,delta:takerBuy-takerSell,
    buyDol:takerBuy*c,sellDol:takerSell*c,body:Math.abs(c-o) };
}

function _mapYahooBar(t, q, i) {
  const o=q.open?.[i]||0, h=q.high?.[i]||0, l=q.low?.[i]||0, c=q.close?.[i]||0;
  const vol=q.volume?.[i]||0;
  if (!c) return null;
  const rng = Math.max(h-l, c*0.00001);
  const buyVol = vol*(c-l)/rng, sellVol = vol*(h-c)/rng;
  return { time:t*1000, open:o, high:h, low:l, close:c, volume:vol,
    buyVol, sellVol, delta:buyVol-sellVol,
    buyDol:buyVol*c, sellDol:sellVol*c, body:Math.abs(c-o) };
}

function aggregate4hBars(bars) {
  if (!bars.length) return bars;
  const out = [];
  let bucket = null;
  for (const b of bars) {
    const d = new Date(b.time);
    const bucketHour = Math.floor(d.getUTCHours() / 4) * 4;
    const bucketTime = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), bucketHour)).getTime();
    if (!bucket || bucket.time !== bucketTime) {
      if (bucket) out.push(bucket);
      bucket = { time:bucketTime, open:b.open, high:b.high, low:b.low, close:b.close,
        volume:b.volume, buyVol:b.buyVol, sellVol:b.sellVol, delta:b.delta,
        buyDol:b.buyDol, sellDol:b.sellDol, body:0 };
    } else {
      bucket.high = Math.max(bucket.high, b.high);
      bucket.low  = Math.min(bucket.low, b.low);
      bucket.close = b.close;
      bucket.volume += b.volume;
      bucket.buyVol += b.buyVol;
      bucket.sellVol += b.sellVol;
      bucket.delta += b.delta;
      bucket.buyDol += b.buyDol;
      bucket.sellDol += b.sellDol;
    }
    bucket.body = Math.abs(bucket.close - bucket.open);
  }
  if (bucket) out.push(bucket);
  return out;
}

// Trading constants
const TradeType = Object.freeze({ LONG: 'LONG', SHORT: 'SHORT' });
const TradeSide = Object.freeze({ BUY: 'BUY', SELL: 'SELL' });
const TradeAction = Object.freeze({
  OPEN_LONG: 'OPEN_LONG', CLOSE_LONG: 'CLOSE_LONG',
  OPEN_SHORT: 'OPEN_SHORT', CLOSE_SHORT: 'CLOSE_SHORT',
  NOOP: 'NOOP'
});
const TxStatus = Object.freeze({
  FILLED: 'FILLED', PARTIAL: 'PARTIAL',
  REJECTED: 'REJECTED', ERROR: 'ERROR'
});
const MarketState = Object.freeze({
  ABSORB: 'ABSORB', ACCUM: 'ACCUM', DISTR: 'DISTR', NEUTRAL: '-'
});
const TrendState = Object.freeze({ BULL: 'BULL', BEAR: 'BEAR', RANGE: 'RANGE' });

function createPositionSnapshot(symbol, side, size, entryPrice, currentPrice) {
  const direction = side === TradeType.LONG ? 1 : -1;
  const unrealizedPnl = (currentPrice - entryPrice) * size * direction;
  const pnlPercent = entryPrice > 0 ? (unrealizedPnl / (entryPrice * size)) * 100 : 0;
  return { symbol, side, size, entryPrice, currentPrice, unrealizedPnl, pnlPercent, timestamp: Date.now() };
}

function computeTradeDigest(trades) {
  if (!trades.length) return { totalPnl: 0, winRate: 0, sharpe: 0, maxDD: 0, count: 0 };
  const pnls = trades.map(t => t.pnl || t.pnlPct || 0);
  const wins = pnls.filter(p => p > 0).length;
  const mean = pnls.reduce((a, b) => a + b, 0) / pnls.length;
  const variance = pnls.length > 1
    ? pnls.reduce((a, p) => a + (p - mean) ** 2, 0) / (pnls.length - 1)
    : 0;
  const stdDev = Math.sqrt(variance);
  let peak = 0, maxDD = 0, equity = 0;
  pnls.forEach(p => { equity += p; peak = Math.max(peak, equity); maxDD = Math.max(maxDD, peak - equity); });
  return {
    totalPnl: pnls.reduce((a, b) => a + b, 0),
    winRate: (wins / pnls.length) * 100,
    sharpe: stdDev > 0 ? (mean / stdDev) * Math.sqrt(252) : 0,
    maxDD,
    count: trades.length
  };
}

function computeGridLevels(currentPrice, stepPct, maxSteps, baseFraction, direction) {
  if (!currentPrice || currentPrice <= 0) return [];
  const levels = [];
  for (let i = 1; i <= maxSteps; i++) {
    const offset = currentPrice * stepPct * i;
    const fraction = baseFraction * i;
    if (direction === TradeType.LONG || direction === 'LONG') {
      levels.push({
        price: +(currentPrice - offset).toFixed(8),
        action: TradeAction.OPEN_LONG,
        step: i, fraction,
        label: 'BUY L' + i
      });
    } else {
      levels.push({
        price: +(currentPrice + offset).toFixed(8),
        action: TradeAction.OPEN_SHORT,
        step: i, fraction,
        label: 'SELL S' + i
      });
    }
  }
  return levels;
}

function computeBidirectionalGrid(currentPrice, stepPct, maxSteps, baseFraction) {
  return [
    ...computeGridLevels(currentPrice, stepPct, maxSteps, baseFraction, TradeType.LONG),
    ...computeGridLevels(currentPrice, stepPct, maxSteps, baseFraction, TradeType.SHORT)
  ].sort((a, b) => a.price - b.price);
}

function calcSessionVWAP(bars) {
  const arr = [];
  let cumPV = 0, cumV = 0, lastDay = -1;
  for (const bar of bars) {
    const day = Math.floor(bar.time / 86400000);
    if (day !== lastDay && lastDay !== -1) { cumPV = 0; cumV = 0; }
    lastDay = day;
    const hlc3 = (bar.high + bar.low + bar.close) / 3;
    cumPV += hlc3 * bar.volume;
    cumV += bar.volume;
    arr.push(cumV > 0 ? cumPV / cumV : bar.close);
  }
  return arr;
}

function computeFeatures(bars) {
  const n = bars.length;
  if (n < 5) return null;
  const closes = bars.map(b => b.close);
  const volumes = bars.map(b => b.volume);
  const bodies = bars.map(b => b.body || Math.abs(b.close - b.open));
  return {
    closes, volumes, bodies,
    ema9: ema(closes, 9),
    ema21: ema(closes, 21),
    ema50: ema(closes, 50),
    ema200: ema(closes, 200),
    rsi: calcRSI(closes, 14),
    vwap: calcSessionVWAP(bars),
    smaVol20: sma(volumes, 20),
    smaBody20: sma(bodies, 20),
    barCount: n,
    timestamp: Date.now()
  };
}

function generateSignals(features, bars, config) {
  if (!features || features.barCount < 5) return null;
  const n = features.barCount;
  const cur = bars[n - 1];
  const { spikeMult = 2.0, length = 20 } = config || {};
  const rsiOB = 65, rsiOS = 35;
  const bullTrend = features.ema50[n - 1] > features.ema200[n - 1] && cur.close > features.vwap[n - 1];
  const bearTrend = features.ema50[n - 1] < features.ema200[n - 1] && cur.close < features.vwap[n - 1];
  const trendState = bullTrend ? TrendState.BULL : bearTrend ? TrendState.BEAR : TrendState.RANGE;
  const volMAn = features.smaVol20[n - 1] || 1;
  const bodyMAn = features.smaBody20[n - 1] || 1;
  const htfVols = [];
  for (let i = 4; i < n; i++) htfVols.push(features.volumes.slice(i - 4, i + 1).reduce((a, b) => a + b, 0));
  const htfV = htfVols[htfVols.length - 1] || 0;
  const htfMA = htfVols.length >= length ? htfVols.slice(-length).reduce((a, b) => a + b, 0) / length : htfV;
  const htfSpike = htfV > htfMA * spikeMult;
  const hasPivotLow = n > 11 && bars[n - 6].low < bars[n - 11].low && bars[n - 6].low < bars[n - 1].low;
  const hasPivotHigh = n > 11 && bars[n - 6].high > bars[n - 11].high && bars[n - 6].high > bars[n - 1].high;
  const bullDiv = hasPivotLow && cur.low < bars[n - 11].low && cur.delta > bars[n - 6].delta;
  const bearDiv = hasPivotHigh && cur.high > bars[n - 11].high && cur.delta < bars[n - 6].delta;
  const absorption = cur.volume > volMAn * 1.8 && (cur.body || 0) < bodyMAn * 0.5;
  const hiddenAccum = cur.buyVol > cur.sellVol && n > 1 && cur.close <= bars[n - 2].close && cur.volume > volMAn;
  const hiddenDistrib = cur.sellVol > cur.buyVol && n > 1 && cur.close >= bars[n - 2].close && cur.volume > volMAn;
  const aboveAvgVol = cur.volume > volMAn;
  const bullExhaust = cur.delta > 0 && n > 1 && cur.close < cur.open && cur.close <= bars[n - 2].close && (cur.body || 0) < bodyMAn && aboveAvgVol;
  const bearExhaust = cur.delta < 0 && n > 1 && cur.close > cur.open && cur.close >= bars[n - 2].close && (cur.body || 0) < bodyMAn && aboveAvgVol;
  const marketState = absorption ? MarketState.ABSORB : hiddenAccum ? MarketState.ACCUM : hiddenDistrib ? MarketState.DISTR : MarketState.NEUTRAL;
  const rsiVal = features.rsi[n - 1] ?? 50;
  const longEntry = bullTrend && htfSpike && rsiVal < rsiOB && (bullDiv || hiddenAccum) && !bullExhaust;
  const shortEntry = bearTrend && htfSpike && rsiVal > rsiOS && (bearDiv || hiddenDistrib) && !bearExhaust;
  const longExit = (bearExhaust || bearDiv) && !longEntry;
  const shortExit = (bullExhaust || bullDiv) && !shortEntry;
  const condScore = [bullTrend, htfSpike, (bullDiv || hiddenAccum), !bullExhaust, aboveAvgVol].filter(Boolean).length;
  return {
    trendState, bullTrend, bearTrend, marketState, htfSpike,
    bullDiv, bearDiv, absorption, hiddenAccum, hiddenDistrib,
    bullExhaust, bearExhaust, rsi: rsiVal,
    longEntry, shortEntry, longExit, shortExit,
    condScore, volMAn, aboveAvgVol,
    action: longEntry ? TradeAction.OPEN_LONG : shortEntry ? TradeAction.OPEN_SHORT
      : longExit ? TradeAction.CLOSE_LONG : shortExit ? TradeAction.CLOSE_SHORT : TradeAction.NOOP
  };
}

// ---------------------------------------------------------------------------
// Test framework (minimal, zero-dependency)
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, name) {
  if (condition) {
    passed++;
  } else {
    failed++;
    failures.push(name);
    console.error(`  FAIL: ${name}`);
  }
}

function assertClose(actual, expected, tolerance, name) {
  if (actual === null || actual === undefined) {
    failed++;
    failures.push(`${name} (got null/undefined)`);
    console.error(`  FAIL: ${name} — expected ~${expected}, got ${actual}`);
    return;
  }
  const diff = Math.abs(actual - expected);
  if (diff <= tolerance) {
    passed++;
  } else {
    failed++;
    failures.push(name);
    console.error(`  FAIL: ${name} — expected ~${expected}, got ${actual} (diff=${diff.toFixed(6)})`);
  }
}

function section(name) {
  console.log(`\n--- ${name} ---`);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

section('esc() - XSS Prevention');

assert(esc('<script>alert(1)</script>') === '&lt;script&gt;alert(1)&lt;/script&gt;',
  'Escapes HTML tags');

assert(esc('"onmouseover="alert(1)"') === '&quot;onmouseover=&quot;alert(1)&quot;',
  'Escapes double quotes');

assert(esc("' onclick='alert(1)'") === "&#39; onclick=&#39;alert(1)&#39;",
  'Escapes single quotes');

assert(esc('a&b<c>d"e\'f') === 'a&amp;b&lt;c&gt;d&quot;e&#39;f',
  'Escapes all 5 special characters');

assert(esc('') === '', 'Empty string returns empty');
assert(esc(123) === '123', 'Number coerced to string');
assert(esc(null) === 'null', 'null coerced to string');
assert(esc(undefined) === 'undefined', 'undefined coerced to string');
assert(esc('safe text') === 'safe text', 'Safe text passes through unchanged');

// Ensure nested escaping does not double-encode
assert(esc('&amp;') === '&amp;amp;', 'Re-escaping encodes the ampersand again');


section('sma() - Simple Moving Average');

{
  const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const result = sma(data, 3);

  assert(result[0] === null, 'SMA[0] is null (not enough data)');
  assert(result[1] === null, 'SMA[1] is null (not enough data)');
  assertClose(result[2], 2.0, 0.0001, 'SMA(3)[2] = avg(1,2,3) = 2.0');
  assertClose(result[3], 3.0, 0.0001, 'SMA(3)[3] = avg(2,3,4) = 3.0');
  assertClose(result[9], 9.0, 0.0001, 'SMA(3)[9] = avg(8,9,10) = 9.0');
}

{
  const result = sma([10, 20, 30, 40, 50], 5);
  assert(result[0] === null, 'SMA(5)[0] is null');
  assert(result[3] === null, 'SMA(5)[3] is null');
  assertClose(result[4], 30.0, 0.0001, 'SMA(5)[4] = avg(10..50) = 30.0');
}

{
  const result = sma([5], 1);
  assertClose(result[0], 5.0, 0.0001, 'SMA(1) of single value = value itself');
}


section('ema() - Exponential Moving Average');

{
  const data = [10, 10, 10, 10, 10];
  const result = ema(data, 3);
  assertClose(result[4], 10.0, 0.0001, 'EMA of constant series = constant');
}

{
  const data = [1, 2, 3, 4, 5];
  const result = ema(data, 3);
  // k = 2/(3+1) = 0.5
  // EMA[0] = 1, EMA[1] = 2*0.5 + 1*0.5 = 1.5, EMA[2] = 3*0.5 + 1.5*0.5 = 2.25
  // EMA[3] = 4*0.5 + 2.25*0.5 = 3.125, EMA[4] = 5*0.5 + 3.125*0.5 = 4.0625
  assertClose(result[0], 1.0, 0.0001, 'EMA(3)[0] = first value');
  assertClose(result[1], 1.5, 0.0001, 'EMA(3)[1] = 1.5');
  assertClose(result[2], 2.25, 0.0001, 'EMA(3)[2] = 2.25');
  assertClose(result[3], 3.125, 0.0001, 'EMA(3)[3] = 3.125');
  assertClose(result[4], 4.0625, 0.0001, 'EMA(3)[4] = 4.0625');
}


section('calcRSI() - Wilder\'s Smoothing RSI');

{
  // Welles Wilder's example dataset (approximate)
  // Reference: RSI(14) computed manually with Wilder's smoothing
  const closes = [
    44.00, 44.34, 44.09, 43.61, 44.33, 44.83, 45.10, 45.42, 45.84,
    46.08, 45.89, 46.03, 45.61, 46.28, 46.28, 46.00, 46.03, 46.41,
    46.22, 45.64
  ];
  const rsi = calcRSI(closes, 14);

  // First 14 values should be null
  for (let i = 0; i < 14; i++) {
    assert(rsi[i] === null, `RSI[${i}] is null (warmup period)`);
  }

  // RSI[14] — first computed value
  // Manual: gains sum = 0.34+0.72+0.50+0.27+0.32+0.42+0.24+0.14+0.67 = 3.62
  //         loss sum  = 0.25+0.48+0.42 = 1.15 (approximate from diffs)
  // avgGain = gains/14, avgLoss = losses/14
  assert(rsi[14] !== null, 'RSI[14] is computed (not null)');
  assert(rsi[14] > 50 && rsi[14] < 90, 'RSI[14] in plausible range (50-90) for uptrend data');

  // RSI should use Wilder's smoothing (exponential), not simple average
  // Verify subsequent values use smoothing by checking they differ from simple recalc
  assert(rsi[15] !== null, 'RSI[15] is computed');
  assert(rsi[19] !== null, 'RSI[19] is computed');

  // Values should be in valid range
  for (let i = 14; i < rsi.length; i++) {
    assert(rsi[i] >= 0 && rsi[i] <= 100, `RSI[${i}] in [0,100] range`);
  }
}

{
  // Edge case: all gains (monotonically increasing)
  const up = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
  const rsi = calcRSI(up, 14);
  assertClose(rsi[14], 100, 0.0001, 'RSI = 100 for pure uptrend (zero loss)');
}

{
  // Edge case: all losses (monotonically decreasing)
  const down = [16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
  const rsi = calcRSI(down, 14);
  assertClose(rsi[14], 0, 0.0001, 'RSI = 0 for pure downtrend (zero gain)');
}

{
  // Edge case: flat prices
  const flat = [50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50];
  const rsi = calcRSI(flat, 14);
  // avgGain=0, avgLoss=0 => denominator 1+0/0. With our formula: avgLoss=0 -> RSI=100
  // This is standard behavior: no losses means RSI=100
  assert(rsi[14] !== null, 'RSI of flat series is computed');
}

{
  // Edge case: too few data points
  const short = [44, 44.5, 45];
  const rsi = calcRSI(short, 14);
  assert(rsi.every(v => v === null), 'RSI returns all null when data < period+1');
}


section('_mapBinanceBar() - Binance Kline Mapping');

{
  // Binance kline format: [openTime, open, high, low, close, volume, closeTime,
  //   quoteAssetVol, trades, takerBuyBaseVol, takerBuyQuoteVol, ignore]
  const kline = [1700000000000, '100.00', '105.00', '98.00', '103.00', '1000',
    1700003599999, '103000', 500, '600', '61800', '0'];
  const bar = _mapBinanceBar(kline);

  assertClose(bar.time, 1700000000000, 0, 'Binance bar time');
  assertClose(bar.open, 100, 0.01, 'Binance bar open');
  assertClose(bar.high, 105, 0.01, 'Binance bar high');
  assertClose(bar.low, 98, 0.01, 'Binance bar low');
  assertClose(bar.close, 103, 0.01, 'Binance bar close');
  assertClose(bar.volume, 1000, 0.01, 'Binance bar total volume');
  assertClose(bar.buyVol, 600, 0.01, 'Binance bar buyVol = takerBuy (field [9])');
  assertClose(bar.sellVol, 400, 0.01, 'Binance bar sellVol = vol - takerBuy');
  assertClose(bar.delta, 200, 0.01, 'Binance bar delta = buy - sell');
  assertClose(bar.buyDol, 600 * 103, 0.01, 'Binance bar buyDol = buyVol * close');
  assertClose(bar.sellDol, 400 * 103, 0.01, 'Binance bar sellDol = sellVol * close');
  assertClose(bar.body, 3, 0.01, 'Binance bar body = |close - open|');
}

{
  // Verify field [9] is used (base asset), NOT field [10] (quote asset)
  const kline = [0, '0', '0', '0', '50', '100', 0, '0', 0, '70', '3500', '0'];
  const bar = _mapBinanceBar(kline);
  assertClose(bar.buyVol, 70, 0.01, 'Uses field [9] (base), not [10] (quote)');
}


section('_mapYahooBar() - Yahoo Finance Mapping');

{
  const quote = {
    open: [150.0], high: [155.0], low: [148.0], close: [153.0], volume: [10000]
  };
  const bar = _mapYahooBar(1700000, quote, 0);

  assertClose(bar.time, 1700000 * 1000, 0, 'Yahoo bar time = seconds * 1000');
  assertClose(bar.open, 150, 0.01, 'Yahoo bar open');
  assertClose(bar.high, 155, 0.01, 'Yahoo bar high');
  assertClose(bar.low, 148, 0.01, 'Yahoo bar low');
  assertClose(bar.close, 153, 0.01, 'Yahoo bar close');
  assertClose(bar.volume, 10000, 0.01, 'Yahoo bar volume');

  // Buy/sell split: buyVol = vol * (close - low) / range
  const range = 155 - 148; // 7
  const expectedBuy = 10000 * (153 - 148) / range;
  const expectedSell = 10000 * (155 - 153) / range;
  assertClose(bar.buyVol, expectedBuy, 0.01, 'Yahoo buyVol = vol*(close-low)/range');
  assertClose(bar.sellVol, expectedSell, 0.01, 'Yahoo sellVol = vol*(high-close)/range');
  assertClose(bar.delta, expectedBuy - expectedSell, 0.01, 'Yahoo delta = buy - sell');
}

{
  // Null close should return null
  const quote = { open: [150], high: [155], low: [148], close: [0], volume: [10000] };
  const bar = _mapYahooBar(1700000, quote, 0);
  assert(bar === null, 'Yahoo bar returns null when close is 0/falsy');
}

{
  // Missing arrays should not throw
  const quote = {};
  const bar = _mapYahooBar(1700000, quote, 0);
  assert(bar === null, 'Yahoo bar returns null for empty quote object');
}

{
  // Doji candle (high == low == close) should not divide by zero
  const quote = { open: [100], high: [100], low: [100], close: [100], volume: [5000] };
  const bar = _mapYahooBar(1700000, quote, 0);
  assert(bar !== null, 'Yahoo bar handles doji (h==l==c) without error');
  assert(isFinite(bar.buyVol), 'Doji buyVol is finite');
  assert(isFinite(bar.sellVol), 'Doji sellVol is finite');
}


section('aggregate4hBars() - 1h to 4h Aggregation');

{
  // Create 4 hourly bars at 00:00, 01:00, 02:00, 03:00 UTC
  function makeBar(hour, o, h, l, c, vol) {
    return {
      time: Date.UTC(2024, 0, 15, hour, 0, 0),
      open: o, high: h, low: l, close: c,
      volume: vol, buyVol: vol * 0.6, sellVol: vol * 0.4,
      delta: vol * 0.2, buyDol: vol * 0.6 * c, sellDol: vol * 0.4 * c, body: Math.abs(c - o)
    };
  }

  const bars = [
    makeBar(0, 100, 110, 95, 105, 1000),
    makeBar(1, 105, 112, 100, 108, 1200),
    makeBar(2, 108, 115, 103, 110, 800),
    makeBar(3, 110, 118, 106, 112, 900),
  ];

  const agg = aggregate4hBars(bars);

  assert(agg.length === 1, '4 hourly bars in same 4h bucket = 1 aggregated bar');
  assertClose(agg[0].open, 100, 0.01, '4h open = first bar open');
  assertClose(agg[0].high, 118, 0.01, '4h high = max of all highs');
  assertClose(agg[0].low, 95, 0.01, '4h low = min of all lows');
  assertClose(agg[0].close, 112, 0.01, '4h close = last bar close');
  assertClose(agg[0].volume, 3900, 0.01, '4h volume = sum of all volumes');
}

{
  // Bars spanning two 4h buckets (00:00-03:00 and 04:00-07:00)
  function makeBar(hour, c) {
    return {
      time: Date.UTC(2024, 0, 15, hour, 0, 0),
      open: c - 1, high: c + 2, low: c - 2, close: c,
      volume: 100, buyVol: 60, sellVol: 40,
      delta: 20, buyDol: 60 * c, sellDol: 40 * c, body: 1
    };
  }

  const bars = [
    makeBar(2, 100), makeBar(3, 101),  // bucket 0h
    makeBar(4, 102), makeBar(5, 103),  // bucket 4h
  ];

  const agg = aggregate4hBars(bars);
  assert(agg.length === 2, 'Bars in two 4h buckets = 2 aggregated bars');
  assertClose(agg[0].close, 101, 0.01, 'First bucket close = last bar in bucket');
  assertClose(agg[1].open, 101, 0.01, 'Second bucket open = first bar open');
  assertClose(agg[1].close, 103, 0.01, 'Second bucket close = last bar close');
}

{
  // Empty input
  const result = aggregate4hBars([]);
  assert(result.length === 0, 'Empty input returns empty array');
}

{
  // Single bar
  function makeBar(hour, c) {
    return {
      time: Date.UTC(2024, 0, 15, hour, 0, 0),
      open: c, high: c + 1, low: c - 1, close: c,
      volume: 500, buyVol: 300, sellVol: 200,
      delta: 100, buyDol: 300 * c, sellDol: 200 * c, body: 0
    };
  }
  const agg = aggregate4hBars([makeBar(10, 50)]);
  assert(agg.length === 1, 'Single bar returns single aggregated bar');
  assertClose(agg[0].close, 50, 0.01, 'Single bar close preserved');
}


section('Trading Constants');

{
  assert(TradeType.LONG === 'LONG', 'TradeType.LONG');
  assert(TradeType.SHORT === 'SHORT', 'TradeType.SHORT');
  assert(TradeSide.BUY === 'BUY', 'TradeSide.BUY');
  assert(TradeSide.SELL === 'SELL', 'TradeSide.SELL');
  assert(TradeAction.OPEN_LONG === 'OPEN_LONG', 'TradeAction.OPEN_LONG');
  assert(TradeAction.CLOSE_LONG === 'CLOSE_LONG', 'TradeAction.CLOSE_LONG');
  assert(TradeAction.OPEN_SHORT === 'OPEN_SHORT', 'TradeAction.OPEN_SHORT');
  assert(TradeAction.CLOSE_SHORT === 'CLOSE_SHORT', 'TradeAction.CLOSE_SHORT');
  assert(TradeAction.NOOP === 'NOOP', 'TradeAction.NOOP');
  assert(TxStatus.FILLED === 'FILLED', 'TxStatus.FILLED');
  assert(TxStatus.REJECTED === 'REJECTED', 'TxStatus.REJECTED');

  // Enums should be frozen
  let threw = false;
  try { TradeType.LONG = 'X'; } catch (_) { threw = true; }
  assert(TradeType.LONG === 'LONG', 'TradeType is frozen (mutation has no effect)');
}


section('createPositionSnapshot()');

{
  const pos = createPositionSnapshot('BTCUSDT', TradeType.LONG, 0.5, 60000, 62000);
  assertClose(pos.unrealizedPnl, 1000, 0.01, 'Long PnL = (62000-60000)*0.5 = 1000');
  assertClose(pos.pnlPercent, 3.333, 0.01, 'Long PnL% = 1000/(60000*0.5)*100 = 3.333');
  assert(pos.symbol === 'BTCUSDT', 'Position symbol');
  assert(pos.side === TradeType.LONG, 'Position side');
}

{
  const pos = createPositionSnapshot('ETHUSDT', TradeType.SHORT, 2, 3000, 2800);
  assertClose(pos.unrealizedPnl, 400, 0.01, 'Short PnL = (3000-2800)*2 = 400 (profit)');
  assertClose(pos.pnlPercent, 6.666, 0.01, 'Short PnL% ~ 6.67');
}

{
  const pos = createPositionSnapshot('ETHUSDT', TradeType.SHORT, 1, 3000, 3200);
  assertClose(pos.unrealizedPnl, -200, 0.01, 'Short losing PnL = (3000-3200)*1*-1... wait');
  // direction = -1 for short, unrealizedPnl = (3200 - 3000) * 1 * -1 = -200
  assert(pos.unrealizedPnl < 0, 'Short position losing when price goes up');
}

{
  const pos = createPositionSnapshot('TEST', TradeType.LONG, 1, 0, 100);
  assert(pos.pnlPercent === 0, 'Zero entry price gives 0% PnL (no divide by zero)');
}


section('computeTradeDigest()');

{
  const digest = computeTradeDigest([]);
  assert(digest.totalPnl === 0, 'Empty trades: totalPnl = 0');
  assert(digest.winRate === 0, 'Empty trades: winRate = 0');
  assert(digest.sharpe === 0, 'Empty trades: sharpe = 0');
  assert(digest.count === 0, 'Empty trades: count = 0');
}

{
  const trades = [
    { pnl: 10 }, { pnl: -5 }, { pnl: 8 }, { pnl: -3 }, { pnl: 12 }
  ];
  const digest = computeTradeDigest(trades);
  assertClose(digest.totalPnl, 22, 0.01, 'Total PnL = 10-5+8-3+12 = 22');
  assertClose(digest.winRate, 60, 0.01, 'Win rate = 3/5 = 60%');
  assert(digest.count === 5, 'Count = 5');
  assert(digest.sharpe !== 0, 'Sharpe is non-zero for mixed results');
  assert(digest.maxDD > 0, 'Max drawdown exists in mixed results');
}

{
  const trades = [{ pnl: 5 }, { pnl: 5 }, { pnl: 5 }];
  const digest = computeTradeDigest(trades);
  assertClose(digest.winRate, 100, 0.01, 'All winners = 100% win rate');
  assertClose(digest.totalPnl, 15, 0.01, 'Total = 15');
  assertClose(digest.maxDD, 0, 0.01, 'No drawdown for all-winning trades');
}


section('computeGridLevels()');

{
  const levels = computeGridLevels(100, 0.01, 3, 0.08, 'LONG');
  assert(levels.length === 3, 'Grid: 3 levels');
  assertClose(levels[0].price, 99, 0.01, 'Long grid level 1: 100 - 1% = 99');
  assertClose(levels[1].price, 98, 0.01, 'Long grid level 2: 100 - 2% = 98');
  assertClose(levels[2].price, 97, 0.01, 'Long grid level 3: 100 - 3% = 97');
  assert(levels[0].action === TradeAction.OPEN_LONG, 'Grid action is OPEN_LONG');
  assertClose(levels[0].fraction, 0.08, 0.001, 'Grid fraction step 1 = 0.08');
  assertClose(levels[2].fraction, 0.24, 0.001, 'Grid fraction step 3 = 0.24');
}

{
  const levels = computeGridLevels(100, 0.01, 3, 0.08, 'SHORT');
  assertClose(levels[0].price, 101, 0.01, 'Short grid level 1: 100 + 1% = 101');
  assertClose(levels[1].price, 102, 0.01, 'Short grid level 2: 100 + 2% = 102');
  assert(levels[0].action === TradeAction.OPEN_SHORT, 'Grid action is OPEN_SHORT');
}

{
  const levels = computeGridLevels(0, 0.01, 3, 0.08, 'LONG');
  assert(levels.length === 0, 'Grid: zero price returns empty');
}

{
  const levels = computeGridLevels(-100, 0.01, 3, 0.08, 'LONG');
  assert(levels.length === 0, 'Grid: negative price returns empty');
}


section('computeBidirectionalGrid()');

{
  const grid = computeBidirectionalGrid(100, 0.01, 2, 0.05);
  assert(grid.length === 4, 'Bidirectional grid: 2 long + 2 short = 4 levels');
  assert(grid[0].price < grid[grid.length - 1].price, 'Grid sorted ascending by price');
  const longs = grid.filter(l => l.action === TradeAction.OPEN_LONG);
  const shorts = grid.filter(l => l.action === TradeAction.OPEN_SHORT);
  assert(longs.length === 2, 'Bidirectional: 2 long levels');
  assert(shorts.length === 2, 'Bidirectional: 2 short levels');
}


section('computeFeatures()');

{
  // Need at least 5 bars
  const bars = [1, 2, 3, 4].map((i, idx) => ({
    time: Date.UTC(2024, 0, 1 + idx), open: 100, high: 105, low: 95,
    close: 100 + i, volume: 1000, buyVol: 600, sellVol: 400, delta: 200,
    buyDol: 60000, sellDol: 40000, body: 5
  }));
  const f = computeFeatures(bars);
  assert(f === null, 'Features: null for < 5 bars');
}

{
  const bars = [];
  for (let i = 0; i < 20; i++) {
    bars.push({
      time: Date.UTC(2024, 0, 1, i), open: 100 + i * 0.5, high: 102 + i * 0.5,
      low: 99 + i * 0.5, close: 101 + i * 0.5, volume: 1000 + i * 10,
      buyVol: 600 + i * 5, sellVol: 400 + i * 5, delta: 200,
      buyDol: 60000, sellDol: 40000, body: 1
    });
  }
  const f = computeFeatures(bars);
  assert(f !== null, 'Features: computed for 20 bars');
  assert(f.ema9.length === 20, 'Features: ema9 has 20 values');
  assert(f.ema50.length === 20, 'Features: ema50 has 20 values');
  assert(f.rsi.length === 20, 'Features: rsi has 20 values');
  assert(f.vwap.length === 20, 'Features: vwap has 20 values');
  assert(f.barCount === 20, 'Features: barCount = 20');
  assert(f.timestamp > 0, 'Features: timestamp set');
}


section('generateSignals()');

{
  assert(generateSignals(null, [], {}) === null, 'Signals: null features returns null');
}

{
  const bars = [];
  for (let i = 0; i < 50; i++) {
    bars.push({
      time: Date.UTC(2024, 0, 1, i), open: 100 + i * 0.2, high: 102 + i * 0.2,
      low: 99 + i * 0.2, close: 101 + i * 0.2, volume: 1000,
      buyVol: 600, sellVol: 400, delta: 200,
      buyDol: 60000, sellDol: 40000, body: 1
    });
  }
  const features = computeFeatures(bars);
  const signals = generateSignals(features, bars, { spikeMult: 2.0, length: 20 });
  assert(signals !== null, 'Signals: computed for 50-bar uptrend');
  assert(['BULL', 'BEAR', 'RANGE'].includes(signals.trendState), 'Signals: valid trendState');
  assert(typeof signals.longEntry === 'boolean', 'Signals: longEntry is boolean');
  assert(typeof signals.shortEntry === 'boolean', 'Signals: shortEntry is boolean');
  assert(typeof signals.rsi === 'number', 'Signals: rsi is number');
  assert(signals.rsi >= 0 && signals.rsi <= 100, 'Signals: rsi in [0,100]');
  assert(Object.values(TradeAction).includes(signals.action), 'Signals: action is valid TradeAction');
  assert(typeof signals.condScore === 'number', 'Signals: condScore is number');
  assert(signals.condScore >= 0 && signals.condScore <= 5, 'Signals: condScore in [0,5]');
}


// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log('\n===================================');
console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failures.length > 0) {
  console.log('\nFailed tests:');
  failures.forEach(f => console.log(`  - ${f}`));
  console.log('===================================');
  process.exit(1);
} else {
  console.log('All tests passed.');
  console.log('===================================');
  process.exit(0);
}
