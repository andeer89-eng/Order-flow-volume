import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

async function resolveUser(req: NextRequest) {
  const auth = req.headers.get('Authorization') || ''
  const raw  = auth.replace(/^Bearer\s+/i, '').trim()
  if (!raw) return null
  const keys = await prisma.personalApiKey.findMany({ include: { user: true } })
  for (const k of keys) {
    if (await bcrypt.compare(raw, k.keyHash)) return k.user
  }
  return null
}

// ── GET /api/stats/summary?days=30&source=order-flow-elite ───────────────────
export async function GET(req: NextRequest) {
  const user = await resolveUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const days   = Math.min(365, Math.max(1, Number(searchParams.get('days') ?? 30)))
  const source = searchParams.get('source') ?? 'order-flow-elite'
  const since  = new Date(Date.now() - days * 86_400_000)

  const trades = await prisma.eliteTrade.findMany({
    where: {
      userId:    user.id,
      source,
      createdAt: { gte: since },
    },
    select: { pnlPct: true },
  })

  const tradeCount = trades.length
  if (tradeCount === 0) {
    return NextResponse.json({ winRate: 0, avgPnlPct: 0, tradeCount: 0 })
  }

  const winners  = trades.filter(t => t.pnlPct > 0).length
  const winRate  = (winners / tradeCount) * 100
  const avgPnlPct = trades.reduce((sum, t) => sum + t.pnlPct, 0) / tradeCount

  return NextResponse.json({
    winRate:    Math.round(winRate * 10) / 10,
    avgPnlPct:  Math.round(avgPnlPct * 100) / 100,
    tradeCount,
    period:     `${days}d`,
  })
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}
