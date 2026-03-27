# App Admin Dashboard — Implementation Plan

## Problem

There is no admin UI for platform-level operations. The scoring import API endpoint exists but has no button. Player team sync is a CLI-only script. Admins have no visibility into match scoring status, no way to trigger scoring from the app, and no way to sync player IPL team assignments after trades/replacements.

Additionally, the scoring pipeline has operational gaps:
- Users can't see team scores until an entire gameweek is aggregated
- The daily cron processes max 4 matches per run, causing backlogs
- Admin has no alerts when matches are ready to score

## Who Gets Access

Platform-level "App Admin" access controlled via `APP_ADMIN_EMAILS` environment variable. Initial admins:
- viiveek@gmail.com
- shaheeldholakia@gmail.com

This is separate from league-level admin (`League.adminUserId`), which controls roster uploads, manager removal, and league settings.

---

## Phase 1: App Admin Foundation

### 1.1 App Admin helper — `lib/app-admin.ts` (CREATE)

Simple helper that checks session email against env var:

```typescript
export function isAppAdmin(session): boolean {
  const emails = (process.env.APP_ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
  return emails.includes(session?.user?.email?.toLowerCase())
}
```

No schema change. No DB query. No migration.

### 1.2 Update existing scoring routes

Change `role !== 'ADMIN'` checks to `!isAppAdmin(session)` in:

- `app/api/scoring/import/route.ts`
- `app/api/scoring/recalculate/[matchId]/route.ts`
- `app/api/scoring/cancel/[matchId]/route.ts`

This restricts scoring operations to app admins only (currently any `ADMIN` role user can trigger scoring, including league admins who shouldn't have platform access).

### 1.3 Env var setup

Add to Vercel project settings (Settings > Environment Variables):

- Key: `APP_ADMIN_EMAILS`
- Value: `viiveek@gmail.com,shaheeldholakia@gmail.com`
- Environment: Production, Preview, Development

---

## Phase 2: Sync Player Teams API

### 2.1 Extract shared logic — `lib/sync-players.ts` (CREATE)

Move the core sync logic from `scripts/reseed-player-teams.ts` into a reusable module:

```typescript
export async function syncPlayerTeams(options: { apply: boolean }): Promise<SyncResult>
```

Returns:
```typescript
interface SyncResult {
  teamChanges: { playerName: string; apiPlayerId: number; oldTeam: string; newTeam: string; fantasyTeams: string[] }[]
  newPlayers: { playerName: string; iplTeamCode: string }[]
  roleChanges: { playerName: string; oldRole: string; newRole: string }[]
  applied: boolean
  updatedCount: number
  createdCount: number
}
```

The CLI script (`scripts/reseed-player-teams.ts`) is refactored to call this shared function.

### 2.2 Sync Player Teams API — `app/api/admin/sync-players/route.ts` (CREATE)

**GET** — Dry run
- Calls `syncPlayerTeams({ apply: false })`
- Returns changes without writing to DB
- Gated by `isAppAdmin()`

**POST** — Apply
- Calls `syncPlayerTeams({ apply: true })`
- Writes changes to DB
- Gated by `isAppAdmin()`

---

## Phase 3: App Admin Dashboard UI

### 3.1 Page — `app/app-admin/page.tsx` (CREATE)

Server-side auth check: if not app admin, redirect to `/`.

Two card sections on the page:

### 3.2 Section 1: Import Scores

**Layout:**

```
┌─────────────────────────────────────────────┐
│  Import Scores                              │
│                                             │
│  Match Status                               │
│  ┌────────────────────────┬───────────────┐ │
│  │ KKR vs RCB  •  Mar 26  │  ● Scored     │ │
│  │ MI vs CSK   •  Mar 26  │  ● Completed  │ │
│  │ DC vs SRH   •  Mar 27  │  ● Scheduled  │ │
│  │ RR vs PBKS  •  Mar 27  │  ● Error      │ │
│  └────────────────────────┴───────────────┘ │
│                                             │
│  2 matches ready to score                   │
│                                             │
│  [       Import Scores       ]              │
│                                             │
└─────────────────────────────────────────────┘
```

**Status pill colors:**
- `Scheduled` — grey
- `Completed` — blue (ready to score)
- `Scoring` — yellow (in progress)
- `Scored` — green
- `Error` — red (with "Recalculate" link)
- `Cancelled` — dark grey

**UI Flow — Click "Import Scores":**

1. **Button state**: Text changes to "Importing..." with spinner, button disabled
2. **API call**: `POST /api/scoring/import`
3. **Wait**: 10-30 seconds (fetches scorecards, computes points)
4. **Response handling**:

| Outcome | Toast | Color | Detail |
|---------|-------|-------|--------|
| Matches scored | "Scored 3 matches" | Green | If GW aggregated: "+ Gameweek 2 leaderboard updated" |
| Partial | "Scored 2 of 5 matches. Run again for remaining." | Yellow | Some matches still Completed |
| Nothing to do | "No matches ready to score" | Grey | All already Scored or Scheduled |
| Error | "Scoring failed: [message]" | Red | Pipeline error |

5. **After response**: Match status table auto-refreshes, button re-enabled

**Error match row**: Shows "Recalculate" link that calls `POST /api/scoring/recalculate/[matchId]` to reset the match and retry.

### 3.3 Section 2: Sync Player Teams

**Layout:**

```
┌─────────────────────────────────────────────┐
│  Sync Player Teams                          │
│                                             │
│  Check if any IPL players changed teams     │
│  since last sync.                           │
│                                             │
│  [     Check for Updates     ]              │
│                                             │
└─────────────────────────────────────────────┘
```

**UI Flow — Click "Check for Updates":**

1. **Button state**: Text changes to "Checking..." with spinner, disabled
2. **API call**: `GET /api/admin/sync-players` (dry run)
3. **Wait**: 5-10 seconds (10 SportMonks API calls, one per IPL team)
4. **Response — changes found**:

```
┌─────────────────────────────────────────────┐
│  Sync Player Teams                          │
│                                             │
│  31 team changes found                      │
│                                             │
│  ┌──────────────┬──────┬──────┬───────────┐ │
│  │ Player       │ From │ To   │ Fantasy   │ │
│  ├──────────────┼──────┼──────┼───────────┤ │
│  │ Sanju Samson │ RR   │ CSK  │ BashXI,   │ │
│  │              │      │      │ Spartans  │ │
│  │ R. Jadeja    │ CSK  │ RR   │ BashXI,   │ │
│  │              │      │      │ Pocket R. │ │
│  │ L.Livingstone│ RCB  │ SRH  │ Buttler   │ │
│  │              │      │      │ Call Saul │ │
│  │ ...27 more   │      │      │           │ │
│  └──────────────┴──────┴──────┴───────────┘ │
│                                             │
│  + 3 new players                            │
│                                             │
│  ℹ Only updates IPL team badges.            │
│    Rosters, lineups, and scores are         │
│    not affected.                            │
│                                             │
│  [       Apply Changes       ]   (orange)   │
│                                             │
└─────────────────────────────────────────────┘
```

5. **Click "Apply Changes"** — Confirmation modal:

```
┌─────────────────────────────────────────┐
│  Apply player team updates?             │
│                                         │
│  • 31 team badge changes                │
│  • 3 new players added                  │
│                                         │
│  This only updates which IPL team       │
│  badge shows next to each player.       │
│  Fantasy rosters, lineups, and          │
│  scores are NOT affected.               │
│                                         │
│         [Cancel]    [Apply]             │
└─────────────────────────────────────────┘
```

6. **After apply**:
   - Green toast: "Updated 31 players, added 3 new players"
   - Table clears, replaced with: ✓ "All player teams are up to date"

**Response — no changes found**:
- Green check: "All player teams are up to date"
- No Apply button shown

**Response — error**:
- Red toast: "Sync failed: [message]"
- Check button re-enabled for retry

---

## Phase 4: Navigation & Auth Guard

### 4.1 App Admin nav check — `app/api/user/is-app-admin/route.ts` (CREATE)

Returns `{ isAppAdmin: boolean }` for the current session user. Called by client-side nav component to conditionally show the App Admin link.

### 4.2 AppFrame nav update — `app/components/AppFrame.tsx` (MODIFY)

Add "App Admin" link to bottom navigation:
- Icon: shield or gear
- Only visible when `isAppAdmin` is true
- Positioned after existing nav items

### 4.3 Page-level auth guard

`app/app-admin/page.tsx` checks `isAppAdmin(session)` on server render. Non-admins redirected to `/`.

---

## Phase 5: Pipeline Operational Fixes

### 5.1 Remove 4-match processing limit

**File**: `lib/scoring/pipeline.ts`

**Current**: Pipeline claims max 4 COMPLETED matches per run.

**Change**: Remove the limit. One "Import Scores" click or one cron run scores ALL pending matches.

**Why**: With the 4-match limit, if admin forgets for 2 days (8 matches pile up), one click only scores 4. The daily cron needs 2 days to clear the backlog. Removing the limit means one click (or one cron run) clears everything.

**Risk**: Longer execution time per run. A full backlog of 8 matches could take 60s+ which may hit Vercel's serverless timeout (60s on Hobby). Mitigation: if timeout is a concern, increase to 8 instead of unlimited.

### 5.2 "Ready to score" badge

On the App Admin page, show a count of matches in `COMPLETED` status above the Import Scores button:

- "3 matches ready to score" (blue)
- "No matches ready to score" (grey)

Loaded from `GET /api/scoring/status` on page load.

---

## Files Summary

| File | Action | Purpose |
|------|--------|---------|
| `lib/app-admin.ts` | CREATE | `isAppAdmin()` helper |
| `lib/sync-players.ts` | CREATE | Shared sync logic extracted from CLI script |
| `app/api/admin/sync-players/route.ts` | CREATE | GET (dry run) + POST (apply) |
| `app/api/user/is-app-admin/route.ts` | CREATE | Client-side nav check |
| `app/app-admin/page.tsx` | CREATE | App admin dashboard UI |
| `app/api/scoring/import/route.ts` | MODIFY | Use `isAppAdmin()` |
| `app/api/scoring/recalculate/[matchId]/route.ts` | MODIFY | Use `isAppAdmin()` |
| `app/api/scoring/cancel/[matchId]/route.ts` | MODIFY | Use `isAppAdmin()` |
| `app/components/AppFrame.tsx` | MODIFY | Conditional App Admin nav link |
| `lib/scoring/pipeline.ts` | MODIFY | Remove 4-match limit |
| `scripts/reseed-player-teams.ts` | MODIFY | Refactor to use `lib/sync-players.ts` |

**No schema changes. No migration. No build command changes.**

---

## Phase 6: Live Mid-Gameweek Scores

### Why

PRD Section 8 states: **"Live updates within a gameweek (recalculates after each match is scored)."**

Currently, users see nothing on their dashboard until the entire gameweek is aggregated (all matches scored + bench subs + captain/VC + chips applied). In a gameweek with 7 matches across 4 days, users wait days to see any team score. This violates the PRD requirement.

### Current Flow (broken)

```
Match 1 scored → PlayerPerformance created → user sees nothing on dashboard
Match 2 scored → PlayerPerformance created → user sees nothing on dashboard
...
Match 7 scored → aggregateGameweek() runs → GameweekScore created → user finally sees team score
```

### Proposed Flow (live)

```
Match 1 scored → PlayerPerformance created → running total computed on-the-fly → user sees partial score
Match 2 scored → PlayerPerformance created → running total updated → user sees updated score
...
Match 7 scored → aggregateGameweek() runs → final GameweekScore with bench subs/chips → user sees final score
```

### 6.1 Live scores API — `app/api/teams/[teamId]/scores/live/[gameweekId]/route.ts` (CREATE)

Computes a **running total** from already-scored matches without waiting for full aggregation.

**Logic:**
1. Fetch team's lineup for this gameweek (XI + bench + captain/VC)
2. Fetch all `PlayerPerformance` records for this GW's scored matches
3. Sum each lineup player's fantasy points across scored matches
4. Apply captain 2x multiplier (if captain has performances = played)
5. Return per-player breakdown + team running total

**What it does NOT apply** (these only apply at final aggregation):
- Bench auto-substitutions (can't know who's absent until GW is fully over)
- Chip effects (chip doubles are final-score calculations)
- VC promotion (can't know if captain is absent until GW is over)

**Response:**
```typescript
{
  gameweekNumber: 3,
  status: 'IN_PROGRESS',           // vs 'FINAL' when aggregated
  matchesScored: 4,
  matchesTotal: 7,
  runningTotal: 342,               // sum of XI player points + captain 2x
  finalTotal: null,                // null until aggregated, then from GameweekScore
  players: [
    { id: '...', name: 'Virat Kohli', role: 'BAT', points: 67, isCaptain: true, multipliedPoints: 134 },
    { id: '...', name: 'Jasprit Bumrah', role: 'BOWL', points: 45, isCaptain: false, multipliedPoints: 45 },
    ...
  ],
  notes: [
    'Bench substitutions and chip effects are applied after the final match.'
  ]
}
```

### 6.2 Dashboard integration — modify `app/page.tsx`

**Current**: Dashboard "Your Points" section shows `GameweekScore.totalPoints` — empty until aggregation.

**Change**: If no `GameweekScore` exists for the active GW, fall back to the live scores API:
- Show running total with a label: **"Live • 4/7 matches scored"**
- After aggregation completes, switch to final score: **"Final • GW 3"**

**Visual distinction:**
- Live score: shown with a pulsing dot or "LIVE" badge, slightly faded to indicate it's provisional
- Final score: shown normally (no badge)
- Subtext under live score: *"Bench subs and chip effects applied after final match"*

### 6.3 GW Score Sheet integration — modify existing score detail sheet

When user taps their GW score on the dashboard:
- **If GW aggregated**: show final breakdown (current behavior, no change)
- **If GW in progress**: show live per-player breakdown from the live API
  - Each player row shows points from scored matches
  - Players with no performances yet show "—" or "0"
  - Captain shows 2x badge with doubled points
  - Bottom note: *"Bench subs and chip effects applied after final match"*

### 6.4 Leaderboard during live GW

**Current**: Leaderboard shows nothing for the active GW until aggregation.

**Change**: Show provisional rankings based on live running totals:
- Label: **"Live Standings"** (vs **"Final Standings"** after aggregation)
- Sort by running total descending
- Subtext: *"Provisional — bench subs and chips not yet applied"*

### Files for Phase 6

| File | Action | Purpose |
|------|--------|---------|
| `app/api/teams/[teamId]/scores/live/[gameweekId]/route.ts` | CREATE | Live running total API |
| `app/page.tsx` | MODIFY | Fall back to live scores when no GameweekScore |
| `app/page.tsx` | MODIFY | "LIVE" badge + provisional label on dashboard |
| `app/api/leaderboard/[leagueId]/route.ts` | MODIFY | Include live running totals for active GW |

---

## Updated Files Summary

| File | Action | Purpose |
|------|--------|---------|
| `lib/app-admin.ts` | CREATE | `isAppAdmin()` helper |
| `lib/sync-players.ts` | CREATE | Shared sync logic extracted from CLI script |
| `app/api/admin/sync-players/route.ts` | CREATE | GET (dry run) + POST (apply) |
| `app/api/user/is-app-admin/route.ts` | CREATE | Client-side nav check |
| `app/app-admin/page.tsx` | CREATE | App admin dashboard UI |
| `app/api/teams/[teamId]/scores/live/[gameweekId]/route.ts` | CREATE | Live mid-GW running totals |
| `app/api/scoring/import/route.ts` | MODIFY | Use `isAppAdmin()` |
| `app/api/scoring/recalculate/[matchId]/route.ts` | MODIFY | Use `isAppAdmin()` |
| `app/api/scoring/cancel/[matchId]/route.ts` | MODIFY | Use `isAppAdmin()` |
| `app/components/AppFrame.tsx` | MODIFY | Conditional App Admin nav link |
| `lib/scoring/pipeline.ts` | MODIFY | Remove 4-match limit |
| `scripts/reseed-player-teams.ts` | MODIFY | Refactor to use `lib/sync-players.ts` |
| `app/page.tsx` | MODIFY | Live score fallback + LIVE badge |
| `app/api/leaderboard/[leagueId]/route.ts` | MODIFY | Live standings for active GW |

**No schema changes. No migration. No build command changes.**

---

## Verification Plan

### Manual Testing

1. **Auth guard**: Navigate to `/app-admin` as a regular user → redirected to `/`
2. **Auth guard**: Navigate to `/app-admin` as viiveek@gmail.com → page loads
3. **Nav visibility**: Regular user sees no "App Admin" link. App admin sees it.
4. **Import Scores — nothing to do**: Click when all matches are Scored → grey toast
5. **Import Scores — success**: Mark a match as COMPLETED in DB, click → green toast, pill updates
6. **Import Scores — error**: Simulate API failure → red toast, Error pill shown
7. **Recalculate**: Click "Recalculate" on Error match → match resets and re-scores
8. **Sync — no changes**: Click Check for Updates when all teams are current → green check
9. **Sync — changes found**: After a player trade in API → changes table shown
10. **Sync — apply**: Click Apply Changes → confirmation modal → green toast → table clears
11. **Sync — error**: Disconnect network, click Apply → red toast, table stays for retry

12. **Live scores — in progress**: During an active GW with 3/7 matches scored → dashboard shows "Live • 3/7 matches scored" with running total
13. **Live scores — captain 2x**: Captain's points doubled in live running total
14. **Live scores — no data**: GW with 0 scored matches → shows "0" with "Live • 0/7 matches scored"
15. **Live → Final transition**: After full GW aggregation → "LIVE" badge disappears, final score with bench subs + chips shown
16. **Live leaderboard**: During active GW → shows "Live Standings" label with provisional rankings

### Automated Testing

Covered by the TDD test suite (layers 6-9) in `docs/test-coverage-matrix.md`.

---

## Open Questions

1. **Should the cron frequency increase?** Currently once daily at midnight UTC. More frequent would catch missed matches faster, but Vercel Hobby only allows 1 daily cron. **Recommendation**: keep as-is since admin button is the primary trigger, cron is just a safety net.

2. **Should admin get push notifications when matches finish?** Would eliminate the need to manually check. **Recommendation**: defer — out of scope for this PR.
