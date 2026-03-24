import { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: 'USER' | 'ADMIN'
      activeLeagueId: string | null
    } & DefaultSession['user']
  }

  interface User {
    role: 'USER' | 'ADMIN'
    activeLeagueId: string | null
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    role: 'USER' | 'ADMIN'
    activeLeagueId: string | null
  }
}
