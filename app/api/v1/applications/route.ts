import { NextRequest, NextResponse } from 'next/server'
import { connectDb } from '@/lib/db'
import { requireAuth, handleApiError } from '@/lib/middleware'
import { successResponse } from '@/lib/api-response'
import { queryParam, serialize, objectId } from '@/lib/route-utils'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    const db = await connectDb()
    const status = queryParam(request, 'status')

    let applications = []

    if (auth.role === 'model') {
      const filter: Record<string, unknown> = { userId: auth.userId }
      if (status && status !== 'all') filter.status = status
      applications = await db.collection('applications').find(filter).sort({ createdAt: -1 }).toArray()
    } else {
      // Business user: find all opportunities created by this user
      const opps = await db.collection('opportunities').find({ createdBy: auth.userId }).toArray()
      const oppIds = opps.map((o) => o._id.toString())
      const filter: Record<string, unknown> = { opportunityId: { $in: oppIds } }
      if (status && status !== 'all') filter.status = status
      applications = await db.collection('applications').find(filter).sort({ createdAt: -1 }).toArray()
    }

    // Enrich applications with Opportunity and Model/Business info
    const enriched = await Promise.all(
      applications.map(async (app) => {
        let oppDoc = null
        try {
          oppDoc = await db.collection('opportunities').findOne({ _id: objectId(app.opportunityId) })
        } catch {
          // Fallback if not valid ObjectId
        }

        const modelUser = await db.collection('users').findOne({ _id: objectId(app.userId) })
        const modelProfile = await db.collection('modelProfiles').findOne({ userId: app.userId })

        return {
          ...app,
          opportunityTitle: oppDoc?.title || 'Photoshoot',
          opportunityCategory: oppDoc?.category || oppDoc?.type || 'Fashion',
          opportunityBudgetMin: oppDoc?.budget?.min ?? oppDoc?.budgetMin ?? 2000,
          opportunityBudgetMax: oppDoc?.budget?.max ?? oppDoc?.budgetMax ?? 5000,
          currency: oppDoc?.budget?.currency ?? oppDoc?.currency ?? 'INR',
          engagementType: oppDoc?.engagement_type ?? oppDoc?.engagementType ?? 'hourly',
          date: oppDoc?.date,
          city: oppDoc?.location?.city ?? oppDoc?.city ?? 'Mumbai',
          address: oppDoc?.location?.address ?? oppDoc?.address ?? 'Studio',
          modelName: modelUser ? `${modelUser.firstName} ${modelUser.lastName}` : (app.modelName || 'Model'),
          modelAvatar: modelProfile?.portfolio?.[0] || app.modelAvatar,
          modelSpecialties: modelProfile?.specialties || app.modelSpecialties || ['Editorial'],
          modelRating: modelProfile?.rating || 4.9,
        }
      })
    )

    return NextResponse.json(successResponse(serialize(enriched)))
  } catch (error) {
    return handleApiError(error)
  }
}
