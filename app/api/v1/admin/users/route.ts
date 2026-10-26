import { NextRequest, NextResponse } from 'next/server'
import { connectDb } from '@/lib/db'
import { handleApiError } from '@/lib/middleware'
import { successResponse } from '@/lib/api-response'

export async function GET(request: NextRequest) {
  try {
    const db = await connectDb()
    const users = await db.collection('users').find({}).sort({ createdAt: -1 }).toArray()

    const formatted = users.map((u) => ({
      id: u._id.toString(),
      name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username || 'Creator',
      handle: u.username ? `@${u.username}` : (u.phone || u.email || '@creator'),
      email: u.email || 'N/A',
      phone: u.phone || 'N/A',
      role: u.role || 'model',
      accountStatus: u.accountStatus || 'active',
      verified: Boolean(u.isVerified || u.verified),
      avatarUrl:
        u.profilePicture ||
        u.avatarUrl ||
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      joinedDate: u.createdAt
        ? new Date(u.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })
        : 'Recent',
      shootsCompleted: u.shootsCompleted || 0,
      strikeCount: u.strikeCount || 0,
    }))

    return NextResponse.json(successResponse(formatted))
  } catch (error) {
    return handleApiError(error)
  }
}
