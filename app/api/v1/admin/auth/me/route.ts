import { NextRequest, NextResponse } from 'next/server'
import { connectDb } from '@/lib/db'
import { requireAdmin, handleApiError } from '@/lib/middleware'
import { successResponse, ApiError, ERROR_CODES } from '@/lib/api-response'
import { serialize } from '@/lib/route-utils'
import { ObjectId } from 'mongodb'
import { getAdminCollection } from '@/lib/admin-auth'

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    },
  })
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    const db = await connectDb()
    const adminCollection = await getAdminCollection(db)

    let adminDoc = null
    if (ObjectId.isValid(auth.userId)) {
      adminDoc = await adminCollection.findOne({ _id: new ObjectId(auth.userId) })
    }

    if (!adminDoc) {
      // Fallback search in standard users collection
      if (ObjectId.isValid(auth.userId)) {
        adminDoc = await db.collection('users').findOne({ _id: new ObjectId(auth.userId) })
      }
    }

    if (!adminDoc) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, 404, 'Admin account not found')
    }

    const adminData = adminDoc as any
    return NextResponse.json(
      successResponse({
        admin: serialize({
          id: adminData._id,
          email: adminData.email,
          name: adminData.name || adminData.fullName || 'Admin User',
          role: auth.role,
        }),
      })
    )
  } catch (error) {
    return handleApiError(error)
  }
}
