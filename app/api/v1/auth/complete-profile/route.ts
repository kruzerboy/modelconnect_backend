import { NextRequest, NextResponse } from 'next/server'
import { connectDb } from '@/lib/db'
import { createAccessToken, createRefreshToken } from '@/lib/auth'
import { completeProfileSchema } from '@/lib/schemas'
import { parseBody, serialize, objectId } from '@/lib/route-utils'
import { successResponse, ApiError, ERROR_CODES } from '@/lib/api-response'
import { requireAuth, handleApiError } from '@/lib/middleware'

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
    const auth = await requireAuth(request)
    const input = await parseBody(request, completeProfileSchema)
    const db = await connectDb()

    const userObjId = objectId(auth.userId, 'userId')
    const user = await db.collection('users').findOne({ _id: userObjId })

    if (!user) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, 404, 'User account not found')
    }

    const now = new Date()
    const firstName = input.firstName.trim()
    const lastName = input.lastName.trim()
    const role = input.role
    const socialHandle = input.socialHandle?.trim() || user.socialHandle || null
    const city = input.city?.trim() || ''

    // Update user record
    await db.collection('users').updateOne(
      { _id: userObjId },
      {
        $set: {
          role,
          firstName,
          lastName,
          socialHandle,
          isProfileCompleted: true,
          updatedAt: now,
        },
      }
    )

    const fullName = `${firstName} ${lastName}`.trim()
    const userId = auth.userId
    const phoneNumber = user.phoneNumber || null
    const email = user.email || null

    // Create or update role profile
    if (role === 'business') {
      const companyName = fullName || 'Business Account'
      await db.collection('businessProfiles').updateOne(
        { userId },
        {
          $set: {
            companyName,
            email,
            phoneNumber,
            socialHandle,
            website: socialHandle || '',
            'location.city': city,
            updatedAt: now,
          },
          $setOnInsert: {
            userId,
            industry: '',
            description: input.bio?.trim() || '',
            location: { city, country: 'India' },
            createdAt: now,
          },
        },
        { upsert: true }
      )
    } else {
      let defaultSpecialties: string[] = []
      let defaultBio = input.bio?.trim() || ''

      if (role === 'camera') {
        defaultSpecialties = ['Cinematography', 'Camera Operator', 'Commercial Video', 'Reels & Promos']
        if (!defaultBio) {
          defaultBio = 'Professional Camera Operator & Videographer. Providing 4K/6K cinema camera, lenses, gimbal, and creative filming.'
        }
      } else if (role === 'drone') {
        defaultSpecialties = ['Drone Cinematography', 'Aerial Pilot', 'DGCA Certified', 'Commercial Aerials']
        if (!defaultBio) {
          defaultBio = 'Certified Drone Pilot & Aerial Cinematographer. Specializing in 4K aerial shots, landscape, architecture, and FPV cinematography.'
        }
      }

      await db.collection('modelProfiles').updateOne(
        { userId },
        {
          $set: {
            name: fullName,
            email,
            phoneNumber,
            socialHandle,
            roleTag: role,
            'location.city': city,
            updatedAt: now,
          },
          $setOnInsert: {
            userId,
            bio: defaultBio,
            specialties: defaultSpecialties,
            location: { city, country: 'India' },
            createdAt: now,
          },
        },
        { upsert: true }
      )
    }

    const updatedUser = await db.collection('users').findOne({ _id: userObjId })
    const { passwordHash, ...safeUser } = updatedUser || user

    return NextResponse.json(
      successResponse({
        user: serialize({
          ...safeUser,
          role,
          firstName,
          lastName,
          isProfileCompleted: true,
        }),
        accessToken: await createAccessToken(userId, role),
        refreshToken: await createRefreshToken(userId),
        isProfileCompleted: true,
      })
    )
  } catch (error) {
    return handleApiError(error)
  }
}
