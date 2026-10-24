import { NextRequest, NextResponse } from 'next/server'
import { connectDb } from '@/lib/db'
import { handleApiError } from '@/lib/middleware'
import { successResponse } from '@/lib/api-response'

export async function GET(request: NextRequest) {
  try {
    const db = await connectDb()
    const usersCollection = db.collection('users')
    const oppsCollection = db.collection('opportunities')
    const bannersCollection = db.collection('banners')
    const featuredCollection = db.collection('featuredProfiles')
    const applicationsCollection = db.collection('applications')

    const [
      totalUsers,
      modelCount,
      cameraCount,
      droneCount,
      businessCount,
      activeCastings,
      totalApplications,
      liveBanners,
      featuredTalentCount,
    ] = await Promise.all([
      usersCollection.countDocuments(),
      usersCollection.countDocuments({ role: 'model' }),
      usersCollection.countDocuments({ role: 'camera' }),
      usersCollection.countDocuments({ role: 'drone' }),
      usersCollection.countDocuments({ role: 'business' }),
      oppsCollection.countDocuments({ status: 'open' }),
      applicationsCollection.countDocuments(),
      bannersCollection.countDocuments({ active: true }),
      featuredCollection.countDocuments({ active: true }),
    ])

    const stats = {
      overview: {
        totalUsers,
        activeCastings,
        totalApplications,
        liveBanners,
        featuredTalentCount,
      },
      roleBreakdown: {
        models: modelCount,
        cinematographers: cameraCount,
        dronePilots: droneCount,
        productionHouses: businessCount,
      },
      systemHealth: {
        dbConnected: true,
        aiStudioConnected: Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY),
        serverTime: new Date().toISOString(),
        version: '1.2.0-prod',
      },
    }

    return NextResponse.json(successResponse(stats))
  } catch (error) {
    return handleApiError(error)
  }
}
