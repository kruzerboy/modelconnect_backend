import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { connectDb } from '@/lib/db'
import { handleApiError } from '@/lib/middleware'
import { successResponse } from '@/lib/api-response'
import { parseBody } from '@/lib/route-utils'
import { GoogleAIStudioService } from '@/lib/ai-studio'

const copilotRequestSchema = z.object({
  question: z.string().min(1, 'question is required'),
})

export async function POST(request: NextRequest) {
  try {
    const { question } = await parseBody(request, copilotRequestSchema)

    const db = await connectDb()
    const [totalUsers, activeShoots, activeBanners] = await Promise.all([
      db.collection('users').countDocuments(),
      db.collection('opportunities').countDocuments({ status: 'open' }),
      db.collection('banners').countDocuments({ active: true }),
    ])

    const copilotResult = await GoogleAIStudioService.askCopilot(question, {
      totalUsers,
      activeShoots,
      activeBanners,
    })

    return NextResponse.json(
      successResponse(copilotResult, 'AI Copilot response generated')
    )
  } catch (error) {
    return handleApiError(error)
  }
}
