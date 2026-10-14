import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'ClinicConnect — Talk to a doctor from home',
    template: '%s | ClinicConnect',
  },
  description:
    'Send your health problem to a general doctor. If you need specialist care, they forward your case — all in one place.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  )
}
