import { NextRequest, NextResponse } from 'next/server'
import { connectDb } from '@/lib/db'
import { handleApiError, requireAuth } from '@/lib/middleware'
import { successResponse, ApiError, ERROR_CODES } from '@/lib/api-response'
import { objectId } from '@/lib/route-utils'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    const db = await connectDb()
    const userObjId = objectId(auth.userId)

    const user = await db.collection('users').findOne({
      $or: [{ _id: userObjId }, { id: auth.userId }],
    })

    if (!user) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, 404, 'User account not found')
    }

    const isBusiness = (user.role || '').toLowerCase() === 'business' || (user.role || '').toLowerCase() === 'owner'
    const profile = isBusiness
      ? await db.collection('businessProfiles').findOne({ userId: auth.userId })
      : await db.collection('modelProfiles').findOne({ userId: auth.userId })

    const isVerified = Boolean(user.isVerified || profile?.isVerified || profile?.verified)
    const rawStatus = profile?.verificationStatus || (isVerified ? 'Approved' : 'Unsubmitted')
    const hasUploadedDocs = Boolean(
      profile?.hasUploadedDocs ||
      profile?.govIdFrontUrl ||
      profile?.companyRegistrationUrl ||
      profile?.gstin
    )

    let status = rawStatus
    if (isVerified) {
      status = 'Approved'
    } else if (!hasUploadedDocs && rawStatus === 'Pending Review') {
      status = 'Unsubmitted'
    }

    return NextResponse.json(
      successResponse({
        isVerified,
        status,
        hasUploadedDocs,
        notes: profile?.verificationNotes || '',
        submittedAt: profile?.verificationSubmittedAt || null,
        verifiedAt: profile?.verifiedAt || null,
        data: isBusiness
          ? {
              gstin: profile?.gstin || null,
              companyName: profile?.companyName || null,
              registrationType: profile?.registrationType || null,
              companyRegistrationUrl: profile?.companyRegistrationUrl || null,
            }
          : {
              govIdType: profile?.govIdType || null,
              govIdFrontUrl: profile?.govIdFrontUrl || null,
              selfieUrl: profile?.selfieUrl || null,
            },
      })
    )
  } catch (error) {
    return handleApiError(error)
  }
}
