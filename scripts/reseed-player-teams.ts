import { config } from 'dotenv'
config({ path: '.env.local' })

import { syncPlayerTeams } from '../lib/sync-players'

const APPLY = process.argv.includes('--apply')

async function main() {
  console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY RUN'}`)
  const result = await syncPlayerTeams({ apply: APPLY })

  console.log(`\nTeam changes: ${result.teamChanges.length}`)
  for (const c of result.teamChanges) {
    console.log(`  ${c.playerName} (${c.apiPlayerId}): ${c.oldTeam} → ${c.newTeam}`)
    if (c.fantasyTeams.length > 0) {
      console.log(`    On fantasy teams: ${c.fantasyTeams.join(', ')}`)
    }
  }

  console.log(`\nNew players: ${result.newPlayers.length}`)
  for (const p of result.newPlayers) {
    console.log(`  ${p.playerName} → ${p.iplTeamCode}`)
  }

  console.log(`\nRole changes: ${result.roleChanges.length}`)
  for (const r of result.roleChanges) {
    console.log(`  ${r.playerName}: ${r.oldRole} → ${r.newRole}`)
  }

  if (APPLY) {
    console.log(`\n[APPLIED] ${result.updatedCount} updated, ${result.createdCount} created`)
  } else {
    console.log('\n[DRY RUN] No changes. Run with --apply to write.')
  }
}

main().catch(e => { console.error('Failed:', e); process.exit(1) })
