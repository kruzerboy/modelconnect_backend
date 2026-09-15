import { NextRequest, NextResponse } from 'next/server'
import { getStoredFile } from '@/lib/storage'
import { handleApiError } from '@/lib/middleware'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params
    const { buffer, mimeType } = await getStoredFile(filename)

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Disposition': `inline; filename="${filename}"`,
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
