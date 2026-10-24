import { NextRequest, NextResponse } from 'next/server'
import { connectDb } from '@/lib/db'
import { requireAuth, handleApiError } from '@/lib/middleware'
import { successResponse } from '@/lib/api-response'
import { createPaginatedResponse, getPaginationParams } from '@/lib/helpers'
import { queryParam, serialize } from '@/lib/route-utils'

export async function GET(request: NextRequest) {
  try {
    const page = Number(queryParam(request, 'page', '1'))
    const limit = Number(queryParam(request, 'limit', '20'))
    const pagination = getPaginationParams(page, limit)
    
    const filter: Record<string, unknown> = {}
    const specialty = queryParam(request, 'specialty')
    if (specialty) filter.specialties = specialty
    
    const location = queryParam(request, 'location')
    if (location) filter.location = { $regex: location, $options: 'i' }

    const db = await connectDb()
    const profiles = db.collection('modelProfiles')
    const total = await profiles.countDocuments(filter)

    const rawData = await profiles
      .find(filter)
      .sort({ 'ratings.average': -1, updatedAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .toArray()

    // Enrich profiles with User information if available
    const userIds = rawData
      .map((p) => p.userId)
      .filter((id): id is string => typeof id === 'string' && id.length > 0)

    let userMap: Record<string, any> = {}
    if (userIds.length > 0) {
      const usersCollection = db.collection('users')
      const { ObjectId } = require('mongodb') as typeof import('mongodb')
      const objectIds = userIds.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id))
      const users = await usersCollection
        .find({
          $or: [
            { _id: { $in: objectIds } },
            { id: { $in: userIds } },
          ],
        })
        .project({ firstName: 1, lastName: 1, role: 1, profilePicture: 1, avatarUrl: 1, email: 1 })
        .toArray()

      for (const u of users) {
        const key = u._id ? u._id.toString() : u.id
        userMap[key] = u
      }
    }

    const data = rawData.map((p) => {
      const u = p.userId ? userMap[p.userId] : null
      const fullName = u
        ? `${u.firstName || ''} ${u.lastName || ''}`.trim()
        : p.name || ''
      return {
        ...p,
        name: fullName || p.name || 'Creative Professional',
        role: u?.role || p.role || 'model',
        avatarUrl: u?.profilePicture || u?.avatarUrl || (p.portfolio && p.portfolio.length > 0 ? p.portfolio[0] : null),
      }
    })

    return NextResponse.json(
      successResponse(
        createPaginatedResponse(serialize(data), pagination.page, pagination.limit, total)
      )
    )
  } catch (error) {
    return handleApiError(error)
  }
}
