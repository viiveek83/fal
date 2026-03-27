import { auth } from '@/lib/auth'
import { syncPlayerTeams } from '@/lib/sync-players'
import { NextResponse } from 'next/server'

// GET — dry run (returns changes without applying)
export async function GET() {
  const session = await auth()
  if (!session?.user?.isAppAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const result = await syncPlayerTeams({ apply: false })
    return NextResponse.json(result)
  } catch (error) {
    console.error('Sync players error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    )
  }
}

// POST — apply changes
export async function POST() {
  const session = await auth()
  if (!session?.user?.isAppAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const result = await syncPlayerTeams({ apply: true })
    return NextResponse.json(result)
  } catch (error) {
    console.error('Sync players apply error:', error)
    const message = error instanceof Error ? error.message : 'Internal error'
    const status = message.includes('already in progress') ? 409 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
