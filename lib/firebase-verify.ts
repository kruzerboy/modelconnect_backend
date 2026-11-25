import fs from 'fs'
import path from 'path'
import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { createRemoteJWKSet, jwtVerify } from 'jose'

export interface VerifiedFirebaseToken {
  uid: string
  email?: string
  name?: string
  picture?: string
  phone_number?: string
  [key: string]: unknown
}

const GOOGLE_JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')
)

function getFirebaseAdminAuth() {
  const projectId = process.env.FIREBASE_PROJECT_ID || 'dmw-models-app'
  const existingApp = getApps().find((app) => app.name === 'bookshoot-admin')
  if (existingApp) {
    return getAuth(existingApp)
  }

  let serviceAccount: Record<string, unknown> | null = null

  // 1. Check environment variables
  const envJson =
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY ||
    process.env.FIREBASE_SERVICE_ACCOUNT
  if (envJson) {
    try {
      serviceAccount = JSON.parse(envJson)
    } catch {
      console.warn('[FirebaseAdmin] Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY JSON string')
    }
  }

  // 2. Check local JSON files
  if (!serviceAccount) {
    const candidatePaths = [
      path.join(process.cwd(), 'dmw-models-app-firebase-adminsdk.json'),
      path.join(process.cwd(), 'firebase-adminsdk.json'),
      path.join(__dirname, '../../dmw-models-app-firebase-adminsdk.json'),
      path.join(__dirname, '../../../dmw-models-app-firebase-adminsdk.json'),
    ]

    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        try {
          const raw = fs.readFileSync(p, 'utf8')
          serviceAccount = JSON.parse(raw)
          break
        } catch {
          // Continue to next candidate
        }
      }
    }
  }

  if (!serviceAccount) {
    return null
  }

  // Ensure newlines in private_key are unescaped (needed when passed via environment variables)
  if (serviceAccount.private_key && typeof serviceAccount.private_key === 'string') {
    serviceAccount.private_key = (serviceAccount.private_key as string).replace(/\\n/g, '\n')
  }

  const app = initializeApp(
    {
      credential: cert(serviceAccount as any),
      projectId,
    },
    'bookshoot-admin'
  )

  return getAuth(app)
}

/**
 * Verifies a Firebase ID token.
 * 1. Uses Firebase Admin SDK if service account is configured.
 * 2. Falls back to cryptographically verifying with Google's public JWKS certificates via jose.
 */
export async function verifyFirebaseIdToken(idToken: string): Promise<VerifiedFirebaseToken> {
  const projectId = process.env.FIREBASE_PROJECT_ID || 'dmw-models-app'

  // Attempt 1: Firebase Admin SDK
  try {
    const adminAuth = getFirebaseAdminAuth()
    if (adminAuth) {
      const decoded = await adminAuth.verifyIdToken(idToken)
      return {
        ...decoded,
        uid: decoded.uid,
        email: decoded.email,
        name: decoded.name,
        picture: decoded.picture,
        phone_number: decoded.phone_number,
      }
    }
  } catch (adminErr) {
    console.warn('[FirebaseVerify] Admin SDK verification fallback to JWKS:', adminErr)
  }

  // Attempt 2: Direct public JWKS verification with Google
  const { payload } = await jwtVerify(idToken, GOOGLE_JWKS, {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
  })

  return {
    ...payload,
    uid: payload.sub as string,
    email: payload.email as string | undefined,
    name: payload.name as string | undefined,
    picture: payload.picture as string | undefined,
    phone_number: payload.phone_number as string | undefined,
  }
}
