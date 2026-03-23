import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

// GET /api/teams/[teamId]/scores/[gameweekId] — Per-player breakdown for a team in a GW
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ teamId: string; gameweekId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { teamId, gameweekId } = await params

    // Get team and verify league membership
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { leagueId: true, userId: true },
    })
    if (!team) {
      return Response.json({ error: 'Team not found' }, { status: 404 })
    }

    const league = await prisma.league.findUnique({
      where: { id: team.leagueId },
      select: { adminUserId: true },
    })

    const isAdmin = league?.adminUserId === session.user.id
    const isMember = await prisma.team.findFirst({
      where: { leagueId: team.leagueId, userId: session.user.id },
    })
    if (!isMember && !isAdmin) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    const playerScores = await prisma.playerScore.findMany({
      where: {
        gameweekId,
        player: { teamPlayers: { some: { teamId } } },
      },
      include: {
        player: {
          select: { id: true, fullname: true, role: true, iplTeamCode: true },
        },
      },
      orderBy: { totalPoints: 'desc' },
    })

    // Get matches in this gameweek for per-match detail
    const matches = await prisma.match.findMany({
      where: { gameweekId },
      select: {
        id: true,
        localTeamName: true,
        visitorTeamName: true,
        startingAt: true,
      },
    })
    const matchIds = matches.map((m) => m.id)

    const performances = await prisma.playerPerformance.findMany({
      where: {
        matchId: { in: matchIds },
        player: { teamPlayers: { some: { teamId } } },
      },
      include: {
        player: { select: { id: true, fullname: true, role: true } },
        match: {
          select: { id: true, localTeamName: true, visitorTeamName: true },
        },
      },
      orderBy: { fantasyPoints: 'desc' },
    })

    return Response.json({ playerScores, performances, matches })
  } catch (error) {
    console.error('GET /api/teams/[teamId]/scores/[gameweekId] error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
