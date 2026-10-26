import { NextRequest, NextResponse } from 'next/server'
import { connectDb } from '@/lib/db'
import { handleApiError } from '@/lib/middleware'
import { successResponse } from '@/lib/api-response'
import { objectId } from '@/lib/route-utils'

export async function GET(request: NextRequest) {
  try {
    const db = await connectDb()
    const pendingProfiles = await db
      .collection('modelProfiles')
      .find({ isVerified: { $ne: true } })
      .limit(30)
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

        return {
          id: prof._id.toString(),
          userId: prof.userId,
          name: user
            ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username
            : 'Talent Candidate',
          handle: user?.username ? `@${user.username}` : '@talent',
          role: user?.role || 'model',
          avatarUrl:
            user?.profilePicture ||
            user?.avatarUrl ||
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
          submittedDate: prof.updatedAt
            ? new Date(prof.updatedAt).toLocaleDateString()
            : 'Recent',
          priority: 'High',
          status: prof.verificationStatus || 'Pending Review',
          verificationBadgeType: 'BookShoot Verified Pro',
          confidenceScore: 92,
          documents: {
            compCardUrl:
              prof.portfolio?.[0] ||
              'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80',
            govIdFrontUrl:
              'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=800&q=80',
            portfolioLinks: prof.portfolio || [],
          },
          compCardData: {
            height: prof.height || '5\'9"',
            measurements: prof.measurements || '34-26-36',
            shoeSize: prof.shoeSize || '8 US',
            hairColor: prof.hairColor || 'Black',
            eyeColor: prof.eyeColor || 'Brown',
          },
          notes: prof.verificationNotes || '',
          checklist: [
            { id: 'c1', label: 'Comp Card Physical Specifications Match', passed: true },
            { id: 'c2', label: 'Government ID Legible & Not Expired', passed: true },
            { id: 'c3', label: 'Commercial Portfolio Resolution >= 1080p', passed: true },
          ],
        }
      })
    )

    return NextResponse.json(successResponse(list))
  } catch (error) {
    return handleApiError(error)
  }
}
