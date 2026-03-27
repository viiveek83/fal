import { test as setup, expect } from '@playwright/test'

const SIM_ADMIN_EMAIL = 'sim-admin@fal-test.com'
const SIM_PASSWORD = 'sim-test-2025'
const SIM_USER1_EMAIL = 'sim-user-1@fal-test.com'
const APP_ADMIN_EMAIL = 'viiveek@fal.com'
const STORAGE_DIR = 'tests/simulation/playwright/.auth'

setup('authenticate admin', async ({ page }) => {
  await page.goto('/login')

  // Admin already exists from setup — log in as returning user (no admin mode needed)
  await page.getByLabel('Email').fill(SIM_ADMIN_EMAIL)
  await page.getByLabel('Password').fill(SIM_PASSWORD)
  await page.getByRole('button', { name: /enter league/i }).click()

  await page.waitForURL('/', { timeout: 15_000 })
  await page.context().storageState({ path: `${STORAGE_DIR}/admin.json` })
})

setup('authenticate user 1', async ({ page }) => {
  await page.goto('/login')

  await page.getByLabel('Email').fill(SIM_USER1_EMAIL)
  await page.getByLabel('Password').fill(SIM_PASSWORD)
  await page.getByRole('button', { name: /enter league/i }).click()

  await page.waitForURL('/', { timeout: 15_000 })
  await page.context().storageState({ path: `${STORAGE_DIR}/user1.json` })
})

setup('authenticate app admin', async ({ page }) => {
  await page.goto('/login')

  await page.getByLabel('Email').fill(APP_ADMIN_EMAIL)
  await page.getByLabel('Password').fill(SIM_PASSWORD)
  await page.getByRole('button', { name: /enter league/i }).click()

  await page.waitForURL('/', { timeout: 15_000 })
  await page.context().storageState({ path: `${STORAGE_DIR}/appadmin.json` })
})
