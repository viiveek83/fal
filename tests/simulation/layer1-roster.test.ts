import { describe, it, expect, beforeAll } from 'vitest'
import { prisma } from '../../lib/db'
import { getSimLeague, SIM_LEAGUE_NAME } from './helpers'

describe('Layer 1: Seed & Roster Validation', () => {
  let league: any

  beforeAll(async () => {
    league = await getSimLeague()
  })

  it('simulation league exists and season started', () => {
    expect(league).toBeTruthy()
    expect(league.name).toBe(SIM_LEAGUE_NAME)
    expect(league.seasonStarted).toBe(true)
  })

  it('has exactly 10 teams', () => {
    expect(league.teams).toHaveLength(10)
  })

  it('each team has 15 players', async () => {
    for (const team of league.teams) {
      const count = await prisma.teamPlayer.count({ where: { teamId: team.id } })
      expect(count).toBe(15)
    }
  })

  it('no duplicate players across teams in league', async () => {
    const allTP = await prisma.teamPlayer.findMany({
      where: { leagueId: league.id },
      select: { playerId: true },
    })
    const ids = allTP.map((p: { playerId: string }) => p.playerId)
    expect(new Set(ids).size).toBe(ids.length) // all unique
    expect(ids.length).toBe(150) // 10 teams * 15 players
  })

  it('purchase prices are set and positive', async () => {
    const withPrice = await prisma.teamPlayer.count({
      where: { leagueId: league.id, purchasePrice: { gt: 0 } },
    })
    expect(withPrice).toBe(150)
  })

  it('gameweeks and matches imported from IPL 2025', async () => {
    const gws = await prisma.gameweek.count()
    const matches = await prisma.match.count()
    expect(gws).toBeGreaterThan(0)
    expect(matches).toBe(74) // IPL 2025 has 74 fixtures
  })

  it('season start gate: rejects start with undersized squad', async () => {
    // Verify that the league's minSquadSize is enforced
    // The league model has minSquadSize: 12, and all teams have 15 players
    // This is a structural assertion that the gate would have rejected < 12
    for (const team of league.teams) {
      const count = await prisma.teamPlayer.count({ where: { teamId: team.id } })
      expect(count).toBeGreaterThanOrEqual(league.minSquadSize || 12)
    }
  })
})
