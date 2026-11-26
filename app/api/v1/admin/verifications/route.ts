import { NextRequest, NextResponse } from 'next/server'
import { connectDb } from '@/lib/db'
import { handleApiError, requireAdmin } from '@/lib/middleware'
import { successResponse } from '@/lib/api-response'
import { objectId } from '@/lib/route-utils'

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request)
    const db = await connectDb()
    const usersColl = db.collection('users')

    // Fetch both modelProfiles and businessProfiles
    const [modelProfiles, bizProfiles] = await Promise.all([
      db.collection('modelProfiles').find({}).sort({ updatedAt: -1 }).limit(100).toArray(),
      db.collection('businessProfiles').find({}).sort({ updatedAt: -1 }).limit(100).toArray(),
    ])

    // Fetch associated users
    const allUserIds = [
      ...modelProfiles.map((p) => p.userId).filter(Boolean),
      ...bizProfiles.map((p) => p.userId).filter(Boolean),
    ]

    const users = await usersColl
      .find({
        $or: [
          { _id: { $in: allUserIds.map((id) => objectId(id)) } },
          { id: { $in: allUserIds } },
        ],
      })
      .toArray()

    const userMap = new Map()
    users.forEach((u) => {
      userMap.set(u._id.toString(), u)
      if (u.id) userMap.set(u.id, u)
    })

    // 1. Format Talent Verifications
    const talentList = modelProfiles.map((prof) => {
      const user = userMap.get(prof.userId?.toString())
      const realPortfolio: string[] = Array.isArray(prof.portfolio)
        ? prof.portfolio.filter((p: any) => typeof p === 'string' && p.trim().length > 0)
        : []
      const realCompCard = prof.compCardUrl || realPortfolio[0] || null
      const realGovId = prof.govIdFrontUrl || prof.govIdUrl || null

      const rawStatus = prof.verificationStatus || (prof.isVerified ? 'Approved' : 'Pending Review')
      let status: 'Pending Review' | 'Approved' | 'Rejected' = 'Pending Review'
      if (rawStatus.toLowerCase() === 'approved' || prof.isVerified === true) {
        status = 'Approved'
      } else if (rawStatus.toLowerCase() === 'rejected') {
        status = 'Rejected'
      }

      return {
        id: prof._id.toString(),
        userId: prof.userId,
        type: 'talent',
        name: user
          ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'Creator'
          : 'Talent Candidate',
        handle: user?.username ? `@${user.username}` : (user?.phone || user?.email || '@creator'),
        email: user?.email || 'N/A',
        phone: user?.phone || user?.phoneNumber || prof.phone || 'N/A',
        role: user?.role || 'model',
        avatarUrl: user?.profilePicture || user?.avatarUrl || realCompCard || null,
        city: prof.location?.city || prof.city || 'Mumbai',
        submittedAt: prof.updatedAt
          ? new Date(prof.updatedAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })
          : 'Recent',
        status,
        documents: {
          compCardUrl: realCompCard,
          govIdFrontUrl: realGovId,
          portfolioLinks: realPortfolio,
        },
        compCardData: {
          height: prof.height || null,
          measurements: prof.measurements || null,
          shoeSize: prof.shoeSize || null,
          hairColor: prof.hairColor || null,
          eyeColor: prof.eyeColor || null,
          gear: prof.gear || prof.equipment || null,
          experience: prof.experience || null,
        },
        notes: prof.verificationNotes || '',
      }
    })

    // 2. Format Business & Studio Verifications
    const businessList = bizProfiles.map((prof) => {
      const user = userMap.get(prof.userId?.toString())
      const rawStatus = prof.verificationStatus || (prof.isVerified ? 'Approved' : 'Pending Review')
      let status: 'Pending Review' | 'Approved' | 'Rejected' = 'Pending Review'
      if (rawStatus.toLowerCase() === 'approved' || prof.isVerified === true) {
        status = 'Approved'
      } else if (rawStatus.toLowerCase() === 'rejected') {
        status = 'Rejected'
      }

      return {
        id: prof._id.toString(),
        userId: prof.userId,
        type: 'business',
        name: prof.companyName || (user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Studio Client'),
        handle: user?.username ? `@${user.username}` : (user?.phone || user?.email || '@business'),
        email: user?.email || prof.email || 'N/A',
        phone: user?.phone || user?.phoneNumber || prof.phoneNumber || 'N/A',
        role: 'business',
        avatarUrl: prof.logoUrl || user?.profilePicture || user?.avatarUrl || null,
        city: prof.location?.city || prof.city || 'Mumbai',
        submittedAt: prof.updatedAt
          ? new Date(prof.updatedAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })
          : 'Recent',
        status,
        businessData: {
          companyName: prof.companyName || 'Registered Business',
          industry: prof.industry || prof.business_type || 'Production / Media',
          website: prof.website || null,
          contactPersonName: prof.contactPersonName || (user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : null),
          contactPersonDesignation: prof.contactPersonDesignation || 'Authorized Signatory',
          verificationUrl: prof.verificationUrl || null,
        },
        documents: {
          compCardUrl: prof.logoUrl || null,
          govIdFrontUrl: prof.verificationUrl || null,
          portfolioLinks: [],
        },
        notes: prof.verificationNotes || '',
      }
    })

    const combined = [...talentList, ...businessList]
    return NextResponse.json(successResponse(combined))
  } catch (error) {
    return handleApiError(error)
  }
}
