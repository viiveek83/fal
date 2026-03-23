import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const matches = await prisma.match.findMany({
      select: {
        id: true,
        apiMatchId: true,
        localTeamName: true,
        visitorTeamName: true,
        startingAt: true,
        scoringStatus: true,
        scoringAttempts: true,
        gameweek: {
          select: { number: true, aggregationStatus: true },
        },
      },
      orderBy: { startingAt: 'desc' },
    })

    return NextResponse.json({ matches })
  } catch (error) {
    console.error('Scoring status error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    )
  }
}
