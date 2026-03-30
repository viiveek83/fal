/**
 * Full recalculation of fantasy scores after batting milestone fix.
 *
 * Bug: Batting milestones were stacking (75 runs gave +4+8+12 = 24 bonus
 * instead of +12 only). This script corrects all affected scores.
 *
 * Approach:
 *   1. For each PlayerPerformance, compute the milestone diff (old stacking
 *      bonus minus new highest-only bonus) based on stored `runs` field
 *   2. Subtract the diff from PlayerPerformance.fantasyPoints
 *   3. Delete all PlayerScore and GameweekScore rows
 *   4. Reset team.totalPoints and team.bestGwScore to 0
 *   5. Re-aggregate every completed gameweek (bench subs, captain, chips)
 *
 * Why not recompute from scratch: The `lbwBowledCount` bowling stat is derived
 * from ball-by-ball API data at score time and NOT stored in PlayerPerformance.
 * Recomputing bowling from scratch would lose those points. The milestone diff
 * approach only touches what changed.
 *
 * Usage:
 *   npx tsx scripts/recalculate-all-scores.ts              # dry run
 *   npx tsx scripts/recalculate-all-scores.ts --apply       # write changes
 */

import { config } from 'dotenv'
config({ path: '.env.local' })

import { PrismaClient } from '@prisma/client'
import {
  applyBenchSubs,
  resolveMultipliers,
  applyChipEffects,
  buildPlayedSet,
} from '../lib/scoring/multipliers'

const prisma = new PrismaClient()
const APPLY = process.argv.includes('--apply')

/**
 * Old stacking milestone bonus (the bug):
 *   100+ → 16 (century replaced lower)
 *   75-99 → 4 + 8 + 12 = 24
 *   50-74 → 4 + 8 = 12
 *   25-49 → 4
 */
function oldMilestoneBonus(runs: number): number {
  if (runs >= 100) return 16
  let bonus = 0
  if (runs >= 75) bonus += 12
  if (runs >= 50) bonus += 8
  if (runs >= 25) bonus += 4
  return bonus
}

/**
 * New highest-only milestone bonus (correct):
 *   100+ → 16
 *   75-99 → 12
 *   50-74 → 8
 *   25-49 → 4
 */
function newMilestoneBonus(runs: number): number {
  if (runs >= 100) return 16
  if (runs >= 75) return 12
  if (runs >= 50) return 8
  if (runs >= 25) return 4
  return 0
}

async function main() {
  console.log(`Mode: ${APPLY ? '🔴 APPLY (writing changes)' : '🟡 DRY RUN (read-only)'}`)
  console.log('')

  // ─── Step 1: Compute milestone diffs for all PlayerPerformances ───
  console.log('Step 1: Computing batting milestone diffs...')

  const performances = await prisma.playerPerformance.findMany({
    include: {
      player: { select: { id: true, fullname: true } },
      match: { select: { id: true, gameweekId: true, apiMatchId: true } },
    },
  })

  let perfUpdated = 0
  let totalPointsRemoved = 0
  const affected: { name: string; runs: number; matchApi: number; oldBonus: number; newBonus: number; diff: number }[] = []

  for (const perf of performances) {
    const runs = perf.runs
    if (runs === null || runs < 25) continue // no milestone bonus possible

    const oldBonus = oldMilestoneBonus(runs)
    const newBonus = newMilestoneBonus(runs)
    const diff = oldBonus - newBonus // positive = points to remove

    if (diff === 0) continue // 100+ or 25-49: no change

    perfUpdated++
    totalPointsRemoved += diff
    affected.push({
      name: perf.player.fullname,
      runs,
      matchApi: perf.match.apiMatchId,
      oldBonus,
      newBonus,
      diff,
    })

    if (APPLY) {
      await prisma.playerPerformance.update({
        where: { id: perf.id },
        data: { fantasyPoints: perf.fantasyPoints - diff },
      })
    }
  }

  console.log(`  Total performances checked: ${performances.length}`)
  console.log(`  Affected (50-99 runs): ${perfUpdated}`)
  console.log(`  Total points to remove: ${totalPointsRemoved}`)
  if (affected.length > 0) {
    console.log('')
    console.log('  Affected performances:')
    for (const a of affected) {
      console.log(`    ${a.name} (${a.runs} runs, match #${a.matchApi}): milestone ${a.oldBonus} → ${a.newBonus} (−${a.diff})`)
    }
  }
  console.log('')

  if (perfUpdated === 0) {
    console.log('No performances affected. No recalculation needed.')
    return
  }

  // ─── Step 2: Reset downstream aggregates ───
  console.log('Step 2: Resetting downstream aggregates...')

  const existingPlayerScores = await prisma.playerScore.count()
  const existingGwScores = await prisma.gameweekScore.count()
  const teams = await prisma.team.findMany({
    select: { id: true, name: true, totalPoints: true, bestGwScore: true },
  })

  console.log(`  PlayerScore rows to delete: ${existingPlayerScores}`)
  console.log(`  GameweekScore rows to delete: ${existingGwScores}`)
  console.log(`  Teams to reset:`)
  for (const t of teams) {
    console.log(`    ${t.name}: totalPoints=${t.totalPoints}, bestGwScore=${t.bestGwScore}`)
  }
  console.log('')

  if (APPLY) {
    await prisma.playerScore.deleteMany()
    await prisma.gameweekScore.deleteMany()
    await prisma.team.updateMany({
      data: { totalPoints: 0, bestGwScore: 0 },
    })
    console.log('  ✓ Reset complete')
    console.log('')
  }

  // ─── Step 3: Re-aggregate each completed gameweek ───
  const completedGws = await prisma.gameweek.findMany({
    where: { aggregationStatus: 'DONE' },
    orderBy: { number: 'asc' },
    select: { id: true, number: true },
  })

  console.log(`Step 3: Re-aggregating ${completedGws.length} completed gameweek(s)...`)

  for (const gw of completedGws) {
    console.log(`\n  GW${gw.number}:`)

    const matches = await prisma.match.findMany({
      where: { gameweekId: gw.id, scoringStatus: 'SCORED' },
      select: { id: true },
    })
    const matchIds = matches.map(m => m.id)

    if (matchIds.length === 0) {
      console.log(`    No scored matches, skipping`)
      continue
    }

    const playedSet = await buildPlayedSet(prisma, matchIds)

    // All performances in this GW (with corrected fantasyPoints)
    const gwPerformances = await prisma.playerPerformance.findMany({
      where: { matchId: { in: matchIds } },
    })

    // Sum base points per player across GW matches
    const gwBasePointsAll = new Map<string, number>()
    for (const perf of gwPerformances) {
      gwBasePointsAll.set(
        perf.playerId,
        (gwBasePointsAll.get(perf.playerId) || 0) + perf.fantasyPoints
      )
    }

    // Process each team
    const allTeams = await prisma.team.findMany({
      include: {
        lineups: {
          where: { gameweekId: gw.id },
          include: { slots: true },
        },
        chipUsages: {
          where: { gameweekId: gw.id, status: 'USED' },
        },
      },
    })

    for (const team of allTeams) {
      const lineup = team.lineups[0]
      if (!lineup || lineup.slots.length === 0) {
        console.log(`    ${team.name}: no lineup, skipping`)
        continue
      }

      const slots = lineup.slots.map(s => ({
        playerId: s.playerId,
        slotType: s.slotType as 'XI' | 'BENCH',
        benchPriority: s.benchPriority,
        role: s.role as 'CAPTAIN' | 'VC' | null,
      }))

      // Clone base points
      const gwPoints = new Map<string, number>()
      for (const s of slots) {
        gwPoints.set(s.playerId, gwBasePointsAll.get(s.playerId) || 0)
      }

      // Bench subs
      const { subs, scoringXI } = applyBenchSubs(slots, playedSet)

      // Captain/VC multipliers
      const multipliers = resolveMultipliers(slots, playedSet)
      for (const [pid, mult] of multipliers) {
        const current = gwPoints.get(pid) || 0
        gwPoints.set(pid, current * mult)
      }

      // Player roles for chip effects
      const playerIds = [...scoringXI]
      const players = await prisma.player.findMany({
        where: { id: { in: playerIds } },
        select: { id: true, role: true },
      })
      const playerRoles = new Map(players.map(p => [p.id, p.role]))

      // Chip
      const activeChip = team.chipUsages[0]
      const chipType = (activeChip?.chipType as 'POWER_PLAY_BAT' | 'BOWLING_BOOST') || null
      const teamTotal = applyChipEffects(chipType, scoringXI, gwPoints, playerRoles)

      if (APPLY) {
        // Write PlayerScore
        for (const [playerId, points] of gwPoints) {
          await prisma.playerScore.upsert({
            where: { playerId_gameweekId: { playerId, gameweekId: gw.id } },
            update: { totalPoints: points },
            create: { playerId, gameweekId: gw.id, totalPoints: points },
          })
        }

        // Write GameweekScore
        await prisma.gameweekScore.upsert({
          where: { teamId_gameweekId: { teamId: team.id, gameweekId: gw.id } },
          update: { totalPoints: teamTotal, chipUsed: chipType },
          create: { teamId: team.id, gameweekId: gw.id, totalPoints: teamTotal, chipUsed: chipType },
        })

        // Update team season totals
        await prisma.team.update({
          where: { id: team.id },
          data: {
            totalPoints: { increment: teamTotal },
            bestGwScore: Math.max(team.bestGwScore, teamTotal),
          },
        })
      }

      const subInfo = subs.length > 0 ? ` (${subs.length} subs)` : ''
      const chipInfo = chipType ? ` [${chipType}]` : ''
      console.log(`    ${team.name}: ${teamTotal} pts${subInfo}${chipInfo}`)
    }
  }

  console.log('')
  if (!APPLY) {
    console.log('═══════════════════════════════════════════════')
    console.log('DRY RUN complete. Run with --apply to write changes.')
    console.log('═══════════════════════════════════════════════')
  } else {
    console.log('═══════════════════════════════════════════════')
    console.log('✅ Recalculation complete. All scores updated.')
    console.log('═══════════════════════════════════════════════')
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
