import { prisma } from '@/lib/db'
import { NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
  const { email, name, inviteCode, adminSecret } = await req.json()
  if (!email) return Response.json({ error: 'Email required' }, { status: 400 })

  // Case 0: Admin secret provided — bootstrap first admin
  if (adminSecret) {
    if (!process.env.ADMIN_SECRET || adminSecret !== process.env.ADMIN_SECRET) {
      return Response.json({ error: 'Invalid admin secret' }, { status: 400 })
    }
    const user = await prisma.user.upsert({
      where: { email },
      update: { name: name || undefined, role: 'ADMIN' },
      create: { email, name: name || email.split('@')[0], role: 'ADMIN' },
    })
    return Response.json(user)
  }

  // Case 1: Invite code provided — validate and upsert user into league
  if (inviteCode) {
    const league = await prisma.league.findUnique({
      where: { inviteCode },
      include: { teams: true },
    })

    if (!league) {
      return Response.json({ error: 'Invalid invite code' }, { status: 400 })
    }

    const user = await prisma.user.upsert({
      where: { email },
      update: { name: name || undefined },
      create: { email, name: name || email.split('@')[0], role: 'USER' },
    })

    // Check if user already has a team in this league — if not, that's fine.
    // Admin will create their team via roster CSV upload.
    // No team creation needed here.

    return Response.json(user)
  }

  // Case 2: No invite code — check if existing user is admin of any league
  const existingUser = await prisma.user.findUnique({
    where: { email },
    include: { leagues: true },
  })

  if (existingUser && (existingUser.role === 'ADMIN' || existingUser.leagues.length > 0)) {
    // Admin of at least one league — allow login without invite code
    const user = await prisma.user.update({
      where: { email },
      data: { name: name || undefined },
    })
    return Response.json(user)
  }

  // Case 3: No invite code + not an admin — reject
  return Response.json({ error: 'Invite code required' }, { status: 400 })
}
