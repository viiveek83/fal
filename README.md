# FAL — Fantasy Auction League

Private IPL fantasy league platform for friends. Season-long squads built via auction, weekly lineup management, automated scoring from live IPL data, and strategy chips.

## Quick Start

### Prerequisites

- **Node.js 20+** — `brew install node`
- **PostgreSQL 16+** — `brew install postgresql@16 && brew services start postgresql@16`

### Setup

```bash
# Clone
git clone https://github.com/Fantasy-Auction-League/fal.git
cd fal

# Install dependencies
npm install

# Create database
createdb fal

# Set up environment
cp .env.example .env.local
# Edit .env.local with your DATABASE_URL and SPORTMONKS_API_TOKEN
```

### Environment Variables (`.env.local`)

```env
DATABASE_URL="postgresql://YOUR_USERNAME@localhost/fal"
AUTH_SECRET="any-secret-string-for-dev"
AUTH_URL="http://localhost:3000"
SPORTMONKS_API_TOKEN="your-sportmonks-api-token"
SPORTMONKS_SEASON_ID="1795"
SPORTMONKS_LEAGUE_ID="1"
CRON_SECRET="any-cron-secret"
```

> Replace `YOUR_USERNAME` with your macOS username (run `whoami` to check).

### Initialize

```bash
# Push database schema
npx prisma db push

# Seed 250 IPL 2026 players from SportMonks
npm run seed:players

# Seed IPL fixtures and gameweeks
npm run seed:fixtures

# Start the dev server
npm run dev
```

Open **http://localhost:3000** — sign in with any email (no password in dev mode).

### First-Time Flow

1. **Login** — Enter your email (e.g., `viiveek@fal.com`)
2. **Create League** — Go to `/admin`, type a league name
3. **Upload Roster** — Upload a CSV file with team rosters (see format below)
4. **View Teams** — Click any team to see their squad
5. **Start Season** — Click "Start Season" when all rosters are ready
6. **Set Lineup** — Go to `/lineup` to pick your Playing XI, Captain, and VC

### CSV Roster Format

```csv
managerEmail,teamName,playerName,purchasePrice
viiveek@fal.com,Viiveeks XI,Jasprit Bumrah,18.5
viiveek@fal.com,Viiveeks XI,Rohit Sharma,15.0
rohit@fal.test,Rohits Rockets,Virat Kohli,16.0
```

A sample 10-team roster is included: `sample-roster-10teams.csv`

## Running Tests

```bash
npm test                  # All 97 tests
npm run test:unit         # 67 unit tests (scoring engine)
npm run test:integration  # 19 integration tests (DB + API)
npm run test:e2e          # 11 E2E tests (full season flow)
npm run test:watch        # Watch mode
```

## Pages

| Route | Page | Description |
|-------|------|-------------|
| `/` | Dashboard | GW scores, standings, match schedule |
| `/lineup` | Lineup Builder | Pick XI, captain, VC, bench order |
| `/players` | Player Browser | Search/filter all 250 IPL players |
| `/leaderboard` | Leaderboard | Podium, rankings, GW history |
| `/standings` | Full Standings | Season table with GW selector |
| `/admin` | League Admin | Create league, upload roster, manage teams |
| `/view-lineup/[teamId]` | View Lineup | Read-only view of another manager's team |

## API Routes

### Leagues
- `POST /api/leagues` — Create league
- `GET /api/leagues` — List your leagues
- `POST /api/leagues/[id]/join` — Join via invite code
- `POST /api/leagues/[id]/roster` — Upload CSV roster (admin)

### Teams & Lineups
- `GET /api/teams/[id]/squad` — Team player list
- `GET/PUT /api/teams/[id]/lineups/[gwId]` — Get/submit lineup
- `POST/DELETE /api/teams/[id]/lineups/[gwId]/chip` — Activate/deactivate chip

### Scoring
- `POST /api/scoring/import` — Trigger scoring pipeline (admin)
- `GET /api/scoring/status` — Match scoring statuses
- `POST /api/scoring/recalculate/[matchId]` — Re-score a match
- `POST /api/scoring/cancel/[matchId]` — Cancel abandoned match

### Data
- `GET /api/players` — Search/filter players
- `GET /api/players/[id]` — Player detail + stats
- `GET /api/leaderboard/[leagueId]` — Standings
- `GET /api/gameweeks/current` — Current gameweek + matches

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 + React 19 + TypeScript |
| Styling | Tailwind CSS 4 + Plus Jakarta Sans |
| Backend | Next.js API Routes |
| Database | PostgreSQL (local dev) / Neon (production) |
| ORM | Prisma |
| Auth | Auth.js v5 (credentials) |
| Cricket Data | SportMonks Cricket API |
| Testing | Vitest (97 tests) |
| Deployment | Vercel (Hobby) |

## Project Structure

```
fal/
├── app/                    # Next.js App Router (pages + API routes)
├── lib/
│   ├── scoring/            # Fantasy points engine (batting, bowling, fielding, multipliers, pipeline)
│   ├── sportmonks/         # SportMonks API client (fixtures, types, utils)
│   ├── lineup/             # Lineup validation + lock
│   ├── auth.ts             # Auth.js v5 config
│   └── db.ts               # Prisma client (env-aware: local PG / Neon)
├── prisma/schema.prisma    # Database schema (13 tables)
├── scripts/                # Seed scripts + legacy tests
├── tests/                  # Vitest test suite (unit / integration / e2e)
├── docs/                   # Design specs, mockups, architecture docs
└── vercel.json             # Cron config
```

## Design Mockups

Preview the HTML mockups without the full app:

```bash
node server.js
# Open http://localhost:64472
```

## Docs

- [PRD](docs/superpowers/specs/2026-03-22-fal-prd.md) — Product requirements
- [Player Guide](docs/superpowers/specs/2026-03-22-fal-player-guide.md) — How to play
- [Architecture](docs/superpowers/specs/2026-03-15-fal-architecture.md) — System design
- [Implementation Plan](docs/superpowers/specs/2026-03-22-fal-implementation-plan.md) — Build spec
- [API Exploration](docs/superpowers/specs/2026-03-22-sportmonks-api-exploration.md) — SportMonks field validation
