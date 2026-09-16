import { NextRequest, NextResponse } from 'next/server'
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

    // Enrich applications with full Opportunity and Model/Business details
    const enriched = await Promise.all(
      applications.map((app) => enrichApplication(db, app))
    )

    return NextResponse.json(successResponse(serialize(enriched)))
  } catch (error) {
    return handleApiError(error)
  }
}
