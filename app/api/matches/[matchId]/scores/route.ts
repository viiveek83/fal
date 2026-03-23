import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

// GET /api/matches/[matchId]/scores — Per-player fantasy breakdown for a match
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ matchId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { matchId } = await params

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: {
        id: true,
        localTeamName: true,
        visitorTeamName: true,
        startingAt: true,
        note: true,
        scoringStatus: true,
      },
    })
    if (!match) {
      return Response.json({ error: 'Match not found' }, { status: 404 })
    }

    const performances = await prisma.playerPerformance.findMany({
      where: { matchId },
      include: {
        player: {
          select: {
            id: true,
            fullname: true,
            role: true,
            iplTeamCode: true,
            iplTeamName: true,
          },
        },
      },
      orderBy: { fantasyPoints: 'desc' },
    })

    return Response.json({ match, performances })
  } catch (error) {
    console.error('GET /api/matches/[matchId]/scores error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
