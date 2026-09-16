import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ModelConnect API & Backend',
  description: 'Two-sided marketplace connecting Models and Business Owners',
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: '#090D16',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}
