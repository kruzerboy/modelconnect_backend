import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const accept = request.headers.get('accept') || ''
  const isBrowser = accept.includes('text/html')

  // If a web browser visits the root URL, redirect to official website
  if (isBrowser && !request.nextUrl.searchParams.has('json')) {
    return NextResponse.redirect('https://bookshoot.in', 307)
  }

  // If accessed by an API client, cURL, or uptime monitoring tool
  return NextResponse.json({
    status: 'healthy',
    service: 'BookShoot Production API Gateway',
    version: '1.0.0',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    documentation: 'https://admin.bookshoot.in',
  })
}
