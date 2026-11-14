import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { connectDb } from '@/lib/db'
import { createAccessToken, createRefreshToken } from '@/lib/auth'
import { successResponse } from '@/lib/api-response'
import { handleApiError } from '@/lib/middleware'
import { parseBody, serialize } from '@/lib/route-utils'
import { verifyFirebaseIdToken } from '@/lib/firebase-verify'

const socialLoginSchema = z.object({
  idToken: z.string().min(1, 'Firebase ID token is required'),
  provider: z.enum(['google', 'apple']).default('google'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
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
    const { idToken, provider, firstName, lastName } = await parseBody(request, socialLoginSchema)
    const firebaseUser = await verifyFirebaseIdToken(idToken)
    if (!firebaseUser.uid) {
      return NextResponse.json(
        { success: false, message: 'Invalid Firebase ID token.' },
        { status: 401 },
      )
    }

    const email = (firebaseUser.email || '').trim().toLowerCase()
    const firebaseUid = firebaseUser.uid
    const avatarUrl = firebaseUser.picture || null

    // Determine user's name
    const resolvedName = firebaseUser.name || ''
    const nameParts = resolvedName.split(' ')
    const resolvedFirstName = (firstName || nameParts[0] || '').trim()
    const resolvedLastName = (lastName || nameParts.slice(1).join(' ') || '').trim()

    const db = await connectDb()
    const now = new Date()

    // Find existing user by email or firebaseUid
    let user = await db.collection('users').findOne({
      $or: [
        ...(email ? [{ email }] : []),
        { firebaseUid },
      ],
    })

    let isNewUser = false

    if (!user) {
      isNewUser = true
      const newUser: Record<string, unknown> = {
        email: email || `${firebaseUid}@privaterelay.appleid.com`,
        firebaseUid,
        firstName: resolvedFirstName,
        lastName: resolvedLastName,
        role: 'model', // Default role until profile completion
        status: 'active',
        isProfileCompleted: false,
        authProvider: provider,
        createdAt: now,
        updatedAt: now,
      }
      if (avatarUrl) newUser.avatarUrl = avatarUrl

      const insertResult = await db.collection('users').insertOne(newUser)
      user = { _id: insertResult.insertedId, ...newUser }
    } else {
      const updateFields: Record<string, unknown> = { updatedAt: now }
      if (!user.firebaseUid) updateFields.firebaseUid = firebaseUid
      if (email && !user.email) updateFields.email = email
      if (avatarUrl && !user.avatarUrl) updateFields.avatarUrl = avatarUrl
      if (!user.firstName && resolvedFirstName) updateFields.firstName = resolvedFirstName
      if (!user.lastName && resolvedLastName) updateFields.lastName = resolvedLastName

      if (Object.keys(updateFields).length > 1) {
        await db.collection('users').updateOne(
          { _id: user._id },
          { $set: updateFields },
        )
      }
    }

    const userId = user._id.toString()
    const isProfileCompleted = Boolean(
      user.isProfileCompleted === true ||
      (user.firstName && user.firstName.trim().length > 0 && user.role && user.phoneNumber),
    )
    const { passwordHash, ...safeUser } = user

    const session = {
      user: serialize({ ...safeUser, isProfileCompleted }),
      accessToken: await createAccessToken(userId, user.role || 'model'),
      refreshToken: await createRefreshToken(userId),
      isProfileCompleted,
      isNewUser,
    }

    return NextResponse.json(successResponse(session))
  } catch (error) {
    return handleApiError(error)
  }
}
