import { NextRequest, NextResponse } from 'next/server'
import { connectDb } from '@/lib/db'
import { requireAuth, handleApiError } from '@/lib/middleware'
import { successResponse } from '@/lib/api-response'
import { serialize, objectId } from '@/lib/route-utils'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    const db = await connectDb()

    // 1. Direct shoots from shoots collection if any exist
    const directShoots = await db.collection('shoots').find({
      $or: [{ modelId: auth.userId }, { businessId: auth.userId }, { createdBy: auth.userId }]
    }).toArray()

    // 2. Shoots derived from accepted applications
    let acceptedApps = []
    if (auth.role === 'model') {
      acceptedApps = await db.collection('applications').find({
        userId: auth.userId,
        status: { $in: ['accepted', 'booked', 'hired', 'confirmed'] }
      }).toArray()
    } else {
      const opps = await db.collection('opportunities').find({ createdBy: auth.userId }).toArray()
      const oppIds = opps.map((o) => o._id.toString())
      acceptedApps = await db.collection('applications').find({
        opportunityId: { $in: oppIds },
        status: { $in: ['accepted', 'booked', 'hired', 'confirmed'] }
      }).toArray()
    }

    const appShoots = await Promise.all(
      acceptedApps.map(async (app) => {
        let opp = null
        try {
          opp = await db.collection('opportunities').findOne({ _id: objectId(app.opportunityId) })
        } catch {}

        const businessUser = opp?.createdBy ? await db.collection('users').findOne({ _id: objectId(opp.createdBy) }) : null
        const businessProfile = opp?.createdBy ? await db.collection('businessProfiles').findOne({ userId: opp.createdBy }) : null
        const modelUser = await db.collection('users').findOne({ _id: objectId(app.userId) })
        const modelProfile = await db.collection('modelProfiles').findOne({ userId: app.userId })

        const shootDate = opp?.date ? new Date(opp.date) : new Date(Date.now() + 5 * 86400000)

        return {
          id: app._id.toString(),
          opportunityId: app.opportunityId,
          title: opp?.title || 'Brand Campaign Shoot',
          category: opp?.category || opp?.type || 'Campaign',
          businessName: businessProfile?.companyName || (businessUser ? `${businessUser.firstName} ${businessUser.lastName}` : 'Studio Partner'),
          modelName: modelUser ? `${modelUser.firstName} ${modelUser.lastName}` : (app.modelName || 'Model'),
          modelAvatar: modelProfile?.portfolio?.[0] || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
          date: shootDate.toISOString(),
          startTime: opp?.start_time || opp?.startTime || '10:00',
          endTime: opp?.end_time || opp?.endTime || '16:00',
          durationHours: opp?.duration_minutes ? Math.round(opp.duration_minutes / 60) : 6,
          city: opp?.location?.city || opp?.city || 'Mumbai',
          address: opp?.location?.address || opp?.address || 'Production Studio 4',
          agreedRate: app.proposedPrice || opp?.budget?.min || 15000,
          currency: opp?.budget?.currency || opp?.currency || 'INR',
          engagementType: opp?.engagement_type || opp?.engagementType || 'daily',
          status: 'confirmed',
          callSheetNotes: opp?.additional_requirements || 'Please arrive 15 minutes before call time with clean makeup base.',
          isPaid: false,
        }
      })
    )

    const allShoots = [...serialize(directShoots), ...appShoots]
    return NextResponse.json(successResponse(allShoots))
  } catch (error) {
    return handleApiError(error)
  }
}
