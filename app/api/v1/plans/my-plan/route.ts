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

    const isBusiness = user?.role === 'business' || user?.role === 'owner' || user?.role === 'client'

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
        : (isBusiness ? 1 : 0)

    const defaultPlanName = isBusiness
      ? (availablePosts > 0 ? 'Early Launch Free Trial' : 'No Active Plan')
      : (user?.isSubscribed ? 'Model Pro Creator' : 'Talent Standard Access')

    const defaultPlanCode = isBusiness
      ? (availablePosts > 0 ? 'starter_trial' : 'none')
      : (user?.isSubscribed ? 'model_pro' : 'talent_free')

    return NextResponse.json(
      successResponse({
        isSubscribed: Boolean(user?.isSubscribed),
        userRole: user?.role || (isBusiness ? 'business' : 'model'),
        currentPlan: user?.currentPlan || defaultPlanCode,
        currentPlanName: user?.currentPlanName || defaultPlanName,
        availableOpportunityPosts: availablePosts,
        availableApplications: user?.availableApplications !== undefined ? user.availableApplications : (user?.isSubscribed ? 999 : 10),
        totalOpportunitiesPosted: postedCount,
        planValidUntil: user?.planValidUntil ? new Date(user.planValidUntil).toISOString() : null,
        latestSubscription: sub ? serialize(sub) : null,
      })
    )
  } catch (error) {
    return handleApiError(error)
  }
}
