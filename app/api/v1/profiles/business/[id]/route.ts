import { NextRequest, NextResponse } from 'next/server'
import { connectDb } from '@/lib/db'
import { handleApiError } from '@/lib/middleware'
import { ApiError, ERROR_CODES, successResponse } from '@/lib/api-response'
import { serialize } from '@/lib/route-utils'
import { ObjectId } from 'mongodb'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    if (!id || !id.trim()) {
      throw new ApiError(ERROR_CODES.VALIDATION_ERROR, 400, 'Business ID or User ID is required')
    }

    const db = await connectDb()
    const isObjectId = ObjectId.isValid(id)
    const objId = isObjectId ? new ObjectId(id) : null

    // Find profile in businessProfiles by userId or _id
    const queryOr: any[] = [{ userId: id }]
    if (objId) queryOr.push({ _id: objId })

    let profile = await db.collection('businessProfiles').findOne({ $or: queryOr })

    // Also look up corresponding user in users collection
    const targetUserId = profile?.userId || id
    const isTargetUserObjectId = ObjectId.isValid(targetUserId)
    const userQueryOr: any[] = [{ _id: isTargetUserObjectId ? new ObjectId(targetUserId) : targetUserId }]
    if (objId) userQueryOr.push({ _id: objId })

    const user = await db.collection('users').findOne({ $or: userQueryOr })

    if (!profile && !user) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, 404, 'Business profile not found')
    }

    // Opportunity metrics
    const totalOpportunities = await db.collection('opportunities').countDocuments({ createdBy: targetUserId })
    const activeOpportunities = await db.collection('opportunities').countDocuments({
      createdBy: targetUserId,
      status: 'open',
      deadline: { $gte: new Date() },
    })

    const fullName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : ''
    const companyName =
      profile?.companyName ||
      (fullName.length > 0 ? fullName : 'Business Account')

    const responseData = {
      id: profile?._id?.toString() || user?._id?.toString() || id,
      userId: targetUserId,
      companyName,
      email: profile?.email || user?.email || '',
      phone: profile?.phoneNumber || user?.phoneNumber || '',
      phoneNumber: profile?.phoneNumber || user?.phoneNumber || '',
      industry: profile?.industry || 'Production & Creative Studio',
      description: profile?.description || '',
      website: profile?.website || '',
      city: profile?.location?.city || profile?.city || user?.city || '',
      country: profile?.location?.country || profile?.country || user?.country || 'India',
      logoUrl: profile?.logoUrl || user?.avatarUrl || '',
      socialHandle: profile?.socialHandle || user?.socialHandle || '',
      isFeatured: profile?.isFeatured === true,
      isVerified: true,
      totalOpportunities,
      activeOpportunities,
      memberSince: user?.createdAt || profile?.createdAt || null,
    }

    return NextResponse.json(successResponse(serialize(responseData)))
  } catch (error) {
    return handleApiError(error)
  }
}
