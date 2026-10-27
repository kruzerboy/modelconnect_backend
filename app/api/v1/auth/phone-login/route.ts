import { NextRequest, NextResponse } from 'next/server'
import { phoneLoginSchema } from '@/lib/schemas'
import { parseBody } from '@/lib/route-utils'
import { successResponse } from '@/lib/api-response'
import { handleApiError } from '@/lib/middleware'
import { createPhoneLoginSession } from '@/lib/phone-login'

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, Origin',
    },
  })
}

export async function POST(request: NextRequest) {
  try {
    const input = await parseBody(request, phoneLoginSchema)
    const result = await createPhoneLoginSession(input.phoneNumber, input.firebaseUid)
    return NextResponse.json(successResponse(result))
  } catch (error) {
    return handleApiError(error)
  }
}
