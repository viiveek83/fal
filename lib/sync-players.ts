import { prisma } from '@/lib/db'
import { sportmonks } from './sportmonks/client'
import { IPL_TEAMS, mapPositionToRole } from './sportmonks/utils'

export interface SyncResult {
  teamChanges: { playerName: string; apiPlayerId: number; oldTeam: string; newTeam: string; fantasyTeams: string[] }[]
  newPlayers: { playerName: string; iplTeamCode: string }[]
  roleChanges: { playerName: string; oldRole: string; newRole: string }[]
  applied: boolean
  updatedCount: number
  createdCount: number
}

export async function syncPlayerTeams(options: { apply: boolean; seasonId?: number }): Promise<SyncResult> {
  const seasonId = options.seasonId || 1795

  // Concurrency guard: advisory lock prevents parallel applies
  if (options.apply) {
    const [lockResult] = await prisma.$queryRaw<[{ pg_try_advisory_lock: boolean }]>`SELECT pg_try_advisory_lock(123456)`
    if (!lockResult.pg_try_advisory_lock) {
      throw new Error('Sync already in progress')
    }
  }

  try {
    // 1. Build lookup of existing DB players by apiPlayerId
    const dbPlayers = await prisma.player.findMany({
      select: { id: true, apiPlayerId: true, fullname: true, iplTeamId: true, iplTeamName: true, iplTeamCode: true, role: true },
    })
    const dbLookup = new Map(dbPlayers.map(p => [p.apiPlayerId, p]))

    const teamChanges: SyncResult['teamChanges'] = []
    const newPlayers: SyncResult['newPlayers'] = []
    const roleChanges: SyncResult['roleChanges'] = []
    let updatedCount = 0
    let createdCount = 0

    // 2. Fetch squads from SportMonks for all 10 IPL teams
    for (const team of IPL_TEAMS) {
      let squad: any[]
      try {
        const data = await sportmonks.fetch<{ squad: any[] }>(`/teams/${team.id}/squad/${seasonId}`)
        squad = data?.squad || []
      } catch (err) {
        console.warn(`syncPlayerTeams: failed to fetch squad for ${team.code}:`, err)
        continue
      }

      for (const player of squad) {
        const existing = dbLookup.get(player.id)
        const newRole = mapPositionToRole(player.position?.name)

        if (!existing) {
          // New player not in DB
          newPlayers.push({ playerName: player.fullname, iplTeamCode: team.code })
          if (options.apply) {
            await prisma.player.create({
              data: {
                apiPlayerId: player.id,
                fullname: player.fullname,
                firstname: player.firstname || null,
                lastname: player.lastname || null,
                iplTeamId: team.id,
                iplTeamName: team.name,
                iplTeamCode: team.code,
                role: newRole,
                battingStyle: player.battingstyle || null,
                bowlingStyle: player.bowlingstyle || null,
                imageUrl: player.image_path || null,
                dateOfBirth: player.dateofbirth || null,
              },
            })
            createdCount++
          }
          continue
        }

        // Check team change
        if (existing.iplTeamId !== team.id) {
          // Look up which fantasy teams have this player
          const fantasyTeamPlayers = await prisma.teamPlayer.findMany({
            where: { playerId: existing.id },
            include: { team: { select: { name: true } } },
          })
          const fantasyTeams = fantasyTeamPlayers.map(tp => tp.team.name)

          teamChanges.push({
            playerName: existing.fullname,
            apiPlayerId: player.id,
            oldTeam: existing.iplTeamCode || '??',
            newTeam: team.code,
            fantasyTeams,
          })

          if (options.apply) {
            await prisma.player.update({
              where: { apiPlayerId: player.id },
              data: {
                iplTeamId: team.id,
                iplTeamName: team.name,
                iplTeamCode: team.code,
                fullname: player.fullname,
                firstname: player.firstname || null,
                lastname: player.lastname || null,
                role: newRole,
                battingStyle: player.battingstyle || null,
                bowlingStyle: player.bowlingstyle || null,
                imageUrl: player.image_path || null,
                dateOfBirth: player.dateofbirth || null,
              },
            })
            updatedCount++
          }
        }

        // Check role change
        if (existing.role !== newRole) {
          roleChanges.push({ playerName: existing.fullname, oldRole: existing.role, newRole })
        }
      }
    }

    return { teamChanges, newPlayers, roleChanges, applied: options.apply, updatedCount, createdCount }
  } finally {
    // Release advisory lock
    if (options.apply) {
      await prisma.$queryRaw`SELECT pg_advisory_unlock(123456)`
    }
  }
}
