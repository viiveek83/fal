'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect, useCallback, useRef } from 'react'

/* ─── IPL teams ─── */
const teams = [
  { code: 'MI', name: 'Mumbai Indians', color: '#004BA0' },
  { code: 'CSK', name: 'Chennai Super Kings', color: '#F9CD05' },
  { code: 'RCB', name: 'Royal Challengers Bengaluru', color: '#EC1C24' },
  { code: 'KKR', name: 'Kolkata Knight Riders', color: '#3A225D' },
  { code: 'DC', name: 'Delhi Capitals', color: '#004C93' },
  { code: 'RR', name: 'Rajasthan Royals', color: '#EA1A85' },
  { code: 'SRH', name: 'Sunrisers Hyderabad', color: '#FF822A' },
  { code: 'GT', name: 'Gujarat Titans', color: '#0EB1A2' },
  { code: 'LSG', name: 'Lucknow Super Giants', color: '#00AEEF' },
  { code: 'PBKS', name: 'Punjab Kings', color: '#ED1B24' },
]

const teamColorMap: Record<string, string> = {}
teams.forEach((t) => { teamColorMap[t.code] = t.color })

const teamNameMap: Record<string, string> = {}
teams.forEach((t) => { teamNameMap[t.code] = t.name })

/* Role badge styles matching mockup */
const roleBadgeStyles: Record<string, { bg: string; color: string }> = {
  BAT:  { bg: 'rgba(249,205,5,0.12)', color: '#9a7d00' },
  BOWL: { bg: 'rgba(0,75,160,0.1)',   color: '#004BA0' },
  ALL:  { bg: 'rgba(14,177,162,0.1)', color: '#0a7a65' },
  WK:   { bg: 'rgba(234,26,133,0.08)', color: '#c0186e' },
}

const roles = ['All', 'BAT', 'BOWL', 'ALL', 'WK'] as const

/* ─── Types ─── */
interface Player {
  id: string
  fullname: string
  role: string
  iplTeamCode: string | null
  iplTeamName: string | null
  imageUrl: string | null
}

/* ─── Helpers ─── */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

function seededRandom(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

/* ─── Icons ─── */
const IconHome = () => (
  <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
)
const IconLineup = () => (
  <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
)
const IconBoard = () => (
  <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
)
const IconPlayers = () => (
  <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
)
const IconLeague = () => (
  <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
)
const SearchIcon = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
)

export default function PlayersPage() {
  const { data: session, status: sessionStatus } = useSession()

  const [players, setPlayers] = useState<Player[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [activeRole, setActiveRole] = useState<string>('All')
  const [activeTeam, setActiveTeam] = useState<string>('ALL')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /* Debounce search */
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [search])

  /* Fetch players */
  const fetchPlayers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (activeRole !== 'All') params.set('role', activeRole)
      if (activeTeam !== 'ALL') params.set('team', activeTeam)
      if (debouncedSearch) params.set('search', debouncedSearch)
      params.set('limit', '50')

      const res = await fetch(`/api/players?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setPlayers(data.players)
        setTotal(data.total)
      }
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [activeRole, activeTeam, debouncedSearch])

  useEffect(() => {
    if (sessionStatus === 'authenticated') fetchPlayers()
  }, [sessionStatus, fetchPlayers])

  /* ─── Auth guard ─── */
  if (sessionStatus === 'loading') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f2f3f8' }}>
        <p style={{ color: '#888', fontSize: 14 }}>Loading...</p>
      </div>
    )
  }
  if (!session) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, background: '#f2f3f8' }}>
        <p style={{ color: '#888', fontSize: 14 }}>Please log in to browse players.</p>
        <a href="/login" style={{
          background: 'linear-gradient(160deg, #1a0a3e 0%, #2d1b69 25%, #004BA0 50%, #0EB1A2 80%, #00AEEF 100%)',
          color: '#fff', padding: '10px 20px', borderRadius: 10, fontWeight: 600, fontSize: 14, textDecoration: 'none',
        }}>Go to Login</a>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f2f3f8',
      maxWidth: 393,
      margin: '0 auto',
      position: 'relative',
      paddingBottom: 80,
      fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', sans-serif",
      WebkitFontSmoothing: 'antialiased',
    } as React.CSSProperties}>

      {/* ── Hero Header ── */}
      <div style={{
        background: 'linear-gradient(160deg, #1a0a3e 0%, #2d1b69 25%, #004BA0 50%, #0EB1A2 80%, #00AEEF 100%)',
        padding: '40px 0 16px',
      }}>
        {/* App bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px 12px' }}>
          <div style={{
            fontSize: 15, fontWeight: 900, letterSpacing: -0.5,
            background: 'linear-gradient(135deg, #F9CD05, #FF822A)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          } as React.CSSProperties}>FAL</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', letterSpacing: -0.3 }}>Players</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>{total} total</div>
        </div>

        {/* Search bar */}
        <div style={{ margin: '0 16px 10px', position: 'relative' }}>
          <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.5)' }}>
            <SearchIcon />
          </div>
          <input
            placeholder="Search players..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '11px 14px 11px 38px',
              borderRadius: 14,
              background: 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff',
              fontSize: 14,
              outline: 'none',
              fontFamily: 'inherit',
            } as React.CSSProperties}
          />
        </div>

        {/* Role filter pills */}
        <div style={{
          display: 'flex', gap: 6, margin: '0 16px', overflowX: 'auto',
          scrollbarWidth: 'none', paddingBottom: 2,
        } as React.CSSProperties}>
          {roles.map((role) => {
            const isActive = activeRole === role
            return (
              <button
                key={role}
                onClick={() => setActiveRole(role)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 10,
                  fontSize: 11,
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  border: isActive ? '1px solid rgba(255,255,255,0.4)' : '1px solid rgba(255,255,255,0.15)',
                  background: isActive ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)',
                  color: isActive ? '#fff' : 'rgba(255,255,255,0.6)',
                  transition: 'all 0.2s',
                  fontFamily: 'inherit',
                }}
              >
                {role}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Team filter chips ── */}
      <div style={{
        display: 'flex', gap: 4, padding: '12px 16px 4px',
        overflowX: 'auto', scrollbarWidth: 'none',
      } as React.CSSProperties}>
        <button
          onClick={() => setActiveTeam('ALL')}
          style={{
            padding: '5px 10px', borderRadius: 8, fontSize: 10, fontWeight: 700,
            whiteSpace: 'nowrap', cursor: 'pointer', letterSpacing: 0.3,
            fontFamily: 'inherit',
            border: activeTeam === 'ALL' ? '1px solid rgba(0,0,0,0.15)' : '1px solid rgba(0,0,0,0.06)',
            background: activeTeam === 'ALL' ? '#f0f0f4' : '#fff',
            color: '#555',
            transition: 'all 0.2s',
          }}
        >
          ALL
        </button>
        {teams.map((t) => {
          const isActive = activeTeam === t.code
          return (
            <button
              key={t.code}
              onClick={() => setActiveTeam(t.code)}
              style={{
                padding: '5px 10px', borderRadius: 8, fontSize: 10, fontWeight: 700,
                whiteSpace: 'nowrap', cursor: 'pointer', letterSpacing: 0.3,
                fontFamily: 'inherit',
                border: isActive ? `1px solid ${t.color}40` : '1px solid rgba(0,0,0,0.06)',
                background: isActive ? `${t.color}14` : '#fff',
                color: isActive ? t.color : '#999',
                transition: 'all 0.2s',
              }}
            >
              {t.code}
            </button>
          )
        })}
      </div>

      {/* ── Player list ── */}
      <div style={{ padding: '8px 14px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {loading && players.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: '#888', fontSize: 14 }}>Loading players...</div>
        )}

        {!loading && players.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: '#888', fontSize: 14 }}>No players found.</div>
        )}

        {players.map((player) => {
          const teamColor = teamColorMap[player.iplTeamCode || ''] || '#888'
          const badge = roleBadgeStyles[player.role] || roleBadgeStyles.BAT
          const initials = getInitials(player.fullname)
          const pts = 100 + (seededRandom(player.id) % 400)

          return (
            <div
              key={player.id}
              style={{
                display: 'flex', alignItems: 'center', padding: 12,
                borderRadius: 16, gap: 10, position: 'relative',
                background: '#fff', border: '1px solid rgba(0,0,0,0.06)',
                boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                overflow: 'hidden',
              }}
            >
              {/* Team accent bar */}
              <div style={{
                position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
                background: teamColor,
              }} />

              {/* Avatar */}
              <div style={{
                width: 40, height: 40, borderRadius: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 800, color: '#fff', flexShrink: 0,
                background: `linear-gradient(135deg, ${teamColor}, ${teamColor}cc)`,
              }}>
                {initials}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0, paddingLeft: 2 }}>
                <div style={{
                  fontSize: 14, fontWeight: 600, color: '#1a1a2e', letterSpacing: -0.2,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {player.fullname}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                  <span style={{
                    fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                    textTransform: 'uppercase', letterSpacing: 0.5,
                    background: badge.bg, color: badge.color,
                  }}>
                    {player.role}
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: teamColor }}>
                    {player.iplTeamCode || ''}
                  </span>
                </div>
              </div>

              {/* Points */}
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{
                  fontSize: 16, fontWeight: 800, color: '#1a1a2e',
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {pts}
                </div>
                <div style={{ fontSize: 9, color: '#999', marginTop: 1 }}>season pts</div>
              </div>
            </div>
          )
        })}

        {/* Spacer for bottom nav */}
        <div style={{ height: 40 }} />
      </div>

      {/* ── Bottom Navigation ── */}
      <nav style={{
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: 393,
        background: '#fff',
        borderTop: '1px solid rgba(0,0,0,0.06)',
        display: 'flex',
        justifyContent: 'space-around',
        padding: '8px 0 env(safe-area-inset-bottom, 8px)',
        zIndex: 100,
      }}>
        {[
          { href: '/', label: 'Home', icon: <IconHome />, active: false },
          { href: '/lineup', label: 'Lineup', icon: <IconLineup />, active: false },
          { href: '#', label: 'Board', icon: <IconBoard />, active: false },
          { href: '/players', label: 'Players', icon: <IconPlayers />, active: true },
          { href: '/admin', label: 'League', icon: <IconLeague />, active: false },
        ].map((item) => (
          <a
            key={item.label}
            href={item.href}
            style={{
              textAlign: 'center',
              fontSize: 11,
              color: item.active ? '#004BA0' : '#8e8e93',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              fontWeight: item.active ? 700 : 500,
              position: 'relative',
              textDecoration: 'none',
              padding: '0 8px',
            }}
          >
            {item.active && (
              <div style={{
                position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)',
                width: 36, height: 3, borderRadius: 2, background: '#004BA0',
              }} />
            )}
            <div style={{ lineHeight: 1 }}>{item.icon}</div>
            {item.label}
          </a>
        ))}
      </nav>
    </div>
  )
}
