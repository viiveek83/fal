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
