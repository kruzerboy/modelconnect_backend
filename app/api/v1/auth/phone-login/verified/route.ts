import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from 'firebase-admin/auth'
import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { z } from 'zod'
import { successResponse } from '@/lib/api-response'
import { handleApiError } from '@/lib/middleware'
import { parseBody } from '@/lib/route-utils'
import { createPhoneLoginSession } from '@/lib/phone-login'

const verifiedPhoneLoginSchema = z.object({
  idToken: z.string().min(1, 'Firebase ID token is required'),
})

function getFirebaseAdminAuth() {
  const serviceAccountJson =
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY ||
    process.env.FIREBASE_SERVICE_ACCOUNT
  if (!serviceAccountJson) {
    throw new Error('Firebase Admin service account is not configured')
  }

  const serviceAccount = JSON.parse(serviceAccountJson)
  const projectId = process.env.FIREBASE_PROJECT_ID || 'dmw-models-app'
  const existingApp = getApps().find((app) => app.name === 'bookshoot-phone-auth')
  const app = existingApp || initializeApp({
    credential: cert(serviceAccount),
    projectId,
  }, 'bookshoot-phone-auth')

  return getAuth(app)
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, Origin',
    },
  })
}

export async function POST(request: NextRequest) {
  try {
    const { idToken } = await parseBody(request, verifiedPhoneLoginSchema)
    const firebaseUser = await getFirebaseAdminAuth().verifyIdToken(idToken)
    if (!firebaseUser.uid || !firebaseUser.phone_number) {
      return NextResponse.json(
        { success: false, message: 'A verified phone number is required.' },
        { status: 401 },
      )
    }

    const result = await createPhoneLoginSession(
      firebaseUser.phone_number,
      firebaseUser.uid,
    )
    return NextResponse.json(successResponse(result))
  } catch (error) {
    return handleApiError(error)
  }
}
