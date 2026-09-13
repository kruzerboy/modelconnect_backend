import { NextRequest, NextResponse } from 'next/server'
import { connectDb } from '@/lib/db'
import { requireAuth, handleApiError } from '@/lib/middleware'
import { successResponse } from '@/lib/api-response'
import { createPaginatedResponse, getPaginationParams } from '@/lib/helpers'
import { queryParam, serialize } from '@/lib/route-utils'

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request)
    const page = Number(queryParam(request, 'page', '1')); const limit = Number(queryParam(request, 'limit', '20')); const pagination = getPaginationParams(page, limit)
    const filter: Record<string, unknown> = {}
    const specialty = queryParam(request, 'specialty'); if (specialty) filter.specialties = specialty
    const location = queryParam(request, 'location'); if (location) filter.location = { $regex: location, $options: 'i' }
    const db = await connectDb(); const profiles = db.collection('modelProfiles'); const total = await profiles.countDocuments(filter)
    const data = await profiles.find(filter).sort({ 'ratings.average': -1, updatedAt: -1 }).skip(pagination.skip).limit(pagination.limit).toArray()
    return NextResponse.json(successResponse(createPaginatedResponse(serialize(data), pagination.page, pagination.limit, total)))
  } catch (error) { return handleApiError(error) }
}
