import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { handleApiError } from '@/lib/middleware'
import { successResponse } from '@/lib/api-response'
import { parseBody } from '@/lib/route-utils'
import { GoogleAIStudioService } from '@/lib/ai-studio'

const verifyCompCardSchema = z.object({
  photoUrl: z.string().url('Must be a valid image URL'),
  role: z.string().optional(),
  height: z.string().optional(),
  experience: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const { photoUrl, role, height, experience } = await parseBody(
      request,
      verifyCompCardSchema
    )

    const verificationResult = await GoogleAIStudioService.verifyCompCard(photoUrl, {
      role,
      height,
      experience,
    })

    return NextResponse.json(
      successResponse(verificationResult, 'Comp card analyzed with Google AI Studio Gemini')
    )
  } catch (error) {
    return handleApiError(error)
  }
}
