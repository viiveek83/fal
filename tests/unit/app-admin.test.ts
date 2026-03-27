import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { isAppAdmin } from '@/lib/app-admin'

describe('isAppAdmin', () => {
  const originalEnv = process.env.APP_ADMIN_EMAILS

  afterAll(() => {
    process.env.APP_ADMIN_EMAILS = originalEnv
  })

  it('returns false for null email', () => {
    process.env.APP_ADMIN_EMAILS = 'admin@example.com'
    expect(isAppAdmin(null)).toBe(false)
  })

  it('returns false for undefined email', () => {
    process.env.APP_ADMIN_EMAILS = 'admin@example.com'
    expect(isAppAdmin(undefined)).toBe(false)
  })

  it('returns true for email in APP_ADMIN_EMAILS', () => {
    process.env.APP_ADMIN_EMAILS = 'viiveek@gmail.com,shaheeldholakia@gmail.com'
    expect(isAppAdmin('viiveek@gmail.com')).toBe(true)
  })

  it('returns true for email regardless of case', () => {
    process.env.APP_ADMIN_EMAILS = 'Viiveek@Gmail.com'
    expect(isAppAdmin('VIIVEEK@GMAIL.COM')).toBe(true)
  })

  it('returns false for email not in APP_ADMIN_EMAILS', () => {
    process.env.APP_ADMIN_EMAILS = 'viiveek@gmail.com,shaheeldholakia@gmail.com'
    expect(isAppAdmin('other@example.com')).toBe(false)
  })

  it('returns false when APP_ADMIN_EMAILS is empty string', () => {
    process.env.APP_ADMIN_EMAILS = ''
    expect(isAppAdmin('viiveek@gmail.com')).toBe(false)
  })

  it('handles whitespace in APP_ADMIN_EMAILS', () => {
    process.env.APP_ADMIN_EMAILS = ' viiveek@gmail.com , shaheeldholakia@gmail.com '
    expect(isAppAdmin('viiveek@gmail.com')).toBe(true)
    expect(isAppAdmin('shaheeldholakia@gmail.com')).toBe(true)
  })
})
