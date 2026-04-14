import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

// ── Resolve API key → user ────────────────────────────────────────────────────
async function resolveUser(req: NextRequest) {
  const auth = req.headers.get('Authorization') || ''
  const raw  = auth.replace(/^Bearer\s+/i, '').trim()
  if (!raw) return null

  // Keys are stored hashed — check each key for the user (limit search by prefix if you add one)
  const keys = await prisma.personalApiKey.findMany({ include: { user: true } })
  for (const k of keys) {
    if (await bcrypt.compare(raw, k.keyHash)) {
      // Update lastUsed without blocking response
      prisma.personalApiKey.update({ where: { id: k.id }, data: { lastUsed: new Date() } }).catch(() => {})
      return k.user
    }
  }
  return null
}

// ── POST /api/trades/import-from-elite ───────────────────────────────────────
export async function POST(req: NextRequest) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204 })
  }

  const user = await resolveUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized — invalid or missing API key' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Validate required fields
  const { symbol, side, entryPrice, exitPrice, entryTime, pnlPct } = body
  if (!symbol || !side || entryPrice == null || exitPrice == null || !entryTime || pnlPct == null) {
    return NextResponse.json({ error: 'Missing required fields: symbol, side, entryPrice, exitPrice, entryTime, pnlPct' }, { status: 422 })
  }
  if (side !== 'long' && side !== 'short') {
    return NextResponse.json({ error: 'side must be "long" or "short"' }, { status: 422 })
  }

  const trade = await prisma.eliteTrade.create({
    data: {
      userId:     user.id,
      symbol:     String(symbol),
      side:       String(side),
      entryPrice: Number(entryPrice),
      exitPrice:  Number(exitPrice),
      entryTime:  new Date(String(entryTime)),
      exitTime:   body.exitTime ? new Date(String(body.exitTime)) : new Date(),
      pnlPct:     Number(pnlPct),
      timeframe:  body.timeframe ? String(body.timeframe) : 'unknown',
      tags:       Array.isArray(body.tags) ? body.tags.map(String) : [],
      notes:      body.notes ? String(body.notes) : null,
      source:     'order-flow-elite',
    },
  })

  return NextResponse.json({ id: trade.id, synced: true }, { status: 201 })
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}
