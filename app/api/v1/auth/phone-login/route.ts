import { NextRequest, NextResponse } from 'next/server'
import { connectDb } from '@/lib/db'
import { createAccessToken, createRefreshToken } from '@/lib/auth'
import { phoneLoginSchema } from '@/lib/schemas'
import { parseBody, serialize } from '@/lib/route-utils'
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
    const input = await parseBody(request, phoneLoginSchema)
    const { cleanPhone, bareNumber } = normalizePhone(input.phoneNumber)
    const firebaseUid = input.firebaseUid?.trim() || null

    const db = await connectDb()
    let user = await db.collection('users').findOne({
      $or: [
        { phoneNumber: cleanPhone },
        { phoneNumber: `+91${bareNumber}` },
        { phoneNumber: bareNumber },
        { phoneNumber: { $regex: `${bareNumber}$` } },
        ...(firebaseUid ? [{ firebaseUid }] : []),
      ],
    })

    const now = new Date()
    let isNewUser = false

    if (!user) {
      // Auto-create new user on phone verification
      isNewUser = true
      const newUser = {
        phoneNumber: cleanPhone,
        email: null,
        role: 'model',
        firstName: '',
        lastName: '',
        socialHandle: null,
        firebaseUid,
        status: 'active',
        isProfileCompleted: false,
        createdAt: now,
        updatedAt: now,
      }

      const insertResult = await db.collection('users').insertOne(newUser)
      user = { _id: insertResult.insertedId, ...newUser }
    } else {
      // Update phone number and/or firebaseUid if updated
      const updateFields: Record<string, unknown> = { updatedAt: now }
      if (!user.phoneNumber) updateFields.phoneNumber = cleanPhone
      if (firebaseUid && !user.firebaseUid) updateFields.firebaseUid = firebaseUid

      if (Object.keys(updateFields).length > 1) {
        await db.collection('users').updateOne(
          { _id: user._id },
          { $set: updateFields }
        )
      }
    }

    const userId = user._id.toString()
    const isProfileCompleted = Boolean(
      user.isProfileCompleted === true ||
      (user.firstName && user.firstName.trim().length > 0 && user.role)
    )

    const { passwordHash, ...safeUser } = user

    return NextResponse.json(
      successResponse({
        user: serialize({
          ...safeUser,
          isProfileCompleted,
        }),
        accessToken: await createAccessToken(userId, user.role || 'model'),
        refreshToken: await createRefreshToken(userId),
        isProfileCompleted,
        isNewUser,
      })
    )
  } catch (error) {
    return handleApiError(error)
  }
}
