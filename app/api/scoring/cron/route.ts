import { NextResponse } from 'next/server'
import { syncMatchStatuses } from '@/lib/sportmonks/match-sync'
import { runScoringPipeline } from '@/lib/scoring/pipeline'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const syncResult = await syncMatchStatuses()
    const result = await runScoringPipeline()
    return NextResponse.json({
      ...result,
      matchesTransitioned: syncResult.transitioned,
    })
  } catch (error) {
    console.error('Scoring cron error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    )
  }
}
