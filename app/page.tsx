'use client'

import { useSession } from 'next-auth/react'
import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { AppFrame } from '@/app/components/AppFrame'

/* ─── IPL team colors ─── */
const teamColors: Record<string, string> = {
  MI: '#004BA0', CSK: '#F9CD05', RCB: '#EC1C24', KKR: '#3A225D',
  DC: '#004C93', RR: '#EA1A85', SRH: '#FF822A', GT: '#0EB1A2',
  LSG: '#00AEEF', PBKS: '#ED1B24',
}

/* ─── Types ─── */
interface Team {
  id: string
  name: string
  userId: string
  user: { id: string; name: string | null; email: string | null; image: string | null }
}

interface League {
  id: string
  name: string
  inviteCode: string
  seasonStarted: boolean
  adminUserId: string
  minSquadSize: number
  maxSquadSize: number
  teams: Team[]
  _count: { teams: number }
}

/* ─── Mock data ─── */
const mockStandings = [
  { rank: 1, name: 'Rahul', gw: 102, total: 3240, delta: 'up' as const, deltaVal: 2, isYou: false },
  { rank: 2, name: 'You', gw: 88, total: 3195, delta: 'down' as const, deltaVal: 1, isYou: true },
  { rank: 3, name: 'Priya', gw: 76, total: 3110, delta: 'same' as const, deltaVal: 0, isYou: false },
  { rank: 4, name: 'Shaheel', gw: 95, total: 2980, delta: 'up' as const, deltaVal: 1, isYou: false },
  { rank: 5, name: 'Arjun', gw: 64, total: 2870, delta: 'down' as const, deltaVal: 2, isYou: false },
  { rank: 6, name: 'Deepak', gw: 71, total: 2750, delta: 'same' as const, deltaVal: 0, isYou: false },
  { rank: 7, name: 'Sneha', gw: 82, total: 2680, delta: 'up' as const, deltaVal: 1, isYou: false },
  { rank: 8, name: 'Vikram', gw: 45, total: 2540, delta: 'down' as const, deltaVal: 3, isYou: false },
  { rank: 9, name: 'Karthik', gw: 58, total: 2490, delta: 'same' as const, deltaVal: 0, isYou: false },
  { rank: 10, name: 'Meera', gw: 91, total: 2420, delta: 'up' as const, deltaVal: 2, isYou: false },
  { rank: 11, name: 'Amit', gw: 52, total: 2310, delta: 'down' as const, deltaVal: 1, isYou: false },
  { rank: 12, name: 'Neha', gw: 60, total: 2240, delta: 'same' as const, deltaVal: 0, isYou: false },
  { rank: 13, name: 'Rohan', gw: 73, total: 2150, delta: 'up' as const, deltaVal: 1, isYou: false },
  { rank: 14, name: 'Ananya', gw: 38, total: 2060, delta: 'down' as const, deltaVal: 2, isYou: false },
  { rank: 15, name: 'Saurav', gw: 55, total: 1980, delta: 'same' as const, deltaVal: 0, isYou: false },
]

const mockMatches = [
  { team1: 'MI', team2: 'RCB', time: 'Tue, Mar 17 \u00B7 7:30 PM', day: 'TUE' },
  { team1: 'CSK', team2: 'KKR', time: 'Thu, Mar 19 \u00B7 7:30 PM', day: 'THU' },
  { team1: 'RR', team2: 'DC', time: 'Sat, Mar 21 \u00B7 3:30 PM', day: 'SAT' },
]

/* ─── Icons ─── */
const IconHome = () => (
  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
)
const IconLineup = () => (
  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
  </svg>
)
const IconPlayers = () => (
  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
)
const IconLeague = () => (
  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
)

/* ─── Helpers ─── */
function formatNumber(n: number): string {
  return n.toLocaleString('en-IN')
}

function getRankStyle(rank: number, isYou: boolean): React.CSSProperties {
  if (isYou) return { width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 7, fontSize: 10, fontWeight: 700, background: 'rgba(0,75,160,0.1)', color: '#004BA0' }
  if (rank === 1) return { width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 7, fontSize: 10, fontWeight: 700, background: 'rgba(249,205,5,0.12)', color: '#b58800' }
  if (rank === 2) return { width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 7, fontSize: 10, fontWeight: 700, background: 'rgba(192,199,208,0.15)', color: '#777' }  // silver shown for rank 3 in mockup
  if (rank === 3) return { width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 7, fontSize: 10, fontWeight: 700, background: 'rgba(192,199,208,0.15)', color: '#777' }
  if (rank === 4) return { width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 7, fontSize: 10, fontWeight: 700, background: 'rgba(205,127,50,0.1)', color: '#a0724a' }
  return { width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 7, fontSize: 10, fontWeight: 700, background: '#f2f3f8', color: '#999' }
}

export default function DashboardPage() {
  const { data: session, status: sessionStatus } = useSession()

  const [league, setLeague] = useState<League | null>(null)
  const [initialLoad, setInitialLoad] = useState(true)
  const [showAllStandings, setShowAllStandings] = useState(false)

  /* ─── Fetch league on mount ─── */
  const fetchLeague = useCallback(async () => {
    try {
      const res = await fetch('/api/leagues')
      if (!res.ok) return
      const leagues: League[] = await res.json()
      if (leagues.length > 0) {
        const detail = await fetch(`/api/leagues/${leagues[0].id}`)
        if (detail.ok) {
          const full = await detail.json()
          setLeague(full)
        }
      }
    } catch {
      // silent
    } finally {
      setInitialLoad(false)
    }
  }, [])

  useEffect(() => {
    if (sessionStatus === 'authenticated') fetchLeague()
  }, [sessionStatus, fetchLeague])

  /* ─── Auth guard ─── */
  if (sessionStatus === 'loading' || initialLoad) {
    return (
      <AppFrame>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: '#888', fontSize: 14 }}>Loading...</p>
        </div>
      </AppFrame>
    )
  }

  if (!session) {
    return (
      <AppFrame>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <p style={{ color: '#888', fontSize: 14 }}>Please log in to continue.</p>
          <a href="/login" style={{
            background: 'linear-gradient(160deg, #1a0a3e 0%, #2d1b69 25%, #004BA0 50%, #0EB1A2 80%, #00AEEF 100%)',
            color: '#fff', padding: '10px 20px', borderRadius: 10, fontWeight: 600, fontSize: 14, textDecoration: 'none',
          }}>Go to Login</a>
        </div>
      </AppFrame>
    )
  }

  const leagueName = league?.name || 'Weekend Warriors'
  const visibleStandings = showAllStandings ? mockStandings : mockStandings.slice(0, 7)

  return (
    <AppFrame>
    <div style={{
      position: 'relative',
      paddingBottom: 80,
    }}>
      {/* ══════════════════════════ HERO ══════════════════════════ */}
      <div style={{
        background: 'linear-gradient(160deg, #1a0a3e 0%, #2d1b69 25%, #004BA0 50%, #0EB1A2 80%, #00AEEF 100%)',
        padding: '40px 18px 14px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Radial glow */}
        <div style={{
          position: 'absolute', top: '-30%', right: '-20%',
          width: 300, height: 300,
          background: 'radial-gradient(circle, rgba(249,205,5,0.07) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Header row: logo + league tag */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
          <div style={{
            fontSize: 18, fontWeight: 900, letterSpacing: -0.5,
            background: 'linear-gradient(135deg, #F9CD05, #FF822A)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>Fantasy</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Dashboard</div>
        </div>

        {/* League full name */}
        <div style={{ textAlign: 'center', marginBottom: 6 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', letterSpacing: -0.3 }}>
            {leagueName}
          </div>
        </div>

        {/* Gameweek label */}
        <div style={{
          textAlign: 'center', fontSize: 10, color: 'rgba(255,255,255,0.6)',
          fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase' as const, marginBottom: 2,
        }}>
          Gameweek 7
        </div>

        {/* Score Trio */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', marginBottom: 8 }}>
          {/* Average */}
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'rgba(255,255,255,0.9)', fontVariantNumeric: 'tabular-nums' }}>612</div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: 0.8, marginTop: 1 }}>Average</div>
          </div>

          {/* Your Points (center) */}
          <div style={{ flex: 1.3, textAlign: 'center', position: 'relative' }}>
            {/* Left divider */}
            <div style={{ position: 'absolute', top: '10%', bottom: '20%', left: 0, width: 1, background: 'rgba(255,255,255,0.1)' }} />
            {/* Right divider */}
            <div style={{ position: 'absolute', top: '10%', bottom: '20%', right: 0, width: 1, background: 'rgba(255,255,255,0.1)' }} />
            <div style={{ fontSize: 32, fontWeight: 800, color: '#fff', letterSpacing: -1.5, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>788</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: 600, marginTop: 2 }}>Your Points</div>
            <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', marginTop: 1, fontWeight: 500 }}>tap for detail</div>
          </div>

          {/* Highest */}
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'rgba(255,255,255,0.9)', fontVariantNumeric: 'tabular-nums' }}>943</div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: 0.8, marginTop: 1 }}>Highest</div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '6px 0' }} />

        {/* Bottom row: deadline + edit lineup */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: 0.5 }}>GW8 Deadline</div>
            <div style={{ fontSize: 13, color: '#fff', fontWeight: 800 }}>Tue 17 Mar, 19:30</div>
          </div>
          <Link href="/lineup" style={{
            padding: '7px 14px', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10,
            background: 'rgba(255,255,255,0.12)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: 600,
            textDecoration: 'none',
            fontFamily: 'inherit',
          }}>
            Edit Lineup
          </Link>
        </div>
      </div>

      {/* ══════════════════════════ CONTENT ══════════════════════════ */}
      <div style={{ padding: '14px 14px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* ── League Standings Card ── */}
        <div style={{
          background: '#fff', border: '1px solid rgba(0,0,0,0.06)',
          borderRadius: 16, padding: 14,
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        }}>
          {/* Section header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a2e', letterSpacing: -0.2 }}>League Standings</div>
          </div>

          {/* Column headers */}
          <div style={{
            display: 'flex', padding: '0 10px 4px', fontSize: 9, fontWeight: 600,
            color: '#aaa', textTransform: 'uppercase' as const, letterSpacing: 0.5, gap: 8,
          }}>
            <div style={{ width: 22 }}>#</div>
            <div style={{ flex: 1 }}>Manager</div>
            <div style={{ width: 20, textAlign: 'center' }}></div>
            <div style={{ width: 36, textAlign: 'right' }}>GW</div>
            <div style={{ width: 42, textAlign: 'right' }}>Total</div>
          </div>

          {/* Standings rows */}
          {visibleStandings.map((s) => {
            const isFirst = s.rank === 1
            const rowStyle: React.CSSProperties = {
              display: 'flex', alignItems: 'center', padding: '9px 10px',
              borderRadius: 10, gap: 8, fontSize: 12.5,
              cursor: 'pointer',
              marginTop: s.rank > 1 ? 2 : 0,
              ...(s.isYou ? { background: 'rgba(0,75,160,0.04)', border: '1.5px solid rgba(0,75,160,0.1)' } : {}),
              ...(isFirst && !s.isYou ? { background: 'rgba(249,205,5,0.05)' } : {}),
              textDecoration: 'none',
            }

            const deltaColor = s.delta === 'up' ? '#0d9e5f' : s.delta === 'down' ? '#d63060' : '#ccc'
            const deltaText = s.delta === 'up' ? `\u25B2${s.deltaVal}` : s.delta === 'down' ? `\u25BC${s.deltaVal}` : '\u2014'

            const ptsColor = s.isYou ? '#004BA0' : isFirst ? '#b58800' : '#333'
            const nameColor = s.isYou ? '#111' : isFirst ? '#222' : '#555'
            const nameWeight = s.isYou ? 700 : isFirst ? 600 : 500

            return (
              <div key={s.rank} style={rowStyle}>
                <div style={getRankStyle(s.rank, s.isYou)}>{s.rank}</div>
                <div style={{ flex: 1, fontWeight: nameWeight, color: nameColor }}>{s.name}</div>
                <div style={{ fontSize: 9, fontWeight: 700, width: 20, textAlign: 'center', color: deltaColor }}>{deltaText}</div>
                <div style={{ fontSize: 11, color: '#999', fontWeight: 500, fontVariantNumeric: 'tabular-nums', width: 36, textAlign: 'right' }}>{s.gw}</div>
                <div style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: ptsColor, width: 42, textAlign: 'right' }}>{formatNumber(s.total)}</div>
              </div>
            )
          })}

          {/* Expand/collapse button */}
          <button
            onClick={() => setShowAllStandings(!showAllStandings)}
            style={{
              width: '100%', padding: 8, marginTop: 6,
              border: 'none', borderRadius: 8,
              background: '#f2f3f8', color: '#004BA0',
              fontSize: 11, fontWeight: 700, cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {showAllStandings ? 'Show less \u25B2' : `Show all ${mockStandings.length} \u25BC`}
          </button>

          {/* Hint */}
          <div style={{ fontSize: 9, color: '#bbb', textAlign: 'center', marginTop: 6, fontWeight: 500 }}>
            Tap a manager to view their lineup
          </div>
        </div>

        {/* ── This Week's Matches Card ── */}
        <div style={{
          background: '#fff', border: '1px solid rgba(0,0,0,0.06)',
          borderRadius: 16, padding: 14,
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a2e', letterSpacing: -0.2, marginBottom: 10 }}>This Week</div>

          {mockMatches.map((m, i) => {
            const c1 = teamColors[m.team1] || '#888'
            const c2 = teamColors[m.team2] || '#888'
            // CSK text shown as gold like mockup
            const t1Color = m.team1 === 'CSK' ? '#b58800' : c1
            const t2Color = m.team2 === 'CSK' ? '#b58800' : c2

            return (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 12px', background: '#f7f8fb',
                borderRadius: 12, border: '1px solid rgba(0,0,0,0.04)',
                position: 'relative', overflow: 'hidden',
                marginTop: i > 0 ? 4 : 0,
              }}>
                {/* Left gradient bar */}
                <div style={{
                  position: 'absolute', top: 0, left: 0, bottom: 0, width: 3,
                  borderRadius: '3px 0 0 3px',
                  background: `linear-gradient(to bottom, ${c1}, ${c2})`,
                }} />
                {/* Match info */}
                <div style={{ paddingLeft: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600 }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: c1, boxShadow: `0 0 4px ${c1}`, flexShrink: 0 }} />
                    <span style={{ color: t1Color }}>{m.team1}</span>
                    <span style={{ fontSize: 9, color: '#aaa', fontWeight: 500 }}>vs</span>
                    <span style={{ color: t2Color }}>{m.team2}</span>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: c2, boxShadow: `0 0 4px ${c2}`, flexShrink: 0 }} />
                  </div>
                  <div style={{ fontSize: 10, color: '#999', marginTop: 2 }}>{m.time}</div>
                </div>
                {/* Day badge */}
                <div style={{
                  fontSize: 9, fontWeight: 600, padding: '3px 8px',
                  borderRadius: 6, background: '#eef0f5', color: '#777',
                }}>
                  {m.day}
                </div>
              </div>
            )
          })}
        </div>

        {/* Spacer for scroll */}
        <div style={{ height: 30 }} />
      </div>

      {/* ══════════════════════════ BOTTOM NAV ══════════════════════════ */}
      <nav className="bottom-nav-fixed" style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 480,
        display: 'flex', justifyContent: 'space-around',
        padding: '8px 8px env(safe-area-inset-bottom, 30px)',
        background: '#fff',
        borderTop: '1px solid rgba(0,0,0,0.06)',
        zIndex: 100,
      }}>
        <Link href="/" style={{ textDecoration: 'none', textAlign: 'center', fontSize: 10, color: '#004BA0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, fontWeight: 600 }}>
          <div style={{ width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,75,160,0.08)', borderRadius: 7 }}>
            <IconHome />
          </div>
          Home
        </Link>
        <Link href="/lineup" style={{ textDecoration: 'none', textAlign: 'center', fontSize: 10, color: '#8e8e93', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, fontWeight: 500 }}>
          <div style={{ width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconLineup />
          </div>
          Lineup
        </Link>
        <Link href="/players" style={{ textDecoration: 'none', textAlign: 'center', fontSize: 10, color: '#8e8e93', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, fontWeight: 500 }}>
          <div style={{ width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconPlayers />
          </div>
          Players
        </Link>
        <Link href="/admin" style={{ textDecoration: 'none', textAlign: 'center', fontSize: 10, color: '#8e8e93', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, fontWeight: 500 }}>
          <div style={{ width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconLeague />
          </div>
          League
        </Link>
      </nav>
    </div>
    </AppFrame>
  )
}
