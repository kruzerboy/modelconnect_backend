import { NextRequest, NextResponse } from 'next/server'
import { connectDb } from '@/lib/db'
import { handleApiError, requireAdmin } from '@/lib/middleware'
import { successResponse } from '@/lib/api-response'

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request)
    const db = await connectDb()
    const users = await db.collection('users').find({}).sort({ createdAt: -1 }).toArray()
    const userIds = users.map((u) => u._id.toString())

    const [modelProfiles, bizProfiles] = await Promise.all([
      db.collection('modelProfiles').find({ userId: { $in: userIds } }).toArray(),
      db.collection('businessProfiles').find({ userId: { $in: userIds } }).toArray(),
    ])

    const modelMap = new Map(modelProfiles.map((p) => [p.userId?.toString(), p]))
    const bizMap = new Map(bizProfiles.map((p) => [p.userId?.toString(), p]))

    const formatted = users.map((u) => {
      const uid = u._id.toString()
      const mProf = modelMap.get(uid)
      const bProf = bizMap.get(uid)
      const isBiz = u.role === 'business' || u.role === 'owner'
      const prof = isBiz ? bProf : mProf

      return {
        id: uid,
        name:
          isBiz && bProf?.companyName
            ? bProf.companyName
            : `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username || 'Creator',
        handle: u.username ? `@${u.username}` : (u.phone || u.email || '@creator'),
        email: u.email || 'N/A',
        phone: u.phone || u.phoneNumber || mProf?.phone || bProf?.phoneNumber || 'N/A',
        role: u.role || 'model',
        accountStatus: u.accountStatus || 'active',
        suspensionReason: u.suspensionReason || null,
        suspensionScope: u.suspensionScope || null,
        verified: Boolean(u.isVerified || u.verified || prof?.isVerified),
        avatarUrl:
          u.profilePicture ||
          u.avatarUrl ||
          bProf?.logoUrl ||
          (mProf?.portfolio && mProf.portfolio.length > 0 ? mProf.portfolio[0] : null),
        joinedDate: u.createdAt
          ? new Date(u.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })
          : 'Recent',
        city: mProf?.location?.city || bProf?.location?.city || mProf?.city || bProf?.city || 'Mumbai',
        bio: mProf?.bio || bProf?.description || '',
        portfolio: mProf?.portfolio || [],
        rating: prof?.rating || prof?.ratings?.average || 0,
        reviewCount: prof?.reviewCount || prof?.ratings?.count || 0,
        companyName: bProf?.companyName || null,
        website: bProf?.website || null,
        instagram: mProf?.instagram || mProf?.socialHandle || null,
        height: mProf?.height || null,
        measurements: mProf?.measurements || null,
        gear: mProf?.gear || mProf?.equipment || null,
        experience: mProf?.experience || null,
        dailyRate: mProf?.dailyRate || bProf?.dailyRate || 0,
        hourlyRate: mProf?.hourlyRate || 0,
        shootsCompleted: u.shootsCompleted || 0,
        strikeCount: u.strikeCount || 0,
        deletionRequestedAt: u.deletionRequestedAt || null,
      }
    })

    return NextResponse.json(successResponse(formatted))
  } catch (error) {
    return handleApiError(error)
  }
}
