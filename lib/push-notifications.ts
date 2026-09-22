import { connectDb } from '@/lib/db'

export interface PushNotificationPayload {
  targetRole: 'model' | 'camera' | 'drone' | string
  opportunityId: string
  title: string
  businessName: string
  city?: string
  budgetDisplay?: string
}

function getFirebaseMessaging() {
  let serviceAccount: any = null
  const projectId = process.env.FIREBASE_PROJECT_ID || 'dmw-models-app'

  // 1. Check environment variable (Render / Production)
  const envJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.FIREBASE_SERVICE_ACCOUNT
  if (envJson) {
    try {
      serviceAccount = JSON.parse(envJson)
    } catch {
      console.warn('[FCM] Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY JSON string')
    }
  }

  // 2. If not in env, check local JSON file in project root
  if (!serviceAccount) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fs = require('fs')
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const path = require('path')
      const candidatePaths = [
        path.join(process.cwd(), 'dmw-models-app-firebase-adminsdk.json'),
        path.join(process.cwd(), 'firebase-adminsdk.json'),
        path.join(__dirname, '../../dmw-models-app-firebase-adminsdk.json'),
      ]

      for (const p of candidatePaths) {
        if (fs.existsSync(p)) {
          const raw = fs.readFileSync(p, 'utf8')
          serviceAccount = JSON.parse(raw)
          break
        }
      }
    } catch (fsErr) {
      console.warn('[FCM] Could not load local service account file:', fsErr)
    }
  }

  if (!serviceAccount) return null

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { initializeApp, cert, getApps } = require('firebase-admin/app')
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getMessaging } = require('firebase-admin/messaging')

    const app = getApps().length
      ? getApps()[0]
      : initializeApp({
          credential: cert(serviceAccount),
          projectId,
        })
    return getMessaging(app)
  } catch (err) {
    console.warn('[FCM] Failed to initialize Firebase Messaging:', err)
    return null
  }
}

/**
 * Broadcasts push notification to all users matching the target role (opportunities)
 */
export async function sendRolePushNotification(payload: PushNotificationPayload) {
  try {
    const db = await connectDb()
    const targetRole = (payload.targetRole || 'model').toLowerCase()

    // Find all device tokens for users registered with this role
    const devices = await db.collection('userDevices').find({ role: targetRole }).toArray()
    const tokens = devices.map((d) => d.fcmToken).filter(Boolean)

    if (tokens.length === 0) {
      console.log(`[FCM] No registered devices found for role "${targetRole}"`)
      return { sent: 0, failed: 0 }
    }

    const roleName = targetRole === 'camera' ? 'Camera Crew' : (targetRole === 'drone' ? 'Drone Pilot' : 'Model')
    const notifTitle = `New ${roleName} Opportunity!`
    const notifBody = `${payload.businessName} just posted: "${payload.title}"${payload.city ? ` in ${payload.city}` : ''}. Tap to review and apply.`

    console.log(`[FCM] Dispatching role push to ${tokens.length} "${targetRole}" devices: "${notifTitle}"`)

    const messaging = getFirebaseMessaging()
    if (messaging) {
      const response = await messaging.sendEachForMulticast({
        tokens,
        notification: {
          title: notifTitle,
          body: notifBody,
        },
        data: {
          opportunityId: String(payload.opportunityId),
          targetRole,
          click_action: 'FLUTTER_NOTIFICATION_CLICK',
        },
        android: {
          priority: 'high',
          notification: {
            channelId: 'opportunity_alerts',
            sound: 'opportunity_alert',
            vibrateTimingsMillis: [0, 250, 100, 250],
            priority: 'high',
            defaultVibrateTimings: false,
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'opportunity_alert.caf',
              badge: 1,
            },
          },
        },
      })
      console.log(`[FCM] Sent ${response.successCount} messages, ${response.failureCount} failed.`)
      return { sent: response.successCount, failed: response.failureCount }
    } else {
      console.log(`[FCM-SIMULATED] Firebase credentials not configured. Simulated push to ${tokens.length} devices.`)
      return { sent: tokens.length, simulated: true }
    }
  } catch (error) {
    console.error('[FCM] Error in sendRolePushNotification:', error)
    return { error }
  }
}

export interface UserPushNotificationPayload {
  userId: string
  title: string
  body: string
  data?: Record<string, string>
}

/**
 * Sends a targeted push notification to a specific user's registered devices (occasions: applications, status updates, messages)
 */
export async function sendUserPushNotification(payload: UserPushNotificationPayload) {
  try {
    const db = await connectDb()
    const userIdStr = String(payload.userId)

    const devices = await db.collection('userDevices').find({ userId: userIdStr }).toArray()
    const tokens = devices.map((d) => d.fcmToken).filter(Boolean)

    if (tokens.length === 0) {
      return { sent: 0 }
    }

    const messaging = getFirebaseMessaging()
    if (messaging) {
      const sanitizedData: Record<string, string> = { click_action: 'FLUTTER_NOTIFICATION_CLICK' }
      if (payload.data) {
        for (const [k, v] of Object.entries(payload.data)) {
          sanitizedData[k] = String(v)
        }
      }

      const response = await messaging.sendEachForMulticast({
        tokens,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: sanitizedData,
      })
      return { sent: response.successCount, failed: response.failureCount }
    } else {
      console.log(`[FCM-SIMULATED] Simulated push to user ${userIdStr} (${tokens.length} devices): "${payload.title}"`)
      return { sent: tokens.length, simulated: true }
    }
  } catch (error) {
    console.error('[FCM] Error in sendUserPushNotification:', error)
    return { error }
  }
}
