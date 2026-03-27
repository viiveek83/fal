import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest'
import { PrismaClient } from '@prisma/client'
import type { SportMonksFixture } from '@/lib/sportmonks/types'

const prisma = new PrismaClient()

// Create a shared mock for sportmonks.fetch - MUST be accessible before mocking
let sportmonksFetchMock: any = vi.fn()

// Mock the sportmonks client module BEFORE importing syncMatchStatuses
vi.mock('@/lib/sportmonks/client', () => {
  return {
    sportmonks: new Proxy(
      {},
      {
        get: (target, prop) => {
          if (prop === 'fetch') return sportmonksFetchMock
          return undefined
        },
      }
    ),
    getSportMonksClient: vi.fn(() => ({
      fetch: sportmonksFetchMock,
    })),
  }
})

// Import after mocking
import { syncMatchStatuses } from '@/lib/sportmonks/match-sync'

const TEST_SUFFIX = '@test.vitest.matchsync.unit'
const adminEmail = `match-sync-admin-unit${TEST_SUFFIX}`

let league: { id: string }
let gameweek: { id: string }
let adminUser: { id: string }

beforeAll(async () => {
  await cleanup()

  adminUser = await prisma.user.create({
    data: { email: adminEmail, name: 'Match Sync Unit Test Admin' },
  })

  league = await prisma.league.create({
    data: {
      name: 'Match Sync Unit Test League',
      inviteCode: 'MATCH-SYNC-UNIT-TEST-VITEST',
      adminUserId: adminUser.id,
    },
  })

  gameweek = await prisma.gameweek.create({
    data: {
      number: 8888,
      lockTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
      status: 'ACTIVE',
      aggregationStatus: 'PENDING',
    },
  })
})

beforeEach(async () => {
  // Create a completely fresh mock for each test
  sportmonksFetchMock = vi.fn()

  // Clean up any leftover SCHEDULED matches from previous tests
  if (gameweek?.id) {
    await prisma.playerPerformance.deleteMany({
      where: { match: { gameweekId: gameweek.id, scoringStatus: 'SCHEDULED' } },
    })
    await prisma.match.deleteMany({
      where: { gameweekId: gameweek.id, scoringStatus: 'SCHEDULED' },
    })
  }
})

afterAll(async () => {
  await cleanup()
  await prisma.$disconnect()
})

async function cleanup() {
  const testEmails = [adminEmail]

  const gw = await prisma.gameweek.findUnique({ where: { number: 8888 } })
  if (gw) {
    await prisma.playerScore.deleteMany({ where: { gameweekId: gw.id } })
    await prisma.gameweekScore.deleteMany({ where: { gameweekId: gw.id } })

    const matches = await prisma.match.findMany({
      where: { gameweekId: gw.id },
      select: { id: true },
    })
    for (const match of matches) {
      await prisma.playerPerformance.deleteMany({ where: { matchId: match.id } })
    }
    await prisma.match.deleteMany({ where: { gameweekId: gw.id } })

    await prisma.gameweek.delete({ where: { id: gw.id } })
  }

  const testUsers = await prisma.user.findMany({
    where: { email: { in: testEmails } },
    select: { id: true },
  })
  const testUserIds = testUsers.map((u) => u.id)

  if (testUserIds.length > 0) {
    const leagues = await prisma.league.findMany({
      where: { adminUserId: { in: testUserIds } },
      select: { id: true },
    })
    const leagueIds = leagues.map((l) => l.id)

    if (leagueIds.length > 0) {
      await prisma.teamPlayer.deleteMany({ where: { leagueId: { in: leagueIds } } })
      await prisma.team.deleteMany({ where: { leagueId: { in: leagueIds } } })
      await prisma.league.deleteMany({ where: { id: { in: leagueIds } } })
    }
  }

  await prisma.user.deleteMany({ where: { email: { in: testEmails } } })
}

describe('Match Status Sync - Unit Tests (AC2 Status Mapping)', () => {
  it('AC2.1: SCHEDULED match with SportMonks status "Finished" transitions to COMPLETED', async () => {
    const match = await prisma.match.create({
      data: {
        apiMatchId: 1001,
        gameweekId: gameweek.id,
        localTeamId: 113,
        visitorTeamId: 116,
        localTeamName: 'Team A',
        visitorTeamName: 'Team B',
        startingAt: new Date('2025-03-22T14:00:00Z'),
        apiStatus: 'NS',
        scoringStatus: 'SCHEDULED',
      },
    })

    const mockFixture: SportMonksFixture = {
      id: 1001,
      league_id: 4652,
      season_id: 23453,
      stage_id: 77083360,
      round: '1',
      localteam_id: 113,
      visitorteam_id: 116,
      starting_at: '2025-03-22T14:00:00Z',
      type: 'T20',
      status: 'Finished',
      note: 'Team A won by 5 wickets',
      winner_team_id: 113,
      toss_won_team_id: 116,
      elected: 'bat',
      man_of_match_id: 5678,
      super_over: false,
      total_overs_played: 20,
    }

    sportmonksFetchMock.mockResolvedValueOnce(mockFixture)

    const result = await syncMatchStatuses()

    expect(result.checked).toBe(1)
    expect(result.transitioned).toBe(1)
    expect(result.changes).toHaveLength(1)
    expect(result.changes[0]).toEqual({
      apiMatchId: 1001,
      oldStatus: 'SCHEDULED',
      newStatus: 'COMPLETED',
      teams: 'Team A vs Team B',
    })

    const updatedMatch = await prisma.match.findUnique({
      where: { id: match.id },
    })
    expect(updatedMatch!.scoringStatus).toBe('COMPLETED')
    expect(updatedMatch!.apiStatus).toBe('Finished')
    expect(updatedMatch!.note).toBe('Team A won by 5 wickets')
    expect(updatedMatch!.winnerTeamId).toBe(113)
  })

  it('AC2.2: SCHEDULED match with SportMonks status "Cancl." transitions to CANCELLED', async () => {
    const match = await prisma.match.create({
      data: {
        apiMatchId: 1002,
        gameweekId: gameweek.id,
        localTeamId: 113,
        visitorTeamId: 116,
        localTeamName: 'Team C',
        visitorTeamName: 'Team D',
        startingAt: new Date('2025-03-23T14:00:00Z'),
        apiStatus: 'NS',
        scoringStatus: 'SCHEDULED',
      },
    })

    const mockFixture: SportMonksFixture = {
      id: 1002,
      league_id: 4652,
      season_id: 23453,
      stage_id: 77083360,
      round: '2',
      localteam_id: 113,
      visitorteam_id: 116,
      starting_at: '2025-03-23T14:00:00Z',
      type: 'T20',
      status: 'Cancl.',
      note: 'Match cancelled due to weather',
      winner_team_id: null,
      toss_won_team_id: null,
      elected: null,
      man_of_match_id: null,
      super_over: false,
      total_overs_played: null,
    }

    sportmonksFetchMock.mockResolvedValueOnce(mockFixture)

    const result = await syncMatchStatuses()

    expect(result.checked).toBe(1)
    expect(result.transitioned).toBe(1)
    expect(result.changes).toHaveLength(1)
    expect(result.changes[0]).toEqual({
      apiMatchId: 1002,
      oldStatus: 'SCHEDULED',
      newStatus: 'CANCELLED',
      teams: 'Team C vs Team D',
    })

    const updatedMatch = await prisma.match.findUnique({
      where: { id: match.id },
    })
    expect(updatedMatch!.scoringStatus).toBe('CANCELLED')
    expect(updatedMatch!.apiStatus).toBe('Cancl.')
    expect(updatedMatch!.note).toBe('Match cancelled due to weather')
  })

  it('AC2.2: SCHEDULED match with SportMonks status "Aban." transitions to CANCELLED', async () => {
    const match = await prisma.match.create({
      data: {
        apiMatchId: 1003,
        gameweekId: gameweek.id,
        localTeamId: 113,
        visitorTeamId: 116,
        localTeamName: 'Team E',
        visitorTeamName: 'Team F',
        startingAt: new Date('2025-03-24T14:00:00Z'),
        apiStatus: 'NS',
        scoringStatus: 'SCHEDULED',
      },
    })

    const mockFixture: SportMonksFixture = {
      id: 1003,
      league_id: 4652,
      season_id: 23453,
      stage_id: 77083360,
      round: '3',
      localteam_id: 113,
      visitorteam_id: 116,
      starting_at: '2025-03-24T14:00:00Z',
      type: 'T20',
      status: 'Aban.',
      note: 'Match abandoned',
      winner_team_id: null,
      toss_won_team_id: null,
      elected: null,
      man_of_match_id: null,
      super_over: false,
      total_overs_played: null,
    }

    sportmonksFetchMock.mockResolvedValueOnce(mockFixture)

    const result = await syncMatchStatuses()

    expect(result.checked).toBe(1)
    expect(result.transitioned).toBe(1)
    expect(result.changes).toHaveLength(1)
    expect(result.changes[0]).toEqual({
      apiMatchId: 1003,
      oldStatus: 'SCHEDULED',
      newStatus: 'CANCELLED',
      teams: 'Team E vs Team F',
    })

    const updatedMatch = await prisma.match.findUnique({
      where: { id: match.id },
    })
    expect(updatedMatch!.scoringStatus).toBe('CANCELLED')
    expect(updatedMatch!.apiStatus).toBe('Aban.')
  })

  it('SCHEDULED match with SportMonks status "NS" remains SCHEDULED (no update)', async () => {
    const match = await prisma.match.create({
      data: {
        apiMatchId: 1004,
        gameweekId: gameweek.id,
        localTeamId: 113,
        visitorTeamId: 116,
        localTeamName: 'Team G',
        visitorTeamName: 'Team H',
        startingAt: new Date('2025-03-25T14:00:00Z'),
        apiStatus: 'NS',
        scoringStatus: 'SCHEDULED',
      },
    })

    const mockFixture: SportMonksFixture = {
      id: 1004,
      league_id: 4652,
      season_id: 23453,
      stage_id: 77083360,
      round: '4',
      localteam_id: 113,
      visitorteam_id: 116,
      starting_at: '2025-03-25T14:00:00Z',
      type: 'T20',
      status: 'NS',
      note: null,
      winner_team_id: null,
      toss_won_team_id: null,
      elected: null,
      man_of_match_id: null,
      super_over: false,
      total_overs_played: null,
    }

    sportmonksFetchMock.mockResolvedValueOnce(mockFixture)

    const result = await syncMatchStatuses()

    expect(result.checked).toBe(1)
    expect(result.transitioned).toBe(0)
    expect(result.changes).toHaveLength(0)

    const updatedMatch = await prisma.match.findUnique({
      where: { id: match.id },
    })
    expect(updatedMatch!.scoringStatus).toBe('SCHEDULED')
    expect(updatedMatch!.apiStatus).toBe('NS')
  })

  it('handles multiple SCHEDULED matches with mixed status transitions', async () => {
    const match1 = await prisma.match.create({
      data: {
        apiMatchId: 1005,
        gameweekId: gameweek.id,
        localTeamId: 113,
        visitorTeamId: 116,
        localTeamName: 'Team I',
        visitorTeamName: 'Team J',
        startingAt: new Date('2025-03-26T14:00:00Z'),
        apiStatus: 'NS',
        scoringStatus: 'SCHEDULED',
      },
    })

    const match2 = await prisma.match.create({
      data: {
        apiMatchId: 1006,
        gameweekId: gameweek.id,
        localTeamId: 113,
        visitorTeamId: 116,
        localTeamName: 'Team K',
        visitorTeamName: 'Team L',
        startingAt: new Date('2025-03-27T14:00:00Z'),
        apiStatus: 'NS',
        scoringStatus: 'SCHEDULED',
      },
    })

    const match3 = await prisma.match.create({
      data: {
        apiMatchId: 1007,
        gameweekId: gameweek.id,
        localTeamId: 113,
        visitorTeamId: 116,
        localTeamName: 'Team M',
        visitorTeamName: 'Team N',
        startingAt: new Date('2025-03-28T14:00:00Z'),
        apiStatus: 'NS',
        scoringStatus: 'SCHEDULED',
      },
    })

    const fixtures: Record<number, SportMonksFixture> = {
      1005: {
        id: 1005,
        league_id: 4652,
        season_id: 23453,
        stage_id: 77083360,
        round: '5',
        localteam_id: 113,
        visitorteam_id: 116,
        starting_at: '2025-03-26T14:00:00Z',
        type: 'T20',
        status: 'Finished',
        note: 'Team I won by 3 runs',
        winner_team_id: 113,
        toss_won_team_id: 116,
        elected: 'bat',
        man_of_match_id: 5678,
        super_over: false,
        total_overs_played: 40,
      },
      1006: {
        id: 1006,
        league_id: 4652,
        season_id: 23453,
        stage_id: 77083360,
        round: '6',
        localteam_id: 113,
        visitorteam_id: 116,
        starting_at: '2025-03-27T14:00:00Z',
        type: 'T20',
        status: 'Cancl.',
        note: 'Match cancelled',
        winner_team_id: null,
        toss_won_team_id: null,
        elected: null,
        man_of_match_id: null,
        super_over: false,
        total_overs_played: null,
      },
      1007: {
        id: 1007,
        league_id: 4652,
        season_id: 23453,
        stage_id: 77083360,
        round: '7',
        localteam_id: 113,
        visitorteam_id: 116,
        starting_at: '2025-03-28T14:00:00Z',
        type: 'T20',
        status: 'InProgress',
        note: null,
        winner_team_id: null,
        toss_won_team_id: null,
        elected: null,
        man_of_match_id: null,
        super_over: false,
        total_overs_played: null,
      },
    }

    // Use implementation function instead of chaining mockResolvedValueOnce
    sportmonksFetchMock.mockImplementation((path: string) => {
      const matchId = parseInt(path.split('/')[2], 10)
      if (fixtures[matchId]) {
        return Promise.resolve(fixtures[matchId])
      }
      return Promise.reject(new Error(`Fixture ${matchId} not found`))
    })

    const result = await syncMatchStatuses()

    expect(result.checked).toBe(3)
    expect(result.transitioned).toBe(2)
    expect(result.changes).toHaveLength(2)

    expect(result.changes[0]).toEqual({
      apiMatchId: 1005,
      oldStatus: 'SCHEDULED',
      newStatus: 'COMPLETED',
      teams: 'Team I vs Team J',
    })

    expect(result.changes[1]).toEqual({
      apiMatchId: 1006,
      oldStatus: 'SCHEDULED',
      newStatus: 'CANCELLED',
      teams: 'Team K vs Team L',
    })

    const updated1 = await prisma.match.findUnique({ where: { id: match1.id } })
    expect(updated1!.scoringStatus).toBe('COMPLETED')

    const updated2 = await prisma.match.findUnique({ where: { id: match2.id } })
    expect(updated2!.scoringStatus).toBe('CANCELLED')

    const updated3 = await prisma.match.findUnique({ where: { id: match3.id } })
    expect(updated3!.scoringStatus).toBe('SCHEDULED')
  })
})
