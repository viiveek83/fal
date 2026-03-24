import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { prisma } from './db'

// Re-verify user ID against DB every 30 minutes to handle DB resets
const RESYNC_INTERVAL_MS = 30 * 60 * 1000

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null
        const email = credentials.email as string

        // Login route already handles creation and password verification
        const user = await prisma.user.findUnique({ where: { email } })
        if (!user) return null

        return { id: user.id, email: user.email, name: user.name, role: user.role, activeLeagueId: user.activeLeagueId }
      },
    }),
  ],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    session({ session, token }) {
      if (token?.sub) session.user.id = token.sub
      session.user.role = token.role
      session.user.activeLeagueId = token.activeLeagueId ?? null
      return session
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id
        token.email = user.email
        token.role = user.role
        token.activeLeagueId = user.activeLeagueId ?? null
        token.lastVerified = Date.now()
      }

      // Periodically re-verify user ID against DB to handle DB resets/re-seeds.
      // If the DB was wiped and re-seeded, the user may exist with a new ID
      // while the JWT still holds the old one — causing empty query results.
      const lastVerified = (token.lastVerified as number) || 0
      if (token.email && Date.now() - lastVerified > RESYNC_INTERVAL_MS) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { email: token.email as string },
          })
          if (dbUser) {
            if (dbUser.id !== token.sub) {
              token.sub = dbUser.id
              token.role = dbUser.role
            }
            token.activeLeagueId = dbUser.activeLeagueId || null
            token.lastVerified = Date.now()
          } else {
            // User no longer exists in DB — invalidate token
            token.sub = undefined
            token.role = 'USER' as const
          }
        } catch {
          // DB unreachable — keep existing token, try again next cycle
        }
      }

      return token
    },
  },
})
