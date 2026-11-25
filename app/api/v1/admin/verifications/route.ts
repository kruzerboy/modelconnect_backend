import { NextRequest, NextResponse } from 'next/server'
import { connectDb } from '@/lib/db'
import { handleApiError, requireAdmin } from '@/lib/middleware'
import { successResponse } from '@/lib/api-response'
import { objectId } from '@/lib/route-utils'

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request)
    const db = await connectDb()
    const pendingProfiles = await db
      .collection('modelProfiles')
      .find({})
      .limit(50)
      .toArray()

    const usersColl = db.collection('users')
    const list = await Promise.all(
      pendingProfiles.map(async (prof) => {
        let user = null
        try {
          user = await usersColl.findOne({ _id: objectId(prof.userId) })
        } catch {
          user = await usersColl.findOne({ id: prof.userId })
        }

        const realPortfolio: string[] = Array.isArray(prof.portfolio)
          ? prof.portfolio.filter((p: any) => typeof p === 'string' && p.trim().length > 0)
          : []
        const realCompCard = prof.compCardUrl || realPortfolio[0] || null
        const realGovId = prof.govIdFrontUrl || prof.govIdUrl || null

        const rawStatus = prof.verificationStatus || (prof.isVerified ? 'Approved' : 'Pending Review')
        // Normalize status
        let status: 'Pending Review' | 'Approved' | 'Rejected' = 'Pending Review'
        if (rawStatus.toLowerCase() === 'approved' || prof.isVerified === true) {
          status = 'Approved'
        } else if (rawStatus.toLowerCase() === 'rejected') {
          status = 'Rejected'
        }

        return {
          id: prof._id.toString(),
          userId: prof.userId,
          name: user
            ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'User'
            : 'Talent Candidate',
          handle: user?.username ? `@${user.username}` : (user?.phone || user?.email || '@creator'),
          role: user?.role || 'model',
          avatarUrl: user?.profilePicture || user?.avatarUrl || null,
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
          },
          notes: prof.verificationNotes || '',
        }
      })
    )

    return NextResponse.json(successResponse(list))
  } catch (error) {
    return handleApiError(error)
  }
}
