import { NextRequest, NextResponse } from 'next/server'
import { connectDb } from '@/lib/db'
import { requireAdmin, handleApiError } from '@/lib/middleware'
import { successResponse, ApiError, ERROR_CODES } from '@/lib/api-response'
import { verifyPassword, hashPassword } from '@/lib/auth'
import { ObjectId } from 'mongodb'
import { getAdminCollection } from '@/lib/admin-auth'

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    },
  })
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    const body = await request.json().catch(() => ({}))
    const currentPassword = String(body.currentPassword || '')
    const newPassword = String(body.newPassword || '')

    if (!currentPassword || !newPassword) {
      throw new ApiError(
        ERROR_CODES.VALIDATION_ERROR,
        400,
        'Current password and new password are required'
      )
    }

    if (newPassword.length < 8) {
      throw new ApiError(
        ERROR_CODES.VALIDATION_ERROR,
        400,
        'New password must be at least 8 characters'
      )
    }

    const db = await connectDb()
    const adminCollection = await getAdminCollection(db)

    let adminDoc = null
    let isDedicatedAdmin = true

    if (ObjectId.isValid(auth.userId)) {
      adminDoc = await adminCollection.findOne({ _id: new ObjectId(auth.userId) })
    }

    if (!adminDoc && ObjectId.isValid(auth.userId)) {
      adminDoc = await db.collection('users').findOne({ _id: new ObjectId(auth.userId) })
      isDedicatedAdmin = false
    }

    if (!adminDoc) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, 404, 'Admin account not found')
    }

    const isValidCurrent = await verifyPassword(currentPassword, adminDoc.passwordHash)
    if (!isValidCurrent) {
      throw new ApiError(
        ERROR_CODES.INVALID_CREDENTIALS,
        400,
        'Incorrect current password'
      )
    }

    const newPasswordHash = await hashPassword(newPassword)
    if (isDedicatedAdmin) {
      await adminCollection.updateOne(
        { _id: adminDoc._id },
        { $set: { passwordHash: newPasswordHash, updatedAt: new Date() } }
      )
    } else {
      await db.collection('users').updateOne(
        { _id: adminDoc._id },
        { $set: { passwordHash: newPasswordHash, updatedAt: new Date() } }
      )
    }

    return NextResponse.json(
      successResponse(null, 'Admin password updated successfully')
    )
  } catch (error) {
    return handleApiError(error)
  }
}
