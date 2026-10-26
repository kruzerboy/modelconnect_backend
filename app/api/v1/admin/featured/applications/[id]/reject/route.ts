import { NextRequest, NextResponse } from 'next/server'
import { connectDb } from '@/lib/db'
import { handleApiError } from '@/lib/middleware'
import { successResponse, ApiError, ERROR_CODES } from '@/lib/api-response'
import { ObjectId } from 'mongodb'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const db = await connectDb()
    const appsCollection = db.collection('featuredApplications')

    const query = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { _id: id }
    const res = await appsCollection.updateOne(query as any, {
      $set: {
        status: 'rejected',
        rejectedAt: new Date(),
        updatedAt: new Date(),
      },
    })

    if (res.matchedCount === 0) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, 404, 'Application not found')
    }

    return NextResponse.json(successResponse(null, 'Application declined'))
  } catch (error) {
    return handleApiError(error)
  }
}
