import { NextRequest, NextResponse } from 'next/server'
import { connectDb } from '@/lib/db'
import { handleApiError, requireAuth } from '@/lib/middleware'
import { successResponse, ApiError, ERROR_CODES } from '@/lib/api-response'
import { objectId } from '@/lib/route-utils'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    const body = await request.json().catch(() => ({}))
    const db = await connectDb()
    const now = new Date()

    // Determine user role
    const userObjId = objectId(auth.userId)
    const user = await db.collection('users').findOne({
      $or: [{ _id: userObjId }, { id: auth.userId }],
    })

    if (!user) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, 404, 'User account not found')
    }

    const isBusiness = (user.role || '').toLowerCase() === 'business' || (user.role || '').toLowerCase() === 'owner'

    if (isBusiness) {
      // Business KYC Submission
      const {
        gstin,
        companyName,
        registrationType,
        companyRegistrationUrl,
        authorizedSignatoryName,
        authorizedSignatoryDesignation,
        officialWebsite,
      } = body

      if (!companyRegistrationUrl && !gstin) {
        throw new ApiError(
          ERROR_CODES.VALIDATION_ERROR,
          400,
          'Please provide either a valid GSTIN number or an uploaded registration certificate'
        )
      }

      const updateData: Record<string, any> = {
        verificationStatus: 'Pending Review',
        isVerified: false,
        verified: false,
        verificationSubmittedAt: now,
        hasUploadedDocs: true,
        updatedAt: now,
      }

      if (gstin) updateData.gstin = String(gstin).trim().toUpperCase()
      if (companyName) updateData.companyName = String(companyName).trim()
      if (registrationType) updateData.registrationType = String(registrationType).trim()
      if (companyRegistrationUrl) updateData.companyRegistrationUrl = String(companyRegistrationUrl).trim()
      if (authorizedSignatoryName) updateData.contactPersonName = String(authorizedSignatoryName).trim()
      if (authorizedSignatoryDesignation) updateData.contactPersonDesignation = String(authorizedSignatoryDesignation).trim()
      if (officialWebsite) updateData.website = String(officialWebsite).trim()

      await db.collection('businessProfiles').updateOne(
        { userId: auth.userId },
        { $set: updateData },
        { upsert: true }
      )

      await db.collection('users').updateOne(
        { $or: [{ _id: userObjId }, { id: auth.userId }] },
        {
          $set: {
            verificationStatus: 'Pending Review',
            updatedAt: now,
          },
        }
      )

      return NextResponse.json(
        successResponse({
          message: 'Business verification documents submitted successfully. Our admin team will review within 24-48 hours.',
          status: 'Pending Review',
          submittedAt: now,
        })
      )
    } else {
      // Talent KYC Submission
      const {
        govIdType,
        govIdNumber,
        govIdFrontUrl,
        govIdBackUrl,
        selfieUrl,
        dgcaLicenseUrl,
      } = body

      if (!govIdFrontUrl) {
        throw new ApiError(
          ERROR_CODES.VALIDATION_ERROR,
          400,
          'Government photo ID document (Front) is required for talent verification'
        )
      }

      const updateData: Record<string, any> = {
        verificationStatus: 'Pending Review',
        isVerified: false,
        verified: false,
        verificationSubmittedAt: now,
        hasUploadedDocs: true,
        updatedAt: now,
        govIdType: govIdType || 'Government ID',
        govIdFrontUrl: String(govIdFrontUrl).trim(),
      }

      if (govIdNumber) updateData.govIdNumber = String(govIdNumber).trim()
      if (govIdBackUrl) updateData.govIdBackUrl = String(govIdBackUrl).trim()
      if (selfieUrl) updateData.selfieUrl = String(selfieUrl).trim()
      if (dgcaLicenseUrl) updateData.dgcaLicenseUrl = String(dgcaLicenseUrl).trim()

      await db.collection('modelProfiles').updateOne(
        { userId: auth.userId },
        { $set: updateData },
        { upsert: true }
      )

      await db.collection('users').updateOne(
        { $or: [{ _id: userObjId }, { id: auth.userId }] },
        {
          $set: {
            verificationStatus: 'Pending Review',
            updatedAt: now,
          },
        }
      )

      return NextResponse.json(
        successResponse({
          message: 'Talent verification documents submitted successfully. Our admin team will review within 24-48 hours.',
          status: 'Pending Review',
          submittedAt: now,
        })
      )
    }
  } catch (error) {
    return handleApiError(error)
  }
}
