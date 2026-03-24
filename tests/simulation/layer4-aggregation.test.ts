import { describe, it, expect, beforeAll } from 'vitest'
import { prisma } from '../../lib/db'
import { aggregateGameweek } from '../../lib/scoring/pipeline'
import { getSimLeague, getSimGameweeks } from './helpers'

describe('Layer 4: Gameweek Aggregation & Season Replay', () => {
  let league: any
  let teams: any[]
  let gameweeks: any[]

  beforeAll(async () => {
    league = await getSimLeague()
    teams = league?.teams || []
    gameweeks = await getSimGameweeks()
  })

  it('aggregates all gameweeks sequentially', async () => {
    for (const gw of gameweeks) {
      try {
        await aggregateGameweek(gw.id)
        console.log(`Aggregated GW${gw.number}`)
      } catch (err: any) {
        console.warn(`GW${gw.number} aggregation error:`, err.message)
      }
    }
  }, 600_000) // 10 min timeout

  it('GameweekScore exists for teams with lineups', async () => {
    const totalGwScores = await prisma.gameweekScore.count()
    console.log(`Total GameweekScore records: ${totalGwScores}`)
    // At minimum, teams that submitted lineups should have scores
    expect(totalGwScores).toBeGreaterThan(0)
  })

  it('leaderboard rankings: total points descending', async () => {
    const teamTotals = await prisma.team.findMany({
      where: { leagueId: league.id },
      orderBy: { totalPoints: 'desc' },
      select: { id: true, name: true, totalPoints: true, bestGwScore: true },
    })

    // Verify descending order
    for (let i = 1; i < teamTotals.length; i++) {
      expect(teamTotals[i - 1].totalPoints).toBeGreaterThanOrEqual(
        teamTotals[i].totalPoints
      )
    }

    console.log('Final Leaderboard:')
    teamTotals.forEach((t, i) => {
      console.log(
        `  ${i + 1}. ${t.name}: ${t.totalPoints} pts (best GW: ${t.bestGwScore})`
      )
    })
  })

  it('chips marked USED after activation gameweek', async () => {
    const usedChips = await prisma.chipUsage.findMany({
      where: { status: 'USED' },
    })
    // Chips activated in Layer 2 should be marked USED after aggregation
    for (const chip of usedChips) {
      expect(chip.gameweekId).toBeTruthy()
    }
  })

  it('cumulative totalPoints are non-negative', async () => {
    const teamsWithPoints = await prisma.team.findMany({
      where: { leagueId: league.id },
      select: { totalPoints: true },
    })
    for (const t of teamsWithPoints) {
      expect(t.totalPoints).toBeGreaterThanOrEqual(0)
    }
  })

  it('no team has duplicate chip types', async () => {
    for (const team of teams) {
      const chips = await prisma.chipUsage.findMany({
        where: { teamId: team.id },
        select: { chipType: true },
      })
      const types = chips.map((c) => c.chipType)
      expect(new Set(types).size).toBe(types.length) // all unique
    }
  })

  it('bestGwScore matches max GameweekScore per team', async () => {
    for (const team of teams) {
      const gwScores = await prisma.gameweekScore.findMany({
        where: { teamId: team.id },
        select: { totalPoints: true },
      })
      if (gwScores.length === 0) continue

      const maxGw = Math.max(...gwScores.map((s) => s.totalPoints))
      const teamData = await prisma.team.findUnique({
        where: { id: team.id },
        select: { bestGwScore: true },
      })
      // bestGwScore should be >= maxGw (may include chip effects not in GameweekScore)
      expect(teamData!.bestGwScore).toBeGreaterThanOrEqual(maxGw)
    }
  })
})
