import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest'
import { PrismaClient } from '@prisma/client'

// Mock auth at the top level
const mockAuthNonAdmin = vi.fn(async () => ({
  user: {
    id: 'normal-user-id',
    email: 'normaluser@test.vitest.syncplayers',
    isAppAdmin: false,
  },
}))

const mockAuthAdmin = vi.fn(async () => ({
  user: {
    id: 'admin-user-id',
    email: 'appadmin@test.vitest.syncplayers',
    isAppAdmin: true,
  },
}))

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

const prisma = new PrismaClient()
const TEST_SUFFIX = '@test.vitest.syncplayers'

interface TestUser {
  id: string
  email: string
}

let appAdminUser: TestUser
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
    select: { id: true, email: true },
  })

  normalUser = await prisma.user.create({
    data: {
      email: `normaluser${TEST_SUFFIX}`,
      name: 'Normal User',
      role: 'USER',
    },
    select: { id: true, email: true },
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
    `normaluser${TEST_SUFFIX}`,
  ]

  await prisma.user.deleteMany({
    where: {
      email: { in: testEmails },
    },
  })
}

describe('Sync Players API - Access Control (AC4.4)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('AC4.4: Non-app-admin user receives 403 on GET', async () => {
    // Mock auth() to return a non-admin session
    const { auth } = await import('@/lib/auth')
    vi.mocked(auth).mockImplementation(mockAuthNonAdmin)

    const { GET } = await import('@/app/api/admin/sync-players/route')

    // Call GET handler
    const response = await GET()

    // Verify 403 status
    expect(response.status).toBe(403)

    const json = await response.json()
    expect(json.error).toBe('Forbidden')
  })

  it('AC4.4: Non-app-admin user receives 403 on POST', async () => {
    // Mock auth() to return a non-admin session
    const { auth } = await import('@/lib/auth')
    vi.mocked(auth).mockImplementation(mockAuthNonAdmin)

    const { POST } = await import('@/app/api/admin/sync-players/route')

    // Call POST handler
    const response = await POST()

    // Verify 403 status
    expect(response.status).toBe(403)

    const json = await response.json()
    expect(json.error).toBe('Forbidden')
  })

  it('AC4.4: App-admin user does not receive 403 on GET', async () => {
    // Mock auth() to return an app-admin session
    const { auth } = await import('@/lib/auth')
    vi.mocked(auth).mockImplementation(mockAuthAdmin)

    const { GET } = await import('@/app/api/admin/sync-players/route')

    // Call GET handler
    const response = await GET()

    // Verify it doesn't return 403 (it should return 200 or 500, not 403)
    expect(response.status).not.toBe(403)
  })

  it('AC4.4: App-admin user does not receive 403 on POST', async () => {
    // Mock auth() to return an app-admin session
    const { auth } = await import('@/lib/auth')
    vi.mocked(auth).mockImplementation(mockAuthAdmin)

    const { POST } = await import('@/app/api/admin/sync-players/route')

    // Call POST handler
    const response = await POST()

    // Verify it doesn't return 403 (it should return 200 or 500, not 403)
    expect(response.status).not.toBe(403)
  })
})
