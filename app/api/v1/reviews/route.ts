import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { connectDb } from '@/lib/db'
import { requireAuth, handleApiError } from '@/lib/middleware'
import { successResponse, ApiError, ERROR_CODES } from '@/lib/api-response'
import { serialize, objectId } from '@/lib/route-utils'
import { createNotification } from '@/lib/helpers'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    let targetUserId = searchParams.get('userId')
    const opportunityId = searchParams.get('opportunityId')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '50', 10)))

    const db = await connectDb()

    // If no userId supplied, try current authenticated user
    if (!targetUserId) {
      try {
        const auth = await requireAuth(request)
        targetUserId = auth.userId
      } catch {
        // Unauthenticated and no target specified
      }
    }

    if (!targetUserId) {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, 400, 'userId parameter is required')
    }

    const query: Record<string, any> = { targetUserId: String(targetUserId) }
    if (opportunityId) {
      query.opportunityId = String(opportunityId)
    }

    const totalReviews = await db.collection('reviews').countDocuments(query)
    const reviews = await db
      .collection('reviews')
      .find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray()

    // Calculate dynamic rating breakdown and average
    const allUserReviews = await db.collection('reviews').find({ targetUserId: String(targetUserId) }).toArray()
    const breakdown: Record<string, number> = { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 }
    let totalScore = 0

    for (const r of allUserReviews) {
      const rounded = Math.round(r.rating || 5)
      const key = String(Math.max(1, Math.min(5, rounded)))
      breakdown[key] = (breakdown[key] || 0) + 1
      totalScore += (r.rating || 5)
    }

    const averageRating = allUserReviews.length > 0
      ? Math.round((totalScore / allUserReviews.length) * 10) / 10
      : 5.0

    return NextResponse.json(
      successResponse({
        targetUserId,
        averageRating,
        totalReviews: allUserReviews.length,
        ratingBreakdown: breakdown,
        page,
        limit,
        reviews: serialize(reviews),
      })
    )
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    const body = await request.json().catch(() => ({}))
    const { targetUserId, opportunityId, applicationId, rating, comment, tags } = body

    if (!targetUserId) {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, 400, 'targetUserId is required')
    }

    if (String(targetUserId) === String(auth.userId)) {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, 400, 'You cannot review your own profile')
    }

    const numericRating = Number(rating)
    if (isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, 400, 'Rating must be a number between 1 and 5')
    }

    const db = await connectDb()

    // Fetch reviewer info
    const reviewerUser = await db.collection('users').findOne({ _id: objectId(auth.userId) })
    let reviewerName = reviewerUser ? `${reviewerUser.firstName || ''} ${reviewerUser.lastName || ''}`.trim() : 'BookShoot Member'
    let reviewerAvatar = reviewerUser?.avatarUrl || ''

    if (auth.role === 'business') {
      const bProfile = await db.collection('businessProfiles').findOne({ userId: auth.userId })
      if (bProfile?.companyName) {
        reviewerName = bProfile.companyName
      }
      if (bProfile?.logo) {
        reviewerAvatar = bProfile.logo
      }
    } else {
      const mProfile = await db.collection('modelProfiles').findOne({ userId: auth.userId })
      if (mProfile?.name) {
        reviewerName = mProfile.name
      }
      if (mProfile?.avatarUrl) {
        reviewerAvatar = mProfile.avatarUrl
      }
    }

    // Resolve Opportunity Title if opportunityId passed
    let opportunityTitle = ''
    if (opportunityId) {
      try {
        const opp = await db.collection('opportunities').findOne({ _id: objectId(opportunityId) })
        opportunityTitle = opp?.title || ''
      } catch {}
    }

    const parsedTags = Array.isArray(tags)
      ? tags.map((t) => String(t).trim()).filter((t) => t.length > 0 && t.length < 50)
      : []

    const now = new Date()

    // Check if an existing review for this opportunity already exists between these two users
    let reviewResult: any = null
    const existingFilter: Record<string, any> = {
      reviewerId: String(auth.userId),
      targetUserId: String(targetUserId),
    }
    if (opportunityId) {
      existingFilter.opportunityId = String(opportunityId)
    }

    const existingReview = await db.collection('reviews').findOne(existingFilter)

    if (existingReview) {
      // Update existing review
      await db.collection('reviews').updateOne(
        { _id: existingReview._id },
        {
          $set: {
            rating: numericRating,
            comment: String(comment || '').trim(),
            tags: parsedTags,
            reviewerName,
            reviewerAvatar,
            opportunityTitle: opportunityTitle || existingReview.opportunityTitle,
            updatedAt: now,
          },
        }
      )
      reviewResult = await db.collection('reviews').findOne({ _id: existingReview._id })
    } else {
      // Insert new review
      const newReviewDoc = {
        _id: new ObjectId(),
        targetUserId: String(targetUserId),
        reviewerId: String(auth.userId),
        reviewerName,
        reviewerAvatar,
        reviewerRole: auth.role || 'user',
        rating: numericRating,
        comment: String(comment || '').trim(),
        tags: parsedTags,
        opportunityId: opportunityId ? String(opportunityId) : null,
        applicationId: applicationId ? String(applicationId) : null,
        opportunityTitle,
        createdAt: now,
        updatedAt: now,
      }
      await db.collection('reviews').insertOne(newReviewDoc)
      reviewResult = newReviewDoc
    }

    // ─────────────────────────────────────────────────────────────
    // Recalculate target user's aggregated ratings in MongoDB
    // ─────────────────────────────────────────────────────────────
    const allTargetReviews = await db.collection('reviews').find({ targetUserId: String(targetUserId) }).toArray()
    const totalCount = allTargetReviews.length
    const totalScore = allTargetReviews.reduce((sum, r) => sum + (r.rating || 5), 0)
    const newAverage = totalCount > 0 ? Math.round((totalScore / totalCount) * 10) / 10 : numericRating

    const ratingUpdate = {
      rating: newAverage,
      reviewCount: totalCount,
      ratings: {
        average: newAverage,
        count: totalCount,
      },
      updatedAt: now,
    }

    // Update in users
    try {
      await db.collection('users').updateOne(
        { _id: objectId(targetUserId) },
        { $set: ratingUpdate }
      )
    } catch {}

    // Update in modelProfiles
    try {
      await db.collection('modelProfiles').updateOne(
        { userId: String(targetUserId) },
        { $set: ratingUpdate }
      )
    } catch {}

    // Update in businessProfiles
    try {
      await db.collection('businessProfiles').updateOne(
        { userId: String(targetUserId) },
        { $set: ratingUpdate }
      )
    } catch {}

    // ─────────────────────────────────────────────────────────────
    // Send in-app notification & push alert to recipient
    // ─────────────────────────────────────────────────────────────
    try {
      await createNotification(
        db,
        String(targetUserId),
        'new_review',
        `New Review Received! ★ ${numericRating.toFixed(1)}`,
        `${reviewerName} gave you a ${numericRating}-star review: "${(comment || 'Great experience working together!').slice(0, 80)}"`,
        {
          reviewId: reviewResult._id.toString(),
          rating: String(numericRating),
          opportunityId: opportunityId ? String(opportunityId) : '',
        }
      )
    } catch (notifErr) {
      console.warn('[Review] Notification dispatch failed:', notifErr)
    }

    return NextResponse.json(
      successResponse({
        review: serialize(reviewResult),
        aggregated: {
          averageRating: newAverage,
          totalReviews: totalCount,
        },
      }),
      { status: existingReview ? 200 : 201 }
    )
  } catch (error) {
    return handleApiError(error)
  }
}
