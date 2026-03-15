# FAL — Technical Architecture

## 1. Architecture Overview (Phase 1)

### Monolithic Next.js:
- Single Next.js app on Vercel
- API routes for backend logic
- React frontend (mobile-first)
- PostgreSQL (Vercel Postgres or Neon) + Prisma ORM
- Auth.js for authentication (OAuth + credentials)
- Vercel Cron for match data polling

### Tech Stack:
| Layer | Technology |
|---|---|
| Frontend | Next.js + React + TypeScript |
| Styling | Tailwind CSS |
| Backend | Next.js API Routes |
| Database | PostgreSQL (Vercel Postgres or Neon) |
| ORM | Prisma |
| Auth | Auth.js (OAuth + credentials) |
| Deployment | Vercel |
| Cron | Vercel Cron Jobs |

## 2. Core Services

All services run within the Next.js monolith as modules:

1. **Match Import Service** — Polls cricket API, stores raw match data
2. **Stat Parser** — Extracts player performance stats from raw data
3. **Fantasy Points Engine** — Applies scoring rules, calculates base points
4. **Gameweek Aggregator** — Bench subs, multipliers, chips, team totals
5. **Leaderboard Service** — Rankings, season totals, history

### Service Flow:
```
Cricket Data API → Match Import Service → Raw Match Data Storage
    → Stat Parser → Fantasy Points Engine → Gameweek Aggregator
    → Leaderboard Service
```

## 3. Database Entities

- **User** — Platform user (auth)
- **League** — Fantasy competition container
- **Team** — Manager's team within a league
- **Player** — Real IPL player (from API)
- **Lineup** — Weekly playing XI selection
- **Gameweek** — Weekly scoring period
- **PlayerPerformance** — Raw match statistics
- **PlayerScore** — Calculated fantasy points
- **ChipUsage** — Which chips used in which gameweek

### Entity Relationships:
```
User 1──N Team
League 1──N Team
Team 1──N Lineup
League 1──N Gameweek
Gameweek 1──N PlayerPerformance
Gameweek 1──N PlayerScore
Player 1──N PlayerPerformance
Player 1──N PlayerScore
Team 1──N ChipUsage
Gameweek 1──N ChipUsage
```

## 4. Data Ingestion

### Pipeline:
Cricket Data API → Match Import Service → Raw Match Data Storage → Stat Parser → Fantasy Points Engine → Gameweek Aggregator → Leaderboard Service

### API Strategy:
- **Primary:** CricketData.org (free tier: 100 req/day) or SportMonks (€29/mo with 14-day trial)
- **Evaluation needed** as part of implementation — both provide the required stats
- **Fallback:** Admin can manually input match stats if API is unavailable

### Required Stats from API:
- Runs scored, Fours hit, Sixes hit, Balls faced
- Wickets taken, Dot balls bowled, Maiden overs
- Catches taken, Runouts effected, Stumpings
- Did player bat? (for duck rule)
- Did player play? (for bench substitution)

### Ingestion Trigger:
Phase 1: Cron job polls the API periodically during match days (e.g., every 30 min). Detects completed matches and triggers the scoring pipeline. Admin can also manually trigger a re-import.

## 5. Scoring Pipeline

### Processing Order:
1. Import match stats from cricket API
2. Calculate base fantasy points per player per match
3. Aggregate player points across all matches in the gameweek
4. Apply bench auto-substitutions (end of gameweek)
5. Apply captain/VC multipliers
6. Apply chip effects (multiplicative with captain)
7. Sum team total for the gameweek
8. Update leaderboard

## 6. API Routes (Phase 1)

### Auth:
- `POST /api/auth/[...nextauth]` — Auth.js handler

### Leagues:
- `POST /api/leagues` — Create league
- `GET /api/leagues` — List user's leagues
- `POST /api/leagues/[id]/join` — Join via invite code
- `POST /api/leagues/[id]/roster` — Upload roster (admin)

### Lineups:
- `GET /api/lineups/[gameweekId]` — Get current lineup
- `PUT /api/lineups/[gameweekId]` — Submit/update lineup
- `POST /api/lineups/[gameweekId]/chip` — Activate chip

### Scoring:
- `GET /api/scores/[gameweekId]` — Get gameweek scores
- `POST /api/scoring/import` — Trigger match import (admin)

### Leaderboard:
- `GET /api/leaderboard/[leagueId]` — Get league standings

### Players:
- `GET /api/players` — List/search players
- `GET /api/players/[id]` — Player detail + stats

## 7. Future Architecture (Phase 2+)

### Auction Engine:
- Real-time bidding with WebSockets
- $100M manager budget, $1M starting price, $0.5M bid increment
- 10-second timer (reset on each bid)
- Bid validation: remaining budget must allow filling remaining roster at $1M each
- Anti-sniping, auto-bid, reconnect handling

### Mid-Season Auction:
- After 30 IPL matches
- Managers can sell players back (90% market value) and bid for replacements

### Market System:
- Dynamic player pricing based on performance
- Price history graphs

### Engagement Features:
- Power rankings, player analytics
- Trade analyzer, AI lineup suggestions
