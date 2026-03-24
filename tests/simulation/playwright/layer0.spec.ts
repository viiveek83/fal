import { test, expect } from '@playwright/test'

test('login page loads @noauth', async ({ page }) => {
  await page.goto('/login')
  await expect(page.locator('text=Sign In')).toBeVisible()
})
