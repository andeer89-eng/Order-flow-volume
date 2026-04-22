# Deltalytix Integration — Server-Side Files

Drop these files into your Deltalytix Next.js project to receive trades and
serve performance stats back to the Order Flow Volume Suite ELITE dashboard.

## Setup

### 1. Add the Prisma schema fragment

Append the contents of `prisma/schema-addition.prisma` to your existing
`prisma/schema.prisma`, then run:

```bash
npx prisma migrate dev --name add_elite_integration
```

### 2. Copy the API routes

```
app/api/trades/import-from-elite/route.ts  →  your Deltalytix project
app/api/stats/summary/route.ts             →  your Deltalytix project
```

### 3. Add CORS headers (next.config.js / next.config.ts)

```js
async headers() {
  return [
    {
      source: '/api/:path*',
      headers: [
        { key: 'Access-Control-Allow-Origin',  value: '*' },
        { key: 'Access-Control-Allow-Methods', value: 'GET,POST,OPTIONS' },
        { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
      ],
    },
  ]
}
```

### 4. Configure ELITE

In the ELITE dashboard → Settings tab:
- **Deltalytix URL**: `https://your-deltalytix-instance.vercel.app`
- **Personal API Key**: generate in Deltalytix → Settings → API Keys

## Data Flow

```
ELITE (browser)
  ├── trade closes → POST /api/trades/import-from-elite
  │     payload: { symbol, side, entryPrice, exitPrice, pnlPct, tags[], notes, source }
  │
  └── settings opened → GET /api/stats/summary?days=30&source=order-flow-elite
        response: { winRate, avgPnlPct, tradeCount }
```

## Security

- All routes validate the `Authorization: Bearer <key>` header against the
  `PersonalApiKey` table (hashed with bcrypt).
- Keys are scoped per user — one key cannot access another user's data.
- Endpoint only accepts `https://` origins in ELITE.
