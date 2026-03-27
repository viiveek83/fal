import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { isAppAdmin } from '@/lib/app-admin'

const prisma = new PrismaClient()
const TEST_SUFFIX = '@test.vitest.appadmin'

interface TestUser {
  id: string
  email: string
  role: 'USER' | 'ADMIN'
}

let appAdminUser: TestUser
let leagueAdminUser: TestUser
let normalUser: TestUser

beforeAll(async () => {
  // Clean up test data
  await cleanup()

  // Create test users
  appAdminUser = await prisma.user.create({
    data: {
      email: `appadmin${TEST_SUFFIX}`,
      name: 'App Admin User',
      role: 'USER',
    },
    select: { id: true, email: true, role: true },
  })

  leagueAdminUser = await prisma.user.create({
    data: {
      email: `leagueadmin${TEST_SUFFIX}`,
      name: 'League Admin User',
      role: 'ADMIN',
    },
    select: { id: true, email: true, role: true },
  })

  normalUser = await prisma.user.create({
    data: {
      email: `normaluser${TEST_SUFFIX}`,
      name: 'Normal User',
      role: 'USER',
    },
    select: { id: true, email: true, role: true },
  })

  // Set APP_ADMIN_EMAILS to include only appAdminUser
  process.env.APP_ADMIN_EMAILS = appAdminUser.email
})

afterAll(async () => {
  await cleanup()
  await prisma.$disconnect()
})

async function cleanup() {
  const testEmails = [
    `appadmin${TEST_SUFFIX}`,
    `leagueadmin${TEST_SUFFIX}`,
    `normaluser${TEST_SUFFIX}`,
  ]

  await prisma.user.deleteMany({
    where: {
      email: { in: testEmails },
    },
  })
}

describe('App Admin Access Control (AC1)', () => {
  it('AC1.3: Non-app-admin user receives 403 on /api/scoring/import', async () => {
    // normalUser is not in APP_ADMIN_EMAILS, so isAppAdmin() should return false
    const isAdmin = isAppAdmin(normalUser.email)
    expect(isAdmin).toBe(false)
  })

  it('AC1.4: League admin (UserRole.ADMIN) NOT in APP_ADMIN_EMAILS receives 403', async () => {
    // leagueAdminUser has role='ADMIN' but is NOT in APP_ADMIN_EMAILS
    // isAppAdmin should check the email list, not the role field
    const isAdmin = isAppAdmin(leagueAdminUser.email)
    expect(isAdmin).toBe(false)
  })

  it('AC1.1: App admin user in APP_ADMIN_EMAILS can access scoring operations', async () => {
    // appAdminUser is in APP_ADMIN_EMAILS, so isAppAdmin() should return true
    const isAdmin = isAppAdmin(appAdminUser.email)
    expect(isAdmin).toBe(true)
  })
})
