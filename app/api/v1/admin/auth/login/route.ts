import { NextRequest, NextResponse } from 'next/server'
import { connectDb } from '@/lib/db'
import { verifyPassword, createAccessToken } from '@/lib/auth'
import { successResponse, ApiError, ERROR_CODES } from '@/lib/api-response'
import { handleApiError } from '@/lib/middleware'
import { serialize } from '@/lib/route-utils'
import { ensureInitialAdmin, getAdminCollection } from '@/lib/admin-auth'

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    },
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const email = String(body.email || '').toLowerCase().trim()
    const password = String(body.password || '')

    if (!email || !password) {
      throw new ApiError(
        ERROR_CODES.VALIDATION_ERROR,
        400,
        'Email and password are required'
      )
    }

    const db = await connectDb()
    await ensureInitialAdmin(db)
    const adminCollection = await getAdminCollection(db)

    // First, look up in dedicated adminUsers collection
    let adminUser = await adminCollection.findOne({ email })

    // Fallback: Check if user exists in main users collection with role: 'admin'
    if (!adminUser) {
      const standardUser = await db.collection('users').findOne({
        email,
        role: { $in: ['admin', 'superadmin'] },
      })
      if (standardUser) {
        adminUser = {
          _id: standardUser._id,
          email: standardUser.email,
          passwordHash: standardUser.passwordHash,
          name: standardUser.fullName || standardUser.name || 'Admin User',
          role: 'admin',
          active: standardUser.accountStatus !== 'suspended',
          createdAt: standardUser.createdAt || new Date(),
          updatedAt: standardUser.updatedAt || new Date(),
        }
      }
    }

    if (!adminUser) {
      throw new ApiError(
        ERROR_CODES.INVALID_CREDENTIALS,
        401,
        'Invalid administrative credentials'
      )
    }

    if (adminUser.active === false) {
      throw new ApiError(
        ERROR_CODES.FORBIDDEN,
        403,
        'Administrative account has been disabled'
      )
    }

    const isValidPassword = await verifyPassword(password, adminUser.passwordHash)
    if (!isValidPassword) {
      throw new ApiError(
        ERROR_CODES.INVALID_CREDENTIALS,
        401,
        'Invalid administrative credentials'
      )
    }

    // Generate Admin JWT Token
    const adminId = adminUser._id ? adminUser._id.toString() : 'admin'
    const token = await createAccessToken(adminId, adminUser.role || 'admin')

    // Update last login
    if (adminUser._id) {
      await adminCollection.updateOne(
        { _id: adminUser._id },
        {
          $set: {
            lastLoginAt: new Date(),
            lastLoginIp: request.headers.get('x-forwarded-for') || 'unknown',
            updatedAt: new Date(),
          },
        }
      ).catch(() => {})
    }

    return NextResponse.json(
      successResponse({
        token,
        admin: serialize({
          id: adminId,
          email: adminUser.email,
          name: adminUser.name,
          role: adminUser.role,
        }),
      }, 'Admin authentication successful')
    )
  } catch (error) {
    return handleApiError(error)
  }
}
