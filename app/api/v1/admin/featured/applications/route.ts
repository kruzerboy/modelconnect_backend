import { NextRequest, NextResponse } from 'next/server'
import { connectDb } from '@/lib/db'
import { handleApiError } from '@/lib/middleware'
import { successResponse } from '@/lib/api-response'
import { serialize } from '@/lib/route-utils'
import { ObjectId } from 'mongodb'

export async function GET(request: NextRequest) {
  try {
    const db = await connectDb()
    const appsCollection = db.collection('featuredApplications')
    const usersCollection = db.collection('users')
    const modelProfilesCollection = db.collection('modelProfiles')
    const businessProfilesCollection = db.collection('businessProfiles')

    const applications = await appsCollection
      .find({})
      .sort({ createdAt: -1 })
      .toArray()

    const enriched = await Promise.all(
      applications.map(async (app) => {
        let user = null
        if (ObjectId.isValid(app.userId)) {
          user = await usersCollection.findOne({ _id: new ObjectId(app.userId) })
        }
        if (!user) {
          user = await usersCollection.findOne({ id: app.userId })
        }

        const modelProf = await modelProfilesCollection.findOne({ userId: app.userId })
        const bizProf = await businessProfilesCollection.findOne({ userId: app.userId })

        const isBiz =
          user?.role === 'business' ||
          app.discipline === 'business' ||
          app.discipline === 'production_house' ||
          !!bizProf

        const name = isBiz
          ? bizProf?.companyName || user?.fullName || 'Production Studio'
          : user?.fullName ||
            `${user?.firstName || ''} ${user?.lastName || ''}`.trim() ||
            'Creator'

        const avatar = isBiz
          ? bizProf?.logoUrl || user?.profilePicture || user?.avatarUrl
          : user?.profilePicture ||
            user?.avatarUrl ||
            (modelProf?.portfolio && modelProf.portfolio.length > 0
              ? modelProf.portfolio[0]
              : null)

        return {
          ...app,
          applicantName: name,
          applicantRole: app.discipline || user?.role || (isBiz ? 'business' : 'model'),
          avatarUrl: avatar,
          city: isBiz
            ? bizProf?.location?.city || 'Mumbai'
            : modelProf?.location?.city || 'Mumbai',
        }
      })
    )

    return NextResponse.json(successResponse(serialize(enriched)))
  } catch (error) {
    return handleApiError(error)
  }
}
