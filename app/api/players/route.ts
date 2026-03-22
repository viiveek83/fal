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

  return Response.json({ players, total, page, limit })
}
