import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { successResponse } from '@/lib/api-response'
import { handleApiError } from '@/lib/middleware'
import { parseBody } from '@/lib/route-utils'
import { createPhoneLoginSession } from '@/lib/phone-login'
import { verifyFirebaseIdToken } from '@/lib/firebase-verify'

const verifiedPhoneLoginSchema = z.object({
  idToken: z.string().min(1, 'Firebase ID token is required'),
})

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, Origin',
    },
  })
}

export async function POST(request: NextRequest) {
  try {
    const { idToken } = await parseBody(request, verifiedPhoneLoginSchema)
    const firebaseUser = await verifyFirebaseIdToken(idToken)
    if (!firebaseUser.uid || !firebaseUser.phone_number) {
      return NextResponse.json(
        { success: false, message: 'A verified phone number is required.' },
        { status: 401 },
      )
    }

    const result = await createPhoneLoginSession(
      firebaseUser.phone_number,
      firebaseUser.uid,
    )
    return NextResponse.json(successResponse(result))
  } catch (error) {
    return handleApiError(error)
  }
}
