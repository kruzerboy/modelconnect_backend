import { NextRequest, NextResponse } from 'next/server'
import { connectDb } from '@/lib/db'
import { requireAuth, handleApiError } from '@/lib/middleware'
import { successResponse } from '@/lib/api-response'
import { objectId, serialize } from '@/lib/route-utils'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    const db = await connectDb()

    const user = await db.collection('users').findOne({
      _id: objectId(auth.userId),
    })

    // Count opportunities already posted by this user
    const postedCount = await db.collection('opportunities').countDocuments({
      createdBy: auth.userId,
    })

    // Fetch latest active subscription
    const latestSub = await db
      .collection('subscriptions')
      .find({ userId: auth.userId, status: 'active' })
      .sort({ createdAt: -1 })
      .limit(1)
      .toArray()

    const sub = latestSub.length > 0 ? latestSub[0] : null

    const availablePosts =
      user?.availableOpportunityPosts !== undefined
        ? user.availableOpportunityPosts
        : 1 // Default free initial post for launch phase

    return NextResponse.json(
      successResponse({
        isSubscribed: Boolean(user?.isSubscribed),
        currentPlan: user?.currentPlan || (availablePosts > 0 ? 'starter_trial' : 'none'),
        currentPlanName: user?.currentPlanName || (availablePosts > 0 ? 'Early Launch Free Trial' : 'No Active Plan'),
        availableOpportunityPosts: availablePosts,
        totalOpportunitiesPosted: postedCount,
        planValidUntil: user?.planValidUntil ? new Date(user.planValidUntil).toISOString() : null,
        latestSubscription: sub ? serialize(sub) : null,
      })
    )
  } catch (error) {
    return handleApiError(error)
  }
}
