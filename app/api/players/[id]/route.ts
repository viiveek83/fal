import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

// GET /api/players/[id] — Player detail with aggregated season stats
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: playerId } = await params

    const player = await prisma.player.findUnique({
      where: { id: playerId },
      include: {
        performances: {
          include: {
            match: {
              select: {
                startingAt: true,
                localTeamName: true,
                visitorTeamName: true,
                gameweek: { select: { number: true } },
              },
            },
          },
          orderBy: { match: { startingAt: 'desc' } },
        },
        teamPlayers: {
          include: {
            team: {
              select: {
                name: true,
                league: { select: { name: true } },
              },
            },
          },
        },
      },
    })

    if (!player) {
      return Response.json({ error: 'Player not found' }, { status: 404 })
    }

    const matchCount = player.performances.length
    const totalPoints = player.performances.reduce(
      (sum, p) => sum + p.fantasyPoints,
      0
    )

    const stats = {
      totalPoints,
      matches: matchCount,
      runs: player.performances.reduce((sum, p) => sum + (p.runs ?? 0), 0),
      wickets: player.performances.reduce(
        (sum, p) => sum + (p.wickets ?? 0),
        0
      ),
      catches: player.performances.reduce((sum, p) => sum + p.catches, 0),
      avgPointsPerMatch: matchCount > 0 ? Math.round(totalPoints / matchCount) : 0,
    }

    return Response.json({
      player: {
        id: player.id,
        fullname: player.fullname,
        firstname: player.firstname,
        lastname: player.lastname,
        role: player.role,
        iplTeamName: player.iplTeamName,
        iplTeamCode: player.iplTeamCode,
        battingStyle: player.battingStyle,
        bowlingStyle: player.bowlingStyle,
        imageUrl: player.imageUrl,
      },
      stats,
      performances: player.performances,
      teams: player.teamPlayers.map((tp) => ({
        teamName: tp.team.name,
        leagueName: tp.team.league.name,
      })),
    })
  } catch (error) {
    console.error('GET /api/players/[id] error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
