import { sendGAEvent } from '@next/third-parties/google'

export function trackEvent(action: string, params?: Record<string, string | number>) {
  if (typeof window === 'undefined') return
  try {
    sendGAEvent('event', action, params || {})
  } catch {
    // Silently fail — analytics should never break the app
  }
}

export const GA_EVENTS = {
  // Lineup
  LINEUP_SAVE: 'lineup_save',
  LINEUP_CAPTAIN_CHANGE: 'lineup_captain_change',
  LINEUP_CHIP_ACTIVATE: 'lineup_chip_activate',

  // League
  LEAGUE_CREATE: 'league_create',
  LEAGUE_JOIN: 'league_join',
  LEAGUE_ROSTER_UPLOAD: 'league_roster_upload',

  // Views
  VIEW_DASHBOARD: 'view_dashboard',
  VIEW_LEADERBOARD: 'view_leaderboard',
  VIEW_STANDINGS: 'view_standings',
  VIEW_LINEUP: 'view_lineup',
  VIEW_PLAYERS: 'view_players',
} as const
