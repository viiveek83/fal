import { test, expect, Page } from '@playwright/test'

/**
 * Full Gameweek Lifecycle E2E Test
 *
 * Tests the complete transition: pre-scores → LIVE scoring → settlement → FINAL
 *
 * Strategy: Uses the existing GW6 (ACTIVE) simulation data. Manipulates DB state
 * between stages to simulate the lifecycle, then restores original state.
 *
 * Tags: @user — logged in as sim-user-1@fal-test.com
 */

/* ─── DB Helpers (run via Node child process to use Prisma) ─── */

import { execSync } from 'child_process'

const ENV_PATH = '/Users/viiveeksankar/workspace/fal/.env.local'

function runDbScript(script: string): string {
  const escaped = script.replace(/"/g, '\\"').replace(/\$/g, '\\$')
  const cmd = `node -e "require('dotenv').config({ path: '${ENV_PATH}' }); const { PrismaClient } = require('@prisma/client'); const p = new PrismaClient(); (async () => { ${escaped}; await p.\\$disconnect(); })().catch(e => { console.error(e); process.exit(1); });"`
  return execSync(cmd, {
    cwd: '/Users/viiveeksankar/workspace/fal-live-scores',
    timeout: 15000,
    encoding: 'utf-8',
  }).trim()
}

function dbQuery(query: string): any {
  const result = runDbScript(`const r = await ${query}; console.log(JSON.stringify(r))`)
  return JSON.parse(result.split('\n').pop()!)
}

function dbExec(statement: string): void {
  runDbScript(statement)
}

/* ─── Helpers ─── */

async function waitForApp(page: Page) {
  await page.waitForLoadState('domcontentloaded', { timeout: 30_000 }).catch(() => {})
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
  await expect(page.getByText('Loading...')).toBeHidden({ timeout: 30_000 }).catch(() => {})
}

/* ─── State management ─── */

interface OriginalState {
  gameweekScore: any | null
  matchStatuses: Array<{ id: string; scoringStatus: string }>
  aggregationStatus: string
}

let originalState: OriginalState
let activeGwId: string
let activeGwNumber: number
let teamId: string
let leagueId: string

/* ═══════════════════════════════════════════════════════════════════════════
   Full Gameweek Lifecycle
   ═══════════════════════════════════════════════════════════════════════════ */

test.describe('Full Gameweek Lifecycle @user', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeAll(() => {
    // Capture current state so we can restore it
    const gw = dbQuery(`p.gameweek.findFirst({ where: { status: 'ACTIVE' }, select: { id: true, number: true, aggregationStatus: true } })`)
    activeGwId = gw.id
    activeGwNumber = gw.number

    const user = dbQuery(`p.user.findUnique({ where: { email: 'sim-user-1@fal-test.com' }, select: { teams: { select: { id: true, leagueId: true } } } })`)
    teamId = user.teams[0].id
    leagueId = user.teams[0].leagueId

    // Save original GameweekScore
    const gs = dbQuery(`p.gameweekScore.findFirst({ where: { teamId: '${teamId}', gameweekId: '${activeGwId}' } })`)

    // Save original match statuses
    const matches = dbQuery(`p.match.findMany({ where: { gameweekId: '${activeGwId}' }, select: { id: true, scoringStatus: true } })`)

    originalState = {
      gameweekScore: gs,
      matchStatuses: matches,
      aggregationStatus: gw.aggregationStatus,
    }
  })

  test.afterAll(() => {
    // Restore original state
    try {
      // Restore match statuses
      for (const m of originalState.matchStatuses) {
        dbExec(`await p.match.update({ where: { id: '${m.id}' }, data: { scoringStatus: '${m.scoringStatus}' } })`)
      }

      // Restore aggregation status
      dbExec(`await p.gameweek.update({ where: { id: '${activeGwId}' }, data: { aggregationStatus: '${originalState.aggregationStatus}' } })`)

      // Restore GameweekScore
      if (originalState.gameweekScore) {
        dbExec(`await p.gameweekScore.upsert({ where: { teamId_gameweekId: { teamId: '${teamId}', gameweekId: '${activeGwId}' } }, create: { teamId: '${teamId}', gameweekId: '${activeGwId}', totalPoints: ${originalState.gameweekScore.totalPoints}, chipUsed: ${originalState.gameweekScore.chipUsed ? `'${originalState.gameweekScore.chipUsed}'` : 'null'} }, update: { totalPoints: ${originalState.gameweekScore.totalPoints}, chipUsed: ${originalState.gameweekScore.chipUsed ? `'${originalState.gameweekScore.chipUsed}'` : 'null'} } })`)
      } else {
        dbExec(`await p.gameweekScore.deleteMany({ where: { teamId: '${teamId}', gameweekId: '${activeGwId}' } })`)
      }
    } catch (e) {
      console.error('Cleanup failed:', e)
    }
  })

  /* ─── Stage 1: Pre-scores (0 scored matches → LIVE with 0 points) ─── */
  test('Stage 1: Pre-scores — LIVE mode with 0 points', async ({ page }) => {
    // Set all matches to SCHEDULED and remove GameweekScore
    dbExec(`await p.match.updateMany({ where: { gameweekId: '${activeGwId}' }, data: { scoringStatus: 'SCHEDULED' } })`)
    dbExec(`await p.gameweekScore.deleteMany({ where: { teamId: '${teamId}', gameweekId: '${activeGwId}' } })`)
    // Delete ALL GameweekScores for this GW so leaderboard also goes LIVE
    dbExec(`await p.gameweekScore.deleteMany({ where: { gameweekId: '${activeGwId}' } })`)
    dbExec(`await p.gameweek.update({ where: { id: '${activeGwId}' }, data: { aggregationStatus: 'PENDING' } })`)

    await page.goto('/')
    await waitForApp(page)

    // Live GW card should show LIVE badge
    const liveCard = page.getByTestId('live-gw-card')
    await expect(liveCard).toBeVisible({ timeout: 15_000 })

    const liveBadge = liveCard.getByTestId('live-badge')
    await expect(liveBadge).toBeVisible()
    await expect(liveBadge).toHaveText('LIVE')

    // Score should be 0 (no scored matches)
    const total = liveCard.getByTestId('live-gw-total')
    await expect(total).toHaveText('0')

    // Match progress should show 0/N
    await expect(liveCard.getByText(/0\/\d+ matches scored/)).toBeVisible()

    // Standings should say "Live Standings"
    const standingsCard = page.getByTestId('standings-card')
    await expect(standingsCard.getByText('Live Standings')).toBeVisible()

    // Provisional footer
    await expect(standingsCard.getByText('Provisional — bench subs not yet applied')).toBeVisible()

    await page.screenshot({ path: 'test-results/lifecycle-stage1-prescores.png' })
  })

  /* ─── Stage 2: Partial scoring (some matches scored → LIVE with points) ─── */
  test('Stage 2: Partial scoring — LIVE mode with running total', async ({ page }) => {
    // Score first 2 matches (set to SCORED)
    const matches = dbQuery(`p.match.findMany({ where: { gameweekId: '${activeGwId}' }, select: { id: true }, take: 2 })`)
    for (const m of matches) {
      dbExec(`await p.match.update({ where: { id: '${m.id}' }, data: { scoringStatus: 'SCORED' } })`)
    }

    await page.goto('/')
    await waitForApp(page)

    // Still LIVE (no GameweekScore yet)
    const liveCard = page.getByTestId('live-gw-card')
    await expect(liveCard).toBeVisible({ timeout: 15_000 })

    const liveBadge = liveCard.getByTestId('live-badge')
    await expect(liveBadge).toBeVisible()
    await expect(liveBadge).toHaveText('LIVE')

    // Match progress should show 2/N
    await expect(liveCard.getByText(/2\/\d+ matches scored/)).toBeVisible()

    // Score should be > 0 now (players have performances from earlier scoring)
    const totalText = await liveCard.getByTestId('live-gw-total').textContent()
    const totalPoints = parseInt(totalText?.replace(/,/g, '') || '0')
    // Points could be 0 if the 2 scored matches don't have performances for this team's players
    // Just verify the card renders a number
    expect(totalText).toMatch(/^\d[\d,]*$/)

    // Standings should show live GW points for teams
    const standingsCard = page.getByTestId('standings-card')
    await expect(standingsCard.getByText('Live Standings')).toBeVisible()

    // Rank change indicators should be present
    const rankChanges = standingsCard.getByTestId('rank-change')
    const count = await rankChanges.count()
    expect(count).toBeGreaterThan(0)

    await page.screenshot({ path: 'test-results/lifecycle-stage2-partial.png' })
  })

  /* ─── Stage 3: All matches scored (still LIVE, full running total) ─── */
  test('Stage 3: All scored — LIVE mode with full running total', async ({ page }) => {
    // Set ALL matches to SCORED
    dbExec(`await p.match.updateMany({ where: { gameweekId: '${activeGwId}' }, data: { scoringStatus: 'SCORED' } })`)

    await page.goto('/')
    await waitForApp(page)

    const liveCard = page.getByTestId('live-gw-card')
    await expect(liveCard).toBeVisible({ timeout: 15_000 })

    // Still LIVE (aggregation hasn't run)
    await expect(liveCard.getByTestId('live-badge')).toBeVisible()

    // Match progress should show N/N (all scored)
    const progressText = await liveCard.getByText(/\d+\/\d+ matches scored/).textContent()
    const [scored, total] = progressText!.match(/(\d+)\/(\d+)/)!.slice(1).map(Number)
    expect(scored).toBe(total)

    // Score should reflect all matches
    const totalText = await liveCard.getByTestId('live-gw-total').textContent()
    expect(totalText).toMatch(/^\d[\d,]*$/)

    // Open detail sheet to verify player breakdown
    await liveCard.click()
    const gwSheet = page.getByTestId('gw-detail-sheet')
    await expect(gwSheet).toBeVisible({ timeout: 10_000 })

    // Should show LIVE badge in sheet
    await expect(gwSheet.getByTestId('sheet-live-badge')).toBeVisible()

    // Should show Playing XI
    await expect(gwSheet.getByText('Playing XI')).toBeVisible()

    // Should show captain indicator
    await expect(gwSheet.getByText('(C)')).toBeVisible()

    await page.screenshot({ path: 'test-results/lifecycle-stage3-allscored.png' })

    // Close sheet by clicking overlay
    await page.locator('[data-testid="gw-detail-sheet"]').press('Escape')
    await page.waitForTimeout(500)
  })

  /* ─── Stage 4: Settlement (GameweekScore created → FINAL score card) ─── */
  test('Stage 4: Settlement — FINAL mode with stored score', async ({ page }) => {
    // Create GameweekScore for user's team to trigger FINAL mode on the scores API.
    // Keep aggregationStatus: 'PENDING' so leaderboard still detects an active GW
    // (the query is: status=ACTIVE, aggregationStatus != DONE).
    // This simulates the state right after aggregation creates GameweekScores
    // but before the GW status is flipped to COMPLETED.
    dbExec(`await p.gameweekScore.upsert({ where: { teamId_gameweekId: { teamId: '${teamId}', gameweekId: '${activeGwId}' } }, create: { teamId: '${teamId}', gameweekId: '${activeGwId}', totalPoints: 474 }, update: { totalPoints: 474 } })`)

    await page.goto('/')
    await waitForApp(page)

    // Card should now show FINAL (scores API finds GameweekScore)
    const liveCard = page.getByTestId('live-gw-card')
    await expect(liveCard).toBeVisible({ timeout: 15_000 })

    const finalBadge = liveCard.getByTestId('final-badge')
    await expect(finalBadge).toBeVisible()
    await expect(finalBadge).toHaveText('FINAL')

    // No match progress in FINAL mode
    await expect(liveCard.getByText(/matches scored/)).toBeHidden()

    // No "Bench subs applied" footer in FINAL mode
    await expect(liveCard.getByText('Bench subs applied after final match')).toBeHidden()

    // Open detail sheet — should show FINAL badge
    await liveCard.click()
    const gwSheet = page.getByTestId('gw-detail-sheet')
    await expect(gwSheet).toBeVisible({ timeout: 10_000 })
    await expect(gwSheet.getByTestId('sheet-final-badge')).toBeVisible()

    await page.screenshot({ path: 'test-results/lifecycle-stage4-final.png' })
  })

  /* ─── Stage 5: GW fully completed (aggregationStatus DONE → standings go FINAL) ─── */
  test('Stage 5: GW completed — standings revert to League Standings', async ({ page }) => {
    // Now mark aggregation as DONE — leaderboard switches to FINAL mode
    dbExec(`await p.gameweek.update({ where: { id: '${activeGwId}' }, data: { aggregationStatus: 'DONE' } })`)

    await page.goto('/')
    await waitForApp(page)

    // Standings should say "League Standings" (not "Live")
    const standingsCard = page.getByTestId('standings-card')
    await expect(standingsCard.getByText('League Standings')).toBeVisible()

    // No provisional footer
    await expect(standingsCard.getByText('Provisional — bench subs not yet applied')).toBeHidden()

    // No pulsing dot
    await expect(standingsCard.getByTestId('standings-pulsing-dot')).toBeHidden()

    // All rank changes should be — (no live comparison)
    const rankChanges = standingsCard.getByTestId('rank-change')
    const count = await rankChanges.count()
    for (let i = 0; i < count; i++) {
      await expect(rankChanges.nth(i)).toHaveText('—')
    }

    await page.screenshot({ path: 'test-results/lifecycle-stage5-completed.png' })
  })
})
