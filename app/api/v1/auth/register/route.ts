import { NextRequest, NextResponse } from 'next/server'
import { connectDb } from '@/lib/db'
import { createAccessToken, createRefreshToken, hashPassword } from '@/lib/auth'
import { registerSchema } from '@/lib/schemas'
import { parseBody, serialize, handleDuplicate } from '@/lib/route-utils'
import { ApiError, ERROR_CODES, errorResponse, successResponse } from '@/lib/api-response'
import { handleApiError } from '@/lib/middleware'

export async function POST(request: NextRequest) {
  try {
    const input = await parseBody(request, registerSchema)
    const db = await connectDb()
    const email = input.email.toLowerCase().trim()
    const existing = await db.collection('users').findOne({ email })
    if (existing) throw new ApiError(ERROR_CODES.CONFLICT, 409, 'An account with this email already exists')
    const now = new Date()
    const user = { email, passwordHash: await hashPassword(input.password), role: input.role, firstName: input.firstName.trim(), lastName: input.lastName.trim(), status: 'active', createdAt: now, updatedAt: now }
    try {
      const result = await db.collection('users').insertOne(user)
      const userId = result.insertedId.toString()

      // Auto-create initial profile for the new user
      if (input.role === 'business') {
        const companyName = `${input.firstName} ${input.lastName}`.trim() || 'Business Account'
        await db.collection('businessProfiles').insertOne({
          userId,
          companyName,
          email,
          industry: '',
          description: '',
          website: '',
          location: { city: '', country: '' },
          createdAt: now,
          updatedAt: now,
        })
      } else {
        const name = `${input.firstName} ${input.lastName}`.trim() || 'Model Talent'
        await db.collection('modelProfiles').insertOne({
          userId,
          name,
          email,
          bio: '',
          specialties: [],
          location: { city: '', country: '' },
          createdAt: now,
          updatedAt: now,
        })
      }

      return NextResponse.json(successResponse({ user: serialize({ _id: result.insertedId, ...user, passwordHash: undefined }), accessToken: await createAccessToken(userId, user.role), refreshToken: await createRefreshToken(userId) }), { status: 201 })
    } catch (error) { handleDuplicate(error) }
  } catch (error) { return handleApiError(error) }
}
