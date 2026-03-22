'use client'

import React from 'react'

export function AppFrame({ children }: { children: React.ReactNode }) {
  return <div className="app-frame">{children}</div>
}
