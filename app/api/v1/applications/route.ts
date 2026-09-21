import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { connectDb } from '@/lib/db'
import { requireAuth, handleApiError } from '@/lib/middleware'
import { successResponse } from '@/lib/api-response'
import { queryParam, serialize } from '@/lib/route-utils'
import { enrichApplication } from '@/lib/helpers'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    const db = await connectDb()
    const status = queryParam(request, 'status')

    let applications = []

    if (auth.role !== 'business') {
      // Creative talents (models, camera crew, drone operators): find their submitted applications
      const filter: Record<string, unknown> = {
        $or: [
          { userId: auth.userId },
          ...(ObjectId.isValid(auth.userId) ? [{ userId: new ObjectId(auth.userId) }] : []),
        ]
      }
      if (status && status !== 'all') filter.status = status
      applications = await db.collection('applications').find(filter).sort({ createdAt: -1 }).toArray()
    } else {
      // Business user: find all opportunities created by this business owner
      const opps = await db.collection('opportunities').find({
        $or: [
          { createdBy: auth.userId },
          ...(ObjectId.isValid(auth.userId) ? [{ createdBy: new ObjectId(auth.userId) }] : []),
          { businessOwnerId: auth.userId },
          ...(ObjectId.isValid(auth.userId) ? [{ businessOwnerId: new ObjectId(auth.userId) }] : []),
        ]
      }).toArray()

      const oppIds = opps.map((o) => o._id.toString())
      const oppObjIds = opps.map((o) => o._id)
      const allIds = [...oppIds, ...oppObjIds]

      const filter: Record<string, unknown> = {
        $or: [
          { opportunityId: { $in: allIds } },
          { 'opportunity._id': { $in: allIds } },
        ]
      }
      if (status && status !== 'all') filter.status = status
      applications = await db.collection('applications').find(filter).sort({ createdAt: -1 }).toArray()
    }

    // Enrich applications with full Opportunity and Model/Business details
    const enriched = await Promise.all(
      applications.map((app) => enrichApplication(db, app))
    )

    return NextResponse.json(successResponse(serialize(enriched)))
  } catch (error) {
    return handleApiError(error)
  }
}
