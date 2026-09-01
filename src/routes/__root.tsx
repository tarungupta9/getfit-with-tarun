import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from '@tanstack/react-router'
import type { ReactNode } from 'react'
import '../styles.css'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      {
        name: 'description',
        content:
          'Build a clear four-week home fitness routine around the time and weekdays you actually have.',
      },
      { title: 'GetFit — Explained Home Fitness Planner' },
    ],
  }),
  shellComponent: RootDocument,
  component: Outlet,
})

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
