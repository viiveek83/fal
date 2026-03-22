# FAL — Implementation Plan

## 1. Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node.js | 20+ | `brew install node` or [nodejs.org](https://nodejs.org) |
| npm | 10+ | Bundled with Node.js |
| PostgreSQL | 16+ (or use Neon) | `brew install postgresql@16` or use Neon free tier |
| Git | 2.40+ | `brew install git` |
| Vercel CLI | 50+ | `npm install -g vercel` |

## 2. Local Setup

```bash
# 1. Clone the repo
git clone https://github.com/Fantasy-Auction-League/fal.git
cd fal

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local
```

### Environment Variables (`.env.local`)

```env
# Database — Neon (pooled connection for runtime queries)
DATABASE_URL="postgresql://user:pass@ep-xxx.region.neon.tech/fal?sslmode=require&pgbouncer=true&connection_limit=1"
# Database — Neon (direct connection for migrations — bypasses pgBouncer)
DIRECT_URL="postgresql://user:pass@ep-xxx.region.neon.tech/fal?sslmode=require"

# Auth.js v5
AUTH_URL="http://localhost:3000"
AUTH_SECRET="generate-with-openssl-rand-base64-32"
# AUTH_GOOGLE_ID="your-google-client-id"       # optional — OAuth
# AUTH_GOOGLE_SECRET="your-google-secret"       # optional — OAuth

# SportMonks Cricket API (€29/mo Major plan)
SPORTMONKS_API_TOKEN="your-api-token"

# IPL 2026 Season (validated)
SPORTMONKS_SEASON_ID="1795"
SPORTMONKS_LEAGUE_ID="1"

# Vercel Cron (auto-set by Vercel in production)
CRON_SECRET="generate-a-random-secret-for-cron-auth"
```

### Prisma Configuration

In `prisma/schema.prisma`:
```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["driverAdapters"]
}
```

`DATABASE_URL` (pooled, via pgBouncer) → Prisma Client at runtime.
`DIRECT_URL` (direct) → `prisma migrate` and `prisma db push`. **Without this, migrations fail on Neon.**

### Database Init

```bash
# 4. Initialize the database
npx prisma generate
npx prisma db push

# 5. Seed IPL players (from SportMonks)
npm run seed:players

# 6. Start the dev server
npm run dev
```

App runs at [http://localhost:3000](http://localhost:3000).

## 3. Environment Setup Notes

### Neon (recommended for dev)
- Create a free project at [neon.tech](https://neon.tech)
- Copy the **pooled** connection string into `DATABASE_URL` (add `?pgbouncer=true&connection_limit=1`)
- Copy the **direct** connection string into `DIRECT_URL` (for migrations)
- Install the serverless driver (WebSocket-based, avoids 40MB Prisma engine, reduces cold starts):
  ```bash
  npm install @neondatabase/serverless @prisma/adapter-neon
  ```
- Auto-suspends after 5 min idle (~1-3s cold start)

### Local PostgreSQL (alternative)
```bash
brew install postgresql@16
brew services start postgresql@16
createdb fal
# DATABASE_URL="postgresql://localhost/fal"
# No DIRECT_URL needed for local PG
```

### Auth.js v5 (NextAuth v5)
- Generate a secret: `openssl rand -base64 32` → set as `AUTH_SECRET`
- Auth.js v5 uses `AUTH_SECRET` and `AUTH_URL` (NOT the old `NEXTAUTH_*` env vars)
- OAuth providers: create apps, set `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET` etc.
- Credentials-based auth works without OAuth
- v5 pattern for Next.js App Router:
  ```
  lib/auth.ts                            → NextAuth() config, exports { auth, handlers, signIn, signOut }
  app/api/auth/[...nextauth]/route.ts    → export { GET, POST } from "@/lib/auth"
  middleware.ts                           → export { auth as middleware } from "@/lib/auth"
  ```

### SportMonks API
- Sign up at [sportmonks.com](https://www.sportmonks.com) (14-day free trial, then €29/mo)
- API token: Dashboard → Settings → API Tokens
- Rate limit: 3,000 calls/hr (FAL needs ~5 per match day)

### Prisma Client Singleton (`lib/db.ts`)

```typescript
import { PrismaClient } from '@prisma/client'
import { Pool, neonConfig } from '@neondatabase/serverless'
import { PrismaNeon } from '@prisma/adapter-neon'
import ws from 'ws'

// Required for serverless environments
neonConfig.webSocketConstructor = ws

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

function createPrismaClient() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const adapter = new PrismaNeon(pool)
  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma || createPrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

## 4. Project Structure

```
fal/
├── app/                    # Next.js App Router
│   ├── api/                # API routes (serverless functions)
│   │   ├── auth/[...nextauth]/route.ts  # Auth.js v5 handler
│   │   ├── leagues/        # League CRUD + join
│   │   ├── teams/          # Team + lineup management
│   │   ├── scoring/
│   │   │   ├── import/route.ts   # POST — admin trigger
│   │   │   ├── cron/route.ts     # GET — Vercel cron trigger
│   │   │   ├── recalculate/[matchId]/route.ts
│   │   │   ├── cancel/[matchId]/route.ts
│   │   │   ├── force-end-gw/[gameweekId]/route.ts
│   │   │   └── status/route.ts
│   │   ├── admin/          # Season init
│   │   ├── leaderboard/    # Rankings
│   │   ├── players/        # Player search
│   │   └── gameweeks/      # GW info
│   ├── (auth)/             # Route group — login, register
│   ├── dashboard/
│   │   ├── page.tsx
│   │   └── loading.tsx     # Skeleton UI
│   ├── lineup/
│   │   ├── page.tsx
│   │   └── loading.tsx
│   ├── players/
│   │   ├── page.tsx
│   │   └── loading.tsx
│   ├── league/
│   │   ├── page.tsx
│   │   └── loading.tsx
│   ├── layout.tsx          # Root layout (nav, providers)
│   ├── error.tsx           # Global error boundary
│   ├── loading.tsx         # Global loading skeleton
│   └── not-found.tsx       # 404 page
├── middleware.ts            # Auth.js v5 edge middleware
├── lib/
│   ├── scoring/            # Fantasy points engine
│   │   ├── batting.ts      # Batting points + SR bonus
│   │   ├── bowling.ts      # Bowling points + ER bonus
│   │   ├── fielding.ts     # Catches, stumpings, runouts
│   │   ├── multipliers.ts  # C/VC/chip effects
│   │   └── pipeline.ts     # Full scoring flow (shared by import + cron)
│   ├── lineup/             # Lineup validation service
│   │   ├── validation.ts   # Squad/XI rules, role constraints
│   │   └── lock.ts         # Lineup lock timing
│   ├── sportmonks/         # SportMonks API client
│   │   ├── client.ts       # HTTP client with auth + timeout
│   │   ├── fixtures.ts     # Fixture + scorecard fetching
│   │   ├── players.ts      # Player/squad fetching
│   │   └── types.ts        # API response types
│   ├── auth.ts             # Auth.js v5 config
│   └── db.ts               # Prisma singleton (Neon serverless adapter)
├── prisma/
│   └── schema.prisma       # Database schema (url + directUrl)
├── vercel.json             # Cron config + deployment settings
├── docs/                   # Design specs + mockups
├── server.js               # Mockup preview server
├── .env.local              # Local environment (git-ignored)
└── package.json
```

## 5. Data Freshness Strategy (Vercel Hobby — no WebSockets)

| Page | Strategy | Rationale |
|---|---|---|
| Dashboard | Server components `revalidate: 300` + SWR `refreshInterval: 60000` for scores | Scores change on admin trigger only |
| Lineup | Fetch on demand, no polling | User's own data |
| Leaderboard | Server component `revalidate: 300` | Updates at GW end only |
| Admin scoring | SWR `refreshInterval: 10000` | Admin sees pipeline progress |
| Player market | Server component `revalidate: 3600` | Stats change after GW end |

Key: scoring runs on admin trigger — no "live" data. `revalidateOnFocus: true` suffices.

## 6. Deployment (Vercel CLI)

### First-Time Setup

```bash
# 1. Login to Vercel
vercel login

# 2. Link project (from repo root)
vercel link
# Select your team/account → create new project → link to Git repo

# 3. Set environment variables
vercel env add DATABASE_URL production
vercel env add DIRECT_URL production
vercel env add AUTH_SECRET production
vercel env add AUTH_URL production        # e.g., https://fal.vercel.app
vercel env add SPORTMONKS_API_TOKEN production
vercel env add SPORTMONKS_SEASON_ID production
vercel env add SPORTMONKS_LEAGUE_ID production
# CRON_SECRET is auto-generated by Vercel for cron auth

# 4. Deploy to preview
vercel

# 5. Deploy to production
vercel --prod
```

### Vercel Configuration (`vercel.json`)

```json
{
  "crons": [{
    "path": "/api/scoring/cron",
    "schedule": "0 0 * * *"
  }]
}
```

### Ongoing Deployments

```bash
# Preview deployment (from any branch)
vercel

# Production deployment
vercel --prod

# Check deployment status
vercel ls

# View logs
vercel logs <deployment-url>

# Pull remote env vars to local .env
vercel env pull .env.local
```

### Git-Based Auto-Deploy

Once linked, Vercel auto-deploys:
- **Push to `main`** → production deployment
- **Push to any other branch** → preview deployment
- **PR created** → preview deployment with unique URL

### Vercel Hobby Limits to Know

| Limit | Value |
|---|---|
| Function duration | 60s max |
| Response body | 4.5MB max |
| Cron jobs | 1 total |
| Bandwidth | 100 GB/mo |
| Deployments | Unlimited |
| Custom domains | 1 per project |

## 7. Design Mockup Server

Preview UI mockups without the full Next.js app:

```bash
node server.js
```

[http://localhost:64472](http://localhost:64472) — Routes: `/`, `/lineup`, `/leaderboard`, `/admin`, `/players`, `/scores`, `/standings`, `/view-lineup`

## 8. Common Dev Commands

```bash
npm run dev              # Next.js dev server (localhost:3000)
npm run build            # Production build
npm run lint             # ESLint
npx prisma studio        # Visual DB browser (localhost:5555)
npx prisma db push       # Push schema to database
npx prisma generate      # Regenerate Prisma client
npx prisma migrate dev   # Create + apply migration
npm run seed:players     # Import IPL 2026 players from SportMonks
npm run seed:fixtures    # Import IPL 2026 fixtures from SportMonks
node server.js           # Mockup preview (localhost:64472)
vercel                   # Preview deployment
vercel --prod            # Production deployment
vercel env pull          # Sync Vercel env vars to local
```

## 9. Database Schema

### Entities

- **User** — `email`, `name`, `image`, `role` (enum: `USER`/`ADMIN`).
- **League** — `adminUserId` (creator), `inviteCode`, `name`, settings.
- **Team** — `name`, `totalPoints` (incremental — updated at GW end).
- **TeamPlayer** — `leagueId`, `playerId`, `purchasePrice` (from CSV upload).
- **Player** — `apiPlayerId` (SportMonks ID), `fullname`, `iplTeamId`, `role` (BAT/BOWL/ALL/WK), `battingStyle`, `bowlingStyle`, `imageUrl`.
- **Gameweek** — `number` (1-10), `lockTime` (DateTime), `status` (`upcoming`/`active`/`completed`), `aggregationStatus` (`pending`/`aggregating`/`done`).
- **Match** — `apiMatchId`, `gameweekId`, `localTeamId`, `visitorTeamId`, `startingAt`, `apiStatus` (`NS`/`Finished`/`Cancelled`), `scoringStatus` (`scheduled`/`completed`/`scoring`/`scored`/`error`), `note` (result text), `winnerTeamId`, `scoringAttempts` (Int, default 0).
- **Lineup** — `teamId`, `gameweekId`.
- **LineupSlot** — `lineupId`, `playerId`, `slotType` (XI/BENCH), `benchPriority` (1-4, null for XI), `role` (CAPTAIN/VC/TRIPLE_CAPTAIN/null).
- **PlayerPerformance** — Per-player per-match:
  - Batting: `runs`, `balls`, `fours`, `sixes`, `strikeRate`, `wicketId`
  - Bowling: `overs`, `maidens`, `runsConceded`, `wickets`, `economyRate`, `dotBalls`
  - Fielding: `catches`, `stumpings`, `runoutsDirect`, `runoutsAssisted`
  - Computed: `fantasyPoints` (base points, before multipliers)
  - Meta: `inStartingXI` (boolean), `isImpactPlayer` (boolean)
- **PlayerScore** — Per-player per-GW aggregate (after C/VC multipliers + chip effects).
- **ChipUsage** — `teamId`, `chipType` (`TRIPLE_CAPTAIN`/`BENCH_BOOST`/`BAT_BOOST`/`BOWL_BOOST`), `gameweekId`, `status` (`pending`/`used`).

### Relationships
```
User 1→N Team, League 1→N Team, Team 1→N TeamPlayer, Player 1→N TeamPlayer
Team 1→N Lineup, Lineup 1→N LineupSlot
Gameweek 1→N Match, Match 1→N PlayerPerformance, PlayerPerformance N→1 Player
Team 1→N ChipUsage
```

### Uniqueness Constraints
- `TeamPlayer`: unique(`leagueId`, `playerId`)
- `Lineup`: unique(`teamId`, `gameweekId`)
- `ChipUsage`: unique(`teamId`, `chipType`)
- `LineupSlot`: unique(`lineupId`, `playerId`)

### Required Indexes
- `Match(scoringStatus)` — optimistic lock claim
- `Match(gameweekId, scoringStatus)` — GW-end check
- `PlayerPerformance(playerId, matchId)` — upsert key
- `PlayerPerformance(matchId)` — per-match lookups
- `Player(role, iplTeamId)` — player search/filter
- `Team(leagueId)` — leaderboard queries
- `Gameweek(status)` — current GW lookup

## 10. API Routes

All routes require Auth.js session unless noted. **Platform admin** = `User.role === 'ADMIN'`. **League admin** = `league.adminUserId === session.userId`. **Owner** = `team.userId === session.userId`.

**Standard error responses:** `401` (unauthenticated), `403` (forbidden), `404` (not found), `409` (conflict), `422` (validation), `423` (locked).

### Auth
- `GET/POST /api/auth/[...nextauth]` — Auth.js v5 handler (public)

### Leagues
- `POST /api/leagues` — Create league (caller = league admin)
- `GET /api/leagues` — List user's leagues
- `GET /api/leagues/[id]` — League detail **(member)**
- `GET /api/leagues/[id]/teams` — Teams in league **(member)**
- `POST /api/leagues/[id]/join` — Join via invite code
- `PUT /api/leagues/[id]/settings` — Update settings **(league admin)**
- `DELETE /api/leagues/[id]/managers/[userId]` — Remove manager **(league admin)**

### Teams
- `GET /api/teams/[teamId]` — Team detail **(owner or member)**
- `GET /api/teams/[teamId]/squad` — Player list **(owner or member)**
- `POST /api/leagues/[id]/roster` — CSV roster upload **(league admin)**

### Lineups
- `GET /api/teams/[teamId]/lineups/[gameweekId]` — Get lineup **(owner)**
- `PUT /api/teams/[teamId]/lineups/[gameweekId]` — Submit/update lineup, 423 if locked **(owner)**
- `POST /api/teams/[teamId]/lineups/[gameweekId]/chip` — Activate chip, 409 if used **(owner)**
- `DELETE /api/teams/[teamId]/lineups/[gameweekId]/chip` — Deactivate chip before lock **(owner)**

### Scoring
- `GET /api/leagues/[leagueId]/scores/[gameweekId]` — GW scores for league **(member)**
- `GET /api/teams/[teamId]/scores/[gameweekId]` — Per-player breakdown **(owner or member)**
- `POST /api/scoring/import` — Trigger scoring pipeline **(platform admin)**
- `GET /api/scoring/cron` — Vercel cron trigger (protected by `CRON_SECRET`) **(cron only)**
- `POST /api/scoring/recalculate/[matchId]` — Re-score a match **(platform admin)**
- `POST /api/scoring/cancel/[matchId]` — Cancel abandoned match **(platform admin)**
- `POST /api/scoring/force-end-gw/[gameweekId]` — Force GW aggregation **(platform admin)**
- `GET /api/scoring/status` — Match scoring statuses **(platform admin)**

### Season Admin
- `POST /api/admin/season/init` — Import fixtures from SportMonks **(platform admin, one-time)**

### Leaderboard
- `GET /api/leaderboard/[leagueId]` — Standings **(member)**
- `GET /api/leaderboard/[leagueId]/history` — GW-by-GW history **(member)**

### Players
- `GET /api/players?role=BAT&team=MI&page=1&limit=25` — Search/filter **(authenticated)**
- `GET /api/players/[id]` — Player detail **(authenticated)**

### Gameweeks
- `GET /api/gameweeks/current` — Current GW info **(authenticated)**
- `GET /api/gameweeks` — All GWs with status **(authenticated)**

## 11. Scoring Pipeline

### Triggers
- **Primary:** Admin taps "Import Scores" → `POST /api/scoring/import`
- **Safety net:** Daily cron at midnight → `GET /api/scoring/cron`

```json
// vercel.json
{ "crons": [{ "path": "/api/scoring/cron", "schedule": "0 0 * * *" }] }
```

### Pipeline Flow (`lib/scoring/pipeline.ts`)

```
1. Early exit: if any match has scoringStatus = 'scoring', return 409

2. Claim matches (raw SQL — NOT Prisma update()):
   $queryRaw`UPDATE "Match" SET "scoringStatus" = 'scoring'
     WHERE "scoringStatus" = 'completed'
     ORDER BY "startingAt" ASC LIMIT 4
     RETURNING id`
   → No rows → exit

3. For each claimed match (try/catch):
   try {
     a. GET /fixtures/{id}?include=batting,bowling,lineup[,balls] (10s timeout)
     b. Validate response (batting/bowling arrays exist)
     c. Parse batting → runs, fours, sixes, SR, fielding attribution
     d. Parse bowling → wickets, overs, maidens, ER (+ dot balls in-memory)
     e. Compute fantasyPoints per player (base, no multipliers)
     f. Batch upsert PlayerPerformance:
        $executeRaw`INSERT INTO "PlayerPerformance" (...)
          VALUES (...), (...), ...
          ON CONFLICT ("playerId", "matchId") DO UPDATE SET ...`
     g. Set Match.scoringStatus = 'scored'
   } catch {
     h. Reset Match.scoringStatus = 'completed'
     i. Increment scoringAttempts; if >= 3 → set 'error'
   }

4. GW end check (atomic lock):
   $queryRaw`UPDATE "Gameweek" SET "aggregationStatus" = 'aggregating'
     WHERE id = ? AND "aggregationStatus" = 'pending'
     AND NOT EXISTS (
       SELECT 1 FROM "Match"
       WHERE "gameweekId" = ?
       AND "scoringStatus" NOT IN ('scored', 'error', 'cancelled')
     )
     RETURNING id`
   → No rows → GW not complete, exit

5. If GW claimed:
   a. Aggregate PlayerPerformance.fantasyPoints across GW matches per player
   b. Apply bench auto-substitutions
      (player "played" = appears in lineup include of ANY match in GW)
   c. Apply captain (2x), VC (1.5x), Triple Captain (3x) multipliers
   d. Apply chip effects (multiplicative with captain)
   e. Incremental leaderboard: UPDATE "Team" SET "totalPoints" += gwPoints
   f. Set Gameweek.aggregationStatus = 'done'
```

### State Machine
```
scheduled → completed → scoring → scored
                ↑           |         |
                |    (fail) ↓         |
                ←── (retry) ←─────────┘ (re-score)
                         ↓
                    error (after 3 attempts)
                         ↓
                    cancelled (admin, for abandoned matches)
```

### Error Recovery
- Failed API call → reset to `completed` for retry
- 3 failures → set `error`, admin notified
- Stuck in `scoring` > 5 min → cron resets to `completed`
- Cancelled match → admin sets `cancelled` (excluded from GW-end check)
- Force end GW → admin triggers aggregation regardless of match statuses

### Timing Budget
| Step | Time |
|---|---|
| Vercel + Neon cold start | ~2-4s |
| SportMonks API call | ~1-2s/match |
| Parse + compute | <100ms |
| Batch SQL upsert (~30 rows) | ~100ms |
| GW aggregation (15 teams) | ~2-3s |
| **4 matches + GW end** | **~25-35s** (within 60s) |

### Critical Implementation Notes
- **Use `$queryRaw` / `$executeRaw`** for match claims, GW claims, and batch upserts. Prisma's ORM doesn't support `UPDATE...RETURNING` or efficient batch upserts.
- **Don't store ball-by-ball data.** Compute dot balls in-memory during scoring, store only `dotBalls` integer on PlayerPerformance. If re-scoring needed, re-fetch from SportMonks.
- **Vercel cron sends GET**, not POST. The cron route (`/api/scoring/cron`) must be a GET handler that calls the same `runScoringPipeline()` function.
- **Season init and seed scripts must share code** — fixture import logic lives in `lib/sportmonks/fixtures.ts`, called by both `POST /api/admin/season/init` and `npm run seed:fixtures`.

## Related Documents
- [Architecture](2026-03-15-fal-architecture.md) — High-level system design, diagrams, cost summary
- [API Exploration](2026-03-22-sportmonks-api-exploration.md) — SportMonks field validation, gap analysis
- [Design Spec](2026-03-15-fal-design.md) — Scoring rules, chips, lineup mechanics, UI designs
- [PRD](2026-03-22-fal-prd.md) — Product requirements
