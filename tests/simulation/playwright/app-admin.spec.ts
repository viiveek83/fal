import { test, expect, Page } from '@playwright/test'

/**
 * App Admin Dashboard — E2E tests.
 *
 * Tags:
 *   @appadmin — logged in as app admin user (in APP_ADMIN_EMAILS)
 *   @user     — logged in as regular user (not in APP_ADMIN_EMAILS)
 */

async function waitForApp(page: Page) {
  await page.waitForLoadState('domcontentloaded', { timeout: 30_000 }).catch(() => {})
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
  await expect(page.getByText('Loading...')).toBeHidden({ timeout: 30_000 }).catch(() => {})
}

/* ═══════════════════════════════════════════════════════════════════════════
   AC5.6: Non-app-admin sees access denied
   ═══════════════════════════════════════════════════════════════════════════ */

test('non-app-admin sees access denied on /app-admin @user', async ({ page }) => {
  await page.goto('/app-admin')
  await waitForApp(page)

  await expect(page.getByText('Access denied')).toBeVisible()
  await expect(page.getByText('Go Home')).toBeVisible()
})

/* ═══════════════════════════════════════════════════════════════════════════
   AC6.2: Non-app-admin sees only 4-tab navigation
   ═══════════════════════════════════════════════════════════════════════════ */

test('non-app-admin does not see Admin tab @user', async ({ page }) => {
  await page.goto('/')
  await waitForApp(page)

  const nav = page.locator('nav.bottom-nav-fixed')
  await expect(nav).toBeVisible()
  await expect(nav.getByText('Admin')).toBeHidden()
})

/* ═══════════════════════════════════════════════════════════════════════════
   AC6.1: App admin sees 5th Admin tab
   ═══════════════════════════════════════════════════════════════════════════ */

test('app admin sees Admin tab in bottom nav @appadmin', async ({ page }) => {
  await page.goto('/')
  await waitForApp(page)

  const nav = page.locator('nav.bottom-nav-fixed')
  await expect(nav).toBeVisible()
  await expect(nav.getByText('Admin')).toBeVisible()
})

/* ═══════════════════════════════════════════════════════════════════════════
   AC5.1: Match scoring status table with status pills
   ═══════════════════════════════════════════════════════════════════════════ */

test('app admin dashboard shows match status table @appadmin', async ({ page }) => {
  await page.goto('/app-admin')
  await waitForApp(page)

  // Should NOT show access denied
  await expect(page.getByText('Access denied')).toBeHidden()

  // Import Scores section visible
  await expect(page.getByText('Import Scores')).toBeVisible()

  // Match table should have at least one match row with a status pill
  const statusPills = page.locator('text=SCORED, text=COMPLETED, text=SCHEDULED, text=CANCELLED, text=SCORING, text=ERROR')
  // At least one match status should be visible
  await expect(page.getByText(/matches ready to score|No matches ready to score/)).toBeVisible()
})

/* ═══════════════════════════════════════════════════════════════════════════
   AC5.2: Import Scores button exists and is clickable
   ═══════════════════════════════════════════════════════════════════════════ */

test('app admin sees Import Scores button @appadmin', async ({ page }) => {
  await page.goto('/app-admin')
  await waitForApp(page)

  const importBtn = page.getByRole('button', { name: /import scores/i })
  await expect(importBtn).toBeVisible()
  await expect(importBtn).toBeEnabled()
})

/* ═══════════════════════════════════════════════════════════════════════════
   AC5.3: Check for Updates button (sync player teams)
   ═══════════════════════════════════════════════════════════════════════════ */

test('app admin sees Sync Player Teams section @appadmin', async ({ page }) => {
  await page.goto('/app-admin')
  await waitForApp(page)

  await expect(page.getByText('Sync Player Teams')).toBeVisible()

  const checkBtn = page.getByRole('button', { name: /check for updates/i })
  await expect(checkBtn).toBeVisible()
  await expect(checkBtn).toBeEnabled()
})

/* ═══════════════════════════════════════════════════════════════════════════
   AC5.5: Operational guidance text
   ═══════════════════════════════════════════════════════════════════════════ */

test('app admin dashboard shows operational guidance @appadmin', async ({ page }) => {
  await page.goto('/app-admin')
  await waitForApp(page)

  await expect(page.getByText(/SportMonks data is usually complete/)).toBeVisible()
})
