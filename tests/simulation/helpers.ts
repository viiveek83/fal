import { prisma } from '../../lib/db'

export const SIM_PREFIX = 'sim-'
export const SIM_ADMIN_EMAIL = 'sim-admin@fal-test.com'
export const SIM_PASSWORD = 'sim-test-2025'
export const SIM_LEAGUE_NAME = 'IPL 2025 Simulation'
export const SIM_INVITE_CODE = 'SIM2025TEST'
export const IPL_2025_SEASON_ID = 1689

export function simUserEmail(n: number) {
  return `sim-user-${n}@fal-test.com`
}

export async function getSimLeague() {
  return prisma.league.findFirst({
    where: { name: SIM_LEAGUE_NAME },
    include: { teams: { include: { user: true } } },
  })
}

export async function getSimGameweeks() {
  return prisma.gameweek.findMany({ orderBy: { number: 'asc' } })
}

export interface LineupSlotInput {
  playerId: string
  slotType: 'XI' | 'BENCH'
  benchPriority: number | null
  role: 'CAPTAIN' | 'VC' | null
}

/**
 * Generates a valid lineup from a squad: first 11 as XI, rest as bench.
 * Player at captainIdx = CAPTAIN, vcIdx = VC.
 */
export function generateLineup(
  squad: Array<{ id: string; role: string }>,
  captainIdx = 0,
  vcIdx = 1
): LineupSlotInput[] {
  const slots: LineupSlotInput[] = []
  const xi = squad.slice(0, 11)
  const bench = squad.slice(11, 15)

  xi.forEach((p, i) => {
    slots.push({
      playerId: p.id,
      slotType: 'XI',
      benchPriority: null,
      role: i === captainIdx ? 'CAPTAIN' : i === vcIdx ? 'VC' : null,
    })
  })

  bench.forEach((p, i) => {
    slots.push({
      playerId: p.id,
      slotType: 'BENCH',
      benchPriority: i + 1,
      role: null,
    })
  })

  return slots
}
