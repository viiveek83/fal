import type { Session } from 'next-auth'

/** Find the user's active league from a list, falling back to the first league. */
export function resolveActiveLeague<T extends { id: string }>(
  session: Session | null,
  leagues: T[]
): T | undefined {
  if (leagues.length === 0) return undefined
  const activeId = session?.user?.activeLeagueId
  return leagues.find(l => l.id === activeId) || leagues[0]
}
