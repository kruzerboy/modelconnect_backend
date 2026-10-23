import { NextRequest, NextResponse } from 'next/server'
import { connectDb } from '@/lib/db'
import { checkPhoneSchema } from '@/lib/schemas'
import { parseBody } from '@/lib/route-utils'
import { successResponse } from '@/lib/api-response'
import { handleApiError } from '@/lib/middleware'

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

function normalizePhone(phone: string): { cleanPhone: string; bareNumber: string } {
  const cleaned = phone.replace(/[\s\-\(\)]/g, '').trim()
  const digits = cleaned.replace(/\D/g, '')
  const bareNumber = digits.length >= 10 ? digits.slice(-10) : digits
  return { cleanPhone: cleaned, bareNumber }
}

export async function POST(request: NextRequest) {
  try {
    const input = await parseBody(request, checkPhoneSchema)
    const { cleanPhone, bareNumber } = normalizePhone(input.phoneNumber)

    const db = await connectDb()
    const user = await db.collection('users').findOne({
      $or: [
        { phoneNumber: cleanPhone },
        { phoneNumber: `+91${bareNumber}` },
        { phoneNumber: bareNumber },
        { phoneNumber: { $regex: `${bareNumber}$` } },
      ],
    })

    if (!user) {
      return NextResponse.json(
        successResponse({
          isRegistered: false,
          isProfileCompleted: false,
        })
      )
    }

    const isProfileCompleted = Boolean(
      user.isProfileCompleted === true ||
      (user.firstName && user.firstName.trim().length > 0 && user.role)
    )

    return NextResponse.json(
      successResponse({
        isRegistered: true,
        isProfileCompleted,
        userId: user._id.toString(),
      })
    )
  } catch (error) {
    return handleApiError(error)
  }
}
