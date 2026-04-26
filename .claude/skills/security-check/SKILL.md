---
name: security-check
description: Use when adding DOM rendering of user input or API data, adding new external API endpoints, handling user-provided URLs, or before any commit touching innerHTML, fetch, or localStorage
---

## Overview

This is a single-file vanilla JS app with no framework sanitisation. Every piece of user-supplied or API-supplied data rendered into the DOM must go through `esc()`. Every external endpoint must be in the CSP. No credentials in code.

## When to Use

- Any `innerHTML` assignment
- Adding a new `fetch()` target (new hostname or service)
- Reading from `localStorage` and rendering that value
- Accepting user input (text fields, search, ticker entry)
- Adding API keys, tokens, or endpoint URLs to the codebase

## Core Pattern

**Broken:**
```javascript
el.innerHTML = `<span>${ticker.name}</span>`;         // XSS if name contains <script>
el.innerHTML = `<div>${apiResponse.message}</div>`;   // XSS from external data
```

**Correct:**
```javascript
el.innerHTML = `<span>${esc(ticker.name)}</span>`;
el.innerHTML = `<div>${esc(apiResponse.message)}</div>`;
```

## Quick Reference

| Risk | Rule |
|---|---|
| `innerHTML` with any variable | Wrap variable in `esc()` |
| New external hostname | Add to CSP `connect-src` in `<head>` |
| API key / token | Store in `localStorage` via Settings tab — never hardcode |
| User URL input (AI endpoint, Deltalytix) | Validate starts with `https://` before `fetch()` |
| `localStorage` values rendered to DOM | Always `esc()` before `innerHTML` |
| Error messages | Must not include stack traces or internal paths |

## Implementation

### XSS Prevention

```javascript
// esc() is defined at line ~1064 in index.html
// It escapes: & < > " '
const esc = s => String(s)
  .replace(/&/g,'&amp;').replace(/</g,'&lt;')
  .replace(/>/g,'&gt;').replace(/"/g,'&quot;')
  .replace(/'/g,'&#39;');

// ALWAYS use for any dynamic content in innerHTML:
document.getElementById('tickerName').innerHTML = esc(ticker.sym);
document.getElementById('errMsg').innerHTML = esc(e.message);

// Exception: static HTML strings with no interpolation are fine:
el.innerHTML = '<span class="bull">LONG</span>';
```

### CSP update procedure

When adding a new external service, update the `Content-Security-Policy` meta tag in `index.html` `<head>`:

```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'none';
  script-src 'unsafe-inline';
  style-src 'unsafe-inline' https://fonts.googleapis.com;
  font-src https://fonts.gstatic.com;
  img-src 'self' data:;
  connect-src
    wss://stream.binance.com:9443
    https://api.binance.com
    https://api.binance.us
    https://query1.finance.yahoo.com
    https://corsproxy.io
    https://api.allorigins.win
    https://your-new-service.com;   ← add here
">
```

Also update the CI check in `.github/workflows/ci.yml` if you add new CSP entries.

### URL validation before fetch

```javascript
// For any user-provided URL (AI endpoint, Deltalytix, future integrations):
function isSafeEndpoint(url) {
  return typeof url === 'string' && url.startsWith('https://');
}

// Usage:
if (!isSafeEndpoint(S.dlxEndpoint)) {
  logAlert('info', 'Endpoint must use HTTPS'); return;
}
```

### localStorage secrets policy

- ✅ Store endpoint URLs: `localStorage.setItem('of_dlx_endpoint', url)`
- ✅ Store API keys: `localStorage.setItem('of_dlx_key', key)` — scoped to origin, not transmitted
- ❌ Never store passwords, OAuth tokens, or full credentials
- ❌ Never log localStorage values to the alert panel or console

## Checklist before every commit

Run this grep to catch missed `esc()` calls:

```bash
# Find innerHTML assignments that contain template literals without esc()
grep -n 'innerHTML.*\${[^}]*}' index.html | grep -v 'esc(' | grep -v '//.*innerHTML'
```

Any match is a potential XSS vulnerability — review each one.

## Common Mistakes

- `el.textContent = value` is safe (no esc needed) — `el.innerHTML = value` is NOT
- Ticker symbols from Binance/Yahoo appear safe but should still be escaped — API responses can be spoofed
- Using `eval()` or `new Function()` anywhere in the codebase — both are prohibited
- Adding a new CORS proxy URL inline rather than as a named constant, making CSP updates easy to miss
