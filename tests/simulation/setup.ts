import { prisma } from '../../lib/db'
import { getSportMonksClient } from '../../lib/sportmonks/client'
import { IPL_TEAMS, mapPositionToRole } from '../../lib/sportmonks/utils'
import { importFixturesAndGameweeks } from '../../lib/sportmonks/fixtures'
import { hash } from 'bcryptjs'
import {
  SIM_ADMIN_EMAIL,
  SIM_PASSWORD,
  SIM_LEAGUE_NAME,
  SIM_INVITE_CODE,
  IPL_2025_SEASON_ID,
  simUserEmail,
} from './helpers'

export async function setupSimulation() {
  const log: string[] = ['Starting simulation setup...']

  // 1. Hash password
  const passwordHash = await hash(SIM_PASSWORD, 10)
  log.push('Password hashed')

  // 2. Seed 2025 players from SportMonks
  const client = getSportMonksClient()
  let totalPlayers = 0

  for (const team of IPL_TEAMS) {
    const squad: any[] = await client.fetch<any[]>(
      `/teams/${team.id}/squad/${IPL_2025_SEASON_ID}`
    )
    const players = (squad as any)?.squad ?? squad ?? []
    log.push(`${team.code}: ${players.length} players`)

    for (const player of players) {
      await prisma.player.upsert({
        where: { apiPlayerId: player.id },
        update: {
          fullname: player.fullname,
          firstname: player.firstname,
          lastname: player.lastname,
          iplTeamId: team.id,
          iplTeamName: team.name,
          iplTeamCode: team.code,
          role: mapPositionToRole(player.position?.name),
          battingStyle: player.battingstyle || null,
          bowlingStyle: player.bowlingstyle || null,
          imageUrl: player.image_path || null,
          dateOfBirth: player.dateofbirth || null,
        },
        create: {
          apiPlayerId: player.id,
          fullname: player.fullname,
          firstname: player.firstname,
          lastname: player.lastname,
          iplTeamId: team.id,
          iplTeamName: team.name,
          iplTeamCode: team.code,
          role: mapPositionToRole(player.position?.name),
          battingStyle: player.battingstyle || null,
          bowlingStyle: player.bowlingstyle || null,
          imageUrl: player.image_path || null,
          dateOfBirth: player.dateofbirth || null,
        },
      })
      totalPlayers++
    }
  }
  log.push(`Seeded ${totalPlayers} players`)

  // 3. Create admin user + simulation league
  const admin = await prisma.user.upsert({
    where: { email: SIM_ADMIN_EMAIL },
    update: { passwordHash, role: 'ADMIN' },
    create: {
      email: SIM_ADMIN_EMAIL,
      name: 'Sim Admin',
      passwordHash,
      role: 'ADMIN',
    },
  })
  log.push(`Admin user: ${admin.email}`)

  const league = await prisma.league.upsert({
    where: { inviteCode: SIM_INVITE_CODE },
    update: { name: SIM_LEAGUE_NAME, adminUserId: admin.id },
    create: {
      name: SIM_LEAGUE_NAME,
      inviteCode: SIM_INVITE_CODE,
      adminUserId: admin.id,
      maxManagers: 15,
      minSquadSize: 12,
      maxSquadSize: 15,
    },
  })
  log.push(`League: ${league.name} (${league.id})`)

  // 4. Create 10 test users, each with a team
  const allPlayers = await prisma.player.findMany({ select: { id: true } })
  const playerPool = [...allPlayers]
  // Shuffle for random assignment
  for (let i = playerPool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[playerPool[i], playerPool[j]] = [playerPool[j], playerPool[i]]
  }

  let poolIndex = 0
  const PLAYERS_PER_TEAM = 15
  const NUM_USERS = 10

  for (let n = 1; n <= NUM_USERS; n++) {
    const email = simUserEmail(n)
    const user = await prisma.user.upsert({
      where: { email },
      update: { passwordHash },
      create: {
        email,
        name: `Sim User ${n}`,
        passwordHash,
      },
    })

    const team = await prisma.team.upsert({
      where: {
        id: (
          await prisma.team.findFirst({
            where: { userId: user.id, leagueId: league.id },
          })
        )?.id ?? '',
      },
      update: {},
      create: {
        name: `Sim Team ${n}`,
        userId: user.id,
        leagueId: league.id,
      },
    })

    // 5. Assign 15 players (no duplicates across teams)
    const teamPlayerIds = playerPool.slice(
      poolIndex,
      poolIndex + PLAYERS_PER_TEAM
    )
    poolIndex += PLAYERS_PER_TEAM

    for (const p of teamPlayerIds) {
      await prisma.teamPlayer.upsert({
        where: {
          leagueId_playerId: { leagueId: league.id, playerId: p.id },
        },
        update: { teamId: team.id },
        create: {
          teamId: team.id,
          playerId: p.id,
          leagueId: league.id,
        },
      })
    }

    log.push(`User ${n}: ${email} -> ${team.name} (${teamPlayerIds.length} players)`)
  }

  // 6. Import fixtures and gameweeks
  const fixtureResult = await importFixturesAndGameweeks(
    prisma,
    IPL_2025_SEASON_ID
  )
  log.push(
    `Imported ${fixtureResult.gameweeks} gameweeks, ${fixtureResult.matches} matches`
  )

  // 7. Mark season as started
  await prisma.league.update({
    where: { id: league.id },
    data: { seasonStarted: true },
  })
  log.push('Season started')

  // Credential printout
  log.push('\n--- Simulation Credentials ---')
  log.push(`Admin: ${SIM_ADMIN_EMAIL} / ${SIM_PASSWORD}`)
  for (let n = 1; n <= NUM_USERS; n++) {
    log.push(`User ${n}: ${simUserEmail(n)} / ${SIM_PASSWORD}`)
  }
  log.push('--- End Credentials ---\n')

  const updatedLeague = await prisma.league.findUnique({
    where: { id: league.id },
    include: { teams: { include: { user: true } } },
  })

  return { league: updatedLeague, log }
}
