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
    const phoneNumber = input.phoneNumber?.trim() || null
    const socialHandle = input.socialHandle?.trim() || null
    const firebaseUid = input.firebaseUid?.trim() || null
    const user = {
      email,
      passwordHash: await hashPassword(input.password),
      role: input.role,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      phoneNumber,
      socialHandle,
      firebaseUid,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    }
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
          phoneNumber,
          socialHandle,
          industry: '',
          description: '',
          website: socialHandle || '',
          location: { city: '', country: '' },
          createdAt: now,
          updatedAt: now,
        })
      } else if (input.role === 'camera') {
        const name = `${input.firstName} ${input.lastName}`.trim() || 'Camera Videographer'
        await db.collection('modelProfiles').insertOne({
          userId,
          name,
          email,
          phoneNumber,
          socialHandle,
          bio: 'Professional Camera Operator & Videographer. Providing 4K/6K cinema camera, lenses, gimbal, and creative filming.',
          specialties: ['Cinematography', 'Camera Operator', 'Commercial Video', 'Reels & Promos'],
          location: { city: '', country: '' },
          roleTag: 'camera',
          createdAt: now,
          updatedAt: now,
        })
      } else if (input.role === 'drone') {
        const name = `${input.firstName} ${input.lastName}`.trim() || 'Drone Operator'
        await db.collection('modelProfiles').insertOne({
          userId,
          name,
          email,
          phoneNumber,
          socialHandle,
          bio: 'Certified Drone Pilot & Aerial Cinematographer. Specializing in 4K aerial shots, landscape, architecture, and FPV cinematography.',
          specialties: ['Drone Cinematography', 'Aerial Pilot', 'DGCA Certified', 'Commercial Aerials'],
          location: { city: '', country: '' },
          roleTag: 'drone',
          createdAt: now,
          updatedAt: now,
        })
      } else if (input.role === 'editor') {
        const name = `${input.firstName} ${input.lastName}`.trim() || 'Video Editor'
        await db.collection('modelProfiles').insertOne({
          userId,
          name,
          email,
          phoneNumber,
          socialHandle,
          bio: 'Professional Video Editor & Post-Production Artist. Specializing in color grading, VFX, sound design, commercial edits, and viral short-form reels.',
          specialties: ['Video Editing', 'Color Grading', 'Motion Graphics', 'Sound Design', 'Reels & Shorts'],
          location: { city: '', country: '' },
          roleTag: 'editor',
          createdAt: now,
          updatedAt: now,
        })
      } else if (input.role === 'influencer') {
        const name = `${input.firstName} ${input.lastName}`.trim() || 'Influencer & Creator'
        await db.collection('modelProfiles').insertOne({
          userId,
          name,
          email,
          phoneNumber,
          socialHandle,
          bio: 'Social Media Influencer & Content Creator. Creating high-engagement Reels, lifestyle campaigns, brand collaborations, and sponsored content.',
          specialties: ['Brand Collaboration', 'Instagram Reels', 'Lifestyle & Fashion', 'Product Reviews', 'Sponsored Content'],
          location: { city: '', country: '' },
          roleTag: 'influencer',
          createdAt: now,
          updatedAt: now,
        })
      } else if (input.role === 'developer') {
        const name = `${input.firstName} ${input.lastName}`.trim() || 'Freelance Developer'
        await db.collection('modelProfiles').insertOne({
          userId,
          name,
          email,
          phoneNumber,
          socialHandle,
          bio: 'Freelance Software & App Developer. Building high-performance mobile apps, responsive web platforms, backend APIs, and modern UI/UX.',
          specialties: ['Mobile App Dev', 'Web Development', 'Flutter', 'React', 'Full-Stack APIs'],
          location: { city: '', country: '' },
          roleTag: 'developer',
          createdAt: now,
          updatedAt: now,
        })
      } else {
        const name = `${input.firstName} ${input.lastName}`.trim() || 'Model Talent'
        await db.collection('modelProfiles').insertOne({
          userId,
          name,
          email,
          phoneNumber,
          socialHandle,
          bio: '',
          specialties: [],
          location: { city: '', country: '' },
          roleTag: 'model',
          createdAt: now,
          updatedAt: now,
        })
      }


      return NextResponse.json(successResponse({ user: serialize({ _id: result.insertedId, ...user, passwordHash: undefined }), accessToken: await createAccessToken(userId, user.role), refreshToken: await createRefreshToken(userId) }), { status: 201 })
    } catch (error) { handleDuplicate(error) }
  } catch (error) { return handleApiError(error) }
}
