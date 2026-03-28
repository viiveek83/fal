# Human Test Plan: Live Mid-Gameweek Scores

## Prerequisites
- Local development environment running (`npm run dev`)
- Database seeded with at least one league, multiple teams, and an active gameweek
- At least one match in the active gameweek marked as `SCORED` with player performances
- At least one team has a chip (POWER_PLAY_BAT or BOWLING_BOOST) activated for the active gameweek
- Unit and integration tests passing: `npx vitest run tests/unit tests/integration`

## Phase 1: Live GW Card on Dashboard (AC13.x)

| Step | Action | Expected |
|------|--------|----------|
| 1 | Sign in as a user who has a team with a submitted lineup for the active gameweek. Navigate to the dashboard (`/`). | Dashboard loads without errors. |
| 2 | Locate the live GW card below the season total hero section. | A card appears showing the current gameweek's running total. The card displays below the main season total section. |
| 3 | Verify the running total number on the card. | The number matches the value returned by `GET /api/teams/{teamId}/scores/{gameweekId}` -- specifically the `totalPoints` field. |
| 4 | Verify match progress indicator on the card. | Card shows text like "N/M matches" (e.g., "4/7 matches") matching the `matchesScored`/`matchesTotal` from the API response. |
| 5 | If the team has an active chip, verify chip badge on the card. | Chip badge displays the chip name (e.g., "Power Play Bat") and shows the bonus points amount. |
| 6 | Finalize the gameweek by running the settlement process (or creating a GameweekScore record in the DB). Reload the dashboard. | Card now shows "FINAL" badge with the settled score. No match progress or chip estimate is displayed. |
| 7 | Sign in as a user whose team has no lineup for the current GW. Navigate to the dashboard. | An empty state message appears: "No lineup submitted for GW N" (where N is the gameweek number). |

## Phase 2: GW Detail Sheet (AC14.x)

| Step | Action | Expected |
|------|--------|----------|
| 1 | Sign in as a user with a team that has POWER_PLAY_BAT chip active. Tap/click on the live GW card to open the detail sheet. | Detail sheet opens showing per-player breakdown. |
| 2 | Locate a BAT-role player in the XI. | The row shows the base-to-boosted format: "basePoints -> multipliedPoints" (e.g., "45 -> 90"). |
| 3 | Locate a non-BAT player (e.g., BOWL or ALL) in the XI. | The row shows only the multipliedPoints value without the arrow format, since the chip does not apply. |
| 4 | Locate the captain (who is BAT). | The row shows captain 2x applied first, then chip 2x stacking. E.g., base 20 -> captain 40 -> chip bonus 40, total contribution 80. |
| 5 | Verify chip badge at the top of the detail sheet. | A badge at the top of the sheet displays the chip name ("Power Play Bat") and the total chip bonus points. |

## Phase 3: Live/Final Status Indicators (AC15.x)

| Step | Action | Expected |
|------|--------|----------|
| 1 | Navigate to the dashboard during an active gameweek (at least one match SCORED, GW not settled). | A green dot with pulsing CSS animation appears alongside "LIVE" text. |
| 2 | Observe the pulsing animation for 3-5 seconds. | The animation is smooth, does not stutter or freeze. The dot pulses rhythmically. |
| 3 | Finalize the gameweek. Reload the dashboard. | A static "FINAL" badge replaces the pulsing dot. No animation is present. |

## Phase 4: Standings Page (AC16.x)

| Step | Action | Expected |
|------|--------|----------|
| 1 | Navigate to the league standings page during an active gameweek. | Header reads "Live Standings" with a pulsing green dot. |
| 2 | Identify a team that has moved up in rank due to live GW points (compare to stored-only ranking). | That team's row shows a green up arrow with the number of positions gained (e.g., "↑2"). |
| 3 | Identify a team that has moved down in rank. | That team's row shows a red down arrow with the number of positions lost. |
| 4 | Identify a team whose rank has not changed. | That team's row shows a grey dash indicator. |
| 5 | Verify the GW column values. | Each team's GW column shows the live running total. Teams with an active chip show a chip indicator next to their GW score. |
| 6 | Scroll to the bottom of the standings table. | A footer reads "Provisional -- bench subs not yet applied". |
| 7 | Finalize the gameweek. Reload the standings page. | Header reads "League Standings" (no "Live", no pulsing dot). The footer disclaimer is absent or shows default text. GW column shows finalized scores. |

## End-to-End: Full Gameweek Lifecycle

1. Start with a gameweek in ACTIVE status, all matches SCHEDULED, no performances. Navigate to dashboard and standings. Verify: live card shows 0 points, "0/N matches", standings show stored totals only with no rank changes.
2. Mark one match as SCORED and add player performances. Reload dashboard. Verify: live card updates to show non-zero running total, "1/N matches". Standings update with provisional ranking.
3. Add a chip usage (POWER_PLAY_BAT) for one team. Reload. Verify: that team's live score increases by the chip bonus. Chip badge appears on their GW card and in the detail sheet. Standings GW column reflects the chip-boosted score.
4. Mark remaining matches as SCORED and add performances. Verify: match progress shows "N/N matches". All team scores reflect full gameweek performances.
5. Run settlement: create GameweekScore records for all teams. Reload dashboard and standings. Verify: "FINAL" badge replaces "LIVE", standings header changes to "League Standings", footer disclaimer removed, all scores match settled values.

## Traceability

| Acceptance Criterion | Automated Test | Manual Step |
|----------------------|----------------|-------------|
| AC1.1-AC4.2 | `tests/unit/scoring-live.test.ts` (14 tests) | -- |
| AC5.1-AC5.3 | `tests/integration/scoring-live-api.test.ts` | -- |
| AC6.1 | `tests/integration/scoring-live-api.test.ts` | -- |
| AC7.1-AC7.2 | `tests/integration/scoring-live-api.test.ts` | -- |
| AC8.1 | `tests/integration/scoring-live-api.test.ts` | -- |
| AC9.1-AC9.2 | `tests/unit/cache-headers.test.ts` (12 tests) | -- |
| AC10.1-AC10.4 | `tests/integration/leaderboard-live.test.ts` + `scoring-live-api.test.ts` | -- |
| AC11.1 | `tests/integration/scoring-live-api.test.ts` | -- |
| AC12.1 | `tests/integration/leaderboard-live.test.ts` | -- |
| AC13.1 | -- | Phase 1, Steps 1-5 |
| AC13.2 | -- | Phase 1, Step 6 |
| AC13.3 | -- | Phase 1, Step 7 |
| AC14.1 | -- | Phase 2, Steps 1-4 |
| AC14.2 | -- | Phase 2, Step 5 |
| AC15.1 | -- | Phase 3, Steps 1-2 |
| AC15.2 | -- | Phase 3, Step 3 |
| AC16.1 | -- | Phase 4, Steps 1, 7 |
| AC16.2 | -- | Phase 4, Steps 2-4 |
| AC16.3 | -- | Phase 4, Step 5 |
| AC16.4 | -- | Phase 4, Steps 6-7 |
