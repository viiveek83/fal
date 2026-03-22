'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AppFrame } from '@/app/components/AppFrame'

/* ─── Mock standings data ─── */
const mockStandings = [
  { manager: 'Rahul', gwScores: [98, 105, 120, 112, 98, 102, 102], total: 3240, delta: 2 },
  { manager: 'Viiveek', gwScores: [95, 112, 145, 87, 134, 102, 88], total: 3195, delta: -1 },
  { manager: 'Priya', gwScores: [92, 135, 78, 145, 112, 88, 76], total: 3110, delta: 0 },
  { manager: 'Shaheel', gwScores: [88, 102, 110, 92, 128, 135, 95], total: 2980, delta: 1 },
  { manager: 'Arjun', gwScores: [84, 98, 105, 110, 95, 100, 64], total: 2870, delta: -2 },
  { manager: 'Deepak', gwScores: [78, 92, 88, 95, 105, 92, 71], total: 2750, delta: 0 },
  { manager: 'Sneha', gwScores: [75, 88, 95, 82, 90, 85, 82], total: 2680, delta: 1 },
  { manager: 'Vikram', gwScores: [72, 85, 80, 88, 82, 78, 58], total: 2610, delta: -1 },
  { manager: 'Karthik', gwScores: [70, 78, 85, 90, 75, 82, 91], total: 2540, delta: 2 },
  { manager: 'Meera', gwScores: [68, 72, 78, 75, 80, 70, 47], total: 2490, delta: -3 },
]

const totalGWs = 7
const yourManager = 'Viiveek'

/* ─── Icons ─── */
const IconHome = () => (
  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
)
const IconLineup = () => (
  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
)
const IconPlayers = () => (
  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
)
const IconLeague = () => (
  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
)

export default function StandingsPage() {
  const [activeGW, setActiveGW] = useState(totalGWs)

  // Sort by total descending
  const standings = [...mockStandings].sort((a, b) => b.total - a.total)

  return (
    <AppFrame>
    <div style={{
      position: 'relative',
      paddingBottom: 80,
      fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
    }}>
      {/* ── Page Header ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '48px 18px 8px',
      }}>
        <Link href="/leaderboard" style={{
          width: 32, height: 32, borderRadius: 10,
          background: '#fff', border: '1px solid rgba(0,0,0,0.06)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', fontSize: 16, color: '#333',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          textDecoration: 'none',
        }}>
          &#8592;
        </Link>
        <div style={{ fontSize: 17, fontWeight: 800, color: '#1a1a2e', letterSpacing: -0.3 }}>
          League Standings
        </div>
        <div style={{
          marginLeft: 'auto',
          fontSize: 11, fontWeight: 600, color: 'rgba(0,0,0,0.4)',
          background: 'rgba(0,0,0,0.04)', padding: '4px 10px', borderRadius: 8,
        }}>
          Weekend Warriors
        </div>
      </div>

      {/* ── GW Tab Selector ── */}
      <div style={{
        padding: '6px 14px 10px',
        overflowX: 'auto',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        WebkitOverflowScrolling: 'touch',
      }}>
        <div style={{ display: 'flex', gap: 6, width: 'max-content' }}>
          {Array.from({ length: totalGWs }, (_, i) => totalGWs - i).map((gw) => (
            <button
              key={gw}
              onClick={() => setActiveGW(gw)}
              style={{
                padding: '6px 14px',
                borderRadius: 10,
                fontSize: 12,
                fontWeight: 600,
                color: activeGW === gw ? '#fff' : '#888',
                background: activeGW === gw ? '#004BA0' : '#fff',
                border: activeGW === gw ? '1px solid #004BA0' : '1px solid rgba(0,0,0,0.06)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                boxShadow: activeGW === gw ? '0 2px 8px rgba(0,75,160,0.2)' : '0 1px 3px rgba(0,0,0,0.03)',
              }}
            >
              GW{gw}
            </button>
          ))}
        </div>
      </div>

      {/* ── Standings Table ── */}
      <div style={{ padding: '0 14px' }}>
        <div style={{
          background: '#fff',
          border: '1px solid rgba(0,0,0,0.06)',
          borderRadius: 16,
          padding: 14,
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        }}>
          {/* Table Header */}
          <div style={{
            display: 'flex',
            padding: '0 10px 8px',
            fontSize: 9,
            fontWeight: 600,
            color: '#aaa',
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            gap: 8,
            borderBottom: '1px solid #f0f0f4',
            marginBottom: 4,
          }}>
            <div style={{ width: 22 }}>#</div>
            <div style={{ flex: 1 }}>Manager</div>
            <div style={{ width: 24, textAlign: 'center' }}>{'\u0394'}</div>
            <div style={{ width: 36, textAlign: 'right' }}>GW</div>
            <div style={{ width: 46, textAlign: 'right' }}>Total</div>
          </div>

          {/* Rows */}
          {standings.map((team, i) => {
            const rank = i + 1
            const isYou = team.manager === yourManager
            const gwScore = team.gwScores[activeGW - 1]

            // Rank badge
            let rankBg = '#f2f3f8'
            let rankColor = '#999'
            if (rank === 1) { rankBg = 'rgba(249,205,5,0.12)'; rankColor = '#b58800' }
            else if (rank === 2 && isYou) { rankBg = 'rgba(0,75,160,0.1)'; rankColor = '#004BA0' }
            else if (rank === 3) { rankBg = 'rgba(192,199,208,0.15)'; rankColor = '#777' }
            else if (rank === 4) { rankBg = 'rgba(205,127,50,0.1)'; rankColor = '#a0724a' }

            // Delta
            let deltaColor = '#ccc'
            let deltaText = '\u2014'
            if (team.delta > 0) { deltaColor = '#0d9e5f'; deltaText = `\u25B2${team.delta}` }
            else if (team.delta < 0) { deltaColor = '#d63060'; deltaText = `\u25BC${Math.abs(team.delta)}` }

            // Points color
            let ptsColor = '#333'
            let ptsFontWeight = 700
            if (isYou) { ptsColor = '#004BA0' }
            else if (rank === 1) { ptsColor = '#b58800' }

            const rowContent = (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                padding: '10px 10px',
                borderRadius: 10,
                gap: 8,
                fontSize: 12.5,
                cursor: isYou ? 'default' : 'pointer',
                position: 'relative',
                background: isYou ? 'rgba(0,75,160,0.04)' : 'transparent',
                border: isYou ? '1.5px solid rgba(0,75,160,0.1)' : '1.5px solid transparent',
                marginTop: i > 0 ? 1 : 0,
              }}>
                {/* Rank badge */}
                <div style={{
                  width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: 7, fontSize: 10, fontWeight: 700,
                  background: rankBg, color: rankColor,
                }}>{rank}</div>
                {/* Manager name */}
                <div style={{
                  flex: 1,
                  fontWeight: isYou ? 700 : 500,
                  color: isYou ? '#111' : rank === 1 ? '#222' : '#555',
                }}>{isYou ? 'You' : team.manager}</div>
                {/* Delta */}
                <div style={{
                  fontSize: 10, fontWeight: 700, width: 24, textAlign: 'center',
                  color: deltaColor,
                }}>{deltaText}</div>
                {/* GW score */}
                <div style={{
                  fontSize: 11, color: '#999', fontWeight: 500,
                  fontVariantNumeric: 'tabular-nums',
                  width: 36, textAlign: 'right',
                }}>{gwScore}</div>
                {/* Total */}
                <div style={{
                  fontWeight: ptsFontWeight, fontVariantNumeric: 'tabular-nums',
                  color: ptsColor,
                  width: 46, textAlign: 'right',
                }}>{team.total.toLocaleString()}</div>
              </div>
            )

            if (isYou) {
              return <div key={team.manager}>{rowContent}</div>
            }

            return (
              <Link
                key={team.manager}
                href="/lineup"
                style={{ textDecoration: 'none', display: 'block' }}
              >
                {rowContent}
              </Link>
            )
          })}
        </div>
      </div>

      <div style={{ height: 30 }} />

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
        padding: '8px 8px env(safe-area-inset-bottom, 24px)',
        zIndex: 100,
      }}>
        <NavItem href="/" icon={<IconHome />} label="Home" active={false} />
        <NavItem href="/lineup" icon={<IconLineup />} label="Lineup" active={false} />
        <NavItem href="/players" icon={<IconPlayers />} label="Players" active={false} />
        <NavItem href="/admin" icon={<IconLeague />} label="League" active={false} />
      </nav>
    </div>
    </AppFrame>
  )
}

/* ─── Nav Item ─── */
function NavItem({ href, icon, label, active }: { href: string; icon: React.ReactNode; label: string; active: boolean }) {
  return (
    <Link href={href} style={{
      textAlign: 'center',
      fontSize: 10,
      color: active ? '#004BA0' : '#8e8e93',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 3,
      fontWeight: active ? 600 : 500,
      textDecoration: 'none',
    }}>
      <div style={{
        width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 16,
        background: active ? 'rgba(0,75,160,0.08)' : 'transparent',
        borderRadius: 7,
      }}>{icon}</div>
      {label}
    </Link>
  )
}
