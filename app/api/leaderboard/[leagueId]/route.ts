import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

// GET /api/leaderboard/[leagueId] — League standings
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ leagueId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { leagueId } = await params

    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      select: { adminUserId: true },
    })
    if (!league) {
      return Response.json({ error: 'League not found' }, { status: 404 })
    }

    const isAdmin = league.adminUserId === session.user.id
    const isMember = await prisma.team.findFirst({
      where: { leagueId, userId: session.user.id },
    })
    if (!isMember && !isAdmin) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get all teams with their latest GW score
    const teams = await prisma.team.findMany({
      where: { leagueId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        gameweekScores: {
          orderBy: { gameweek: { number: 'desc' } },
          take: 1,
          include: { gameweek: { select: { number: true } } },
        },
      },
      orderBy: [{ totalPoints: 'desc' }, { bestGwScore: 'desc' }],
    })

    const standings = teams.map((team, index) => {
      const latestGw = team.gameweekScores[0]
      return {
        rank: index + 1,
        teamId: team.id,
        teamName: team.name,
        manager: team.user.name || team.user.email,
        managerId: team.user.id,
        totalPoints: team.totalPoints,
        bestGwScore: team.bestGwScore,
        lastGwPoints: latestGw?.totalPoints ?? 0,
        lastGwNumber: latestGw?.gameweek.number ?? null,
        chipUsed: latestGw?.chipUsed ?? null,
      }
    })

    return Response.json({ standings, leagueId })
  } catch (error) {
    console.error('GET /api/leaderboard/[leagueId] error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
