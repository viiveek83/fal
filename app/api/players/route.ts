import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const role = url.searchParams.get('role') // BAT, BOWL, ALL, WK
  const team = url.searchParams.get('team') // MI, CSK, etc.
  const search = url.searchParams.get('search') // name search
  const page = parseInt(url.searchParams.get('page') || '1')
  const limit = parseInt(url.searchParams.get('limit') || '50')

  const where: any = {}
  if (role) where.role = role
  if (team) where.iplTeamCode = team
  if (search) where.fullname = { contains: search, mode: 'insensitive' }

  const [players, total] = await Promise.all([
    prisma.player.findMany({
      where,
      orderBy: { fullname: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.player.count({ where }),
  ])

  // Aggregate season fantasy points per player
  const playerIds = players.map(p => p.id)
  const pointsAgg = await prisma.playerPerformance.groupBy({
    by: ['playerId'],
    where: { playerId: { in: playerIds } },
    _sum: { fantasyPoints: true },
    _count: true,
  })
  const pointsMap = new Map(pointsAgg.map(p => [p.playerId, { points: p._sum.fantasyPoints || 0, matches: p._count }]))

  const enrichedPlayers = players.map(p => ({
    ...p,
    seasonPoints: pointsMap.get(p.id)?.points || 0,
    matchesPlayed: pointsMap.get(p.id)?.matches || 0,
  }))

  return Response.json({ players: enrichedPlayers, total, page, limit })
}
