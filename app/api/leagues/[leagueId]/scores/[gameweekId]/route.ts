import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

// GET /api/leagues/[leagueId]/scores/[gameweekId] — GW scores for all teams in a league
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ leagueId: string; gameweekId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { leagueId, gameweekId } = await params

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

    const scores = await prisma.gameweekScore.findMany({
      where: { gameweekId, team: { leagueId } },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            user: { select: { name: true, email: true } },
          },
        },
      },
      orderBy: { totalPoints: 'desc' },
    })

    return Response.json({ scores, gameweekId, leagueId })
  } catch (error) {
    console.error('GET /api/leagues/[leagueId]/scores/[gameweekId] error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
