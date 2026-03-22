import type { Metadata } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { Providers } from './providers'
import './globals.css'

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
})

export const metadata: Metadata = {
  title: 'FAL - Fantasy Auction League',
  description: 'Fantasy cricket platform for IPL',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={jakarta.variable}>
      <body style={{ fontFamily: 'var(--font-jakarta), sans-serif', margin: 0, padding: 0 }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
