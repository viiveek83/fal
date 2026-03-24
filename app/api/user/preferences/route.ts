import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { NextRequest } from 'next/server'

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { activeLeagueId } = await req.json()
  if (!activeLeagueId || typeof activeLeagueId !== 'string') {
    return Response.json({ error: 'activeLeagueId is required' }, { status: 400 })
  }

  // Validate the league exists
  const league = await prisma.league.findUnique({
    where: { id: activeLeagueId },
    include: { teams: { select: { userId: true } } },
  })

  if (!league) {
    return Response.json({ error: 'League not found' }, { status: 404 })
  }

  // Validate user has access: is admin or has a team in the league
  const userId = session.user.id
  const isAdmin = league.adminUserId === userId
  const hasTeam = league.teams.some(t => t.userId === userId)

  if (!isAdmin && !hasTeam) {
    return Response.json({ error: 'You do not have access to this league' }, { status: 403 })
  }

  // Update user preference
  await prisma.user.update({
    where: { id: userId },
    data: { activeLeagueId },
  })

  return Response.json({ success: true, activeLeagueId })
}
