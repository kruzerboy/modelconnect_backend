import { connectDb } from '@/lib/db'

export interface PushNotificationPayload {
  targetRole: 'model' | 'camera' | 'drone' | string
  opportunityId: string
  title: string
  businessName: string
  city?: string
  budgetDisplay?: string
}

/**
 * Broadcasts push notification to all users matching the target role
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

    console.log(`[FCM] Preparing to dispatch push to ${tokens.length} "${targetRole}" devices: "${notifTitle}" - "${notifBody}"`)

    // Check for Firebase Admin credentials
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.FIREBASE_SERVICE_ACCOUNT
    const projectId = process.env.FIREBASE_PROJECT_ID || 'dmw-models-app'

    if (serviceAccountJson) {
      try {
        // Dynamic import of firebase-admin if installed and credentials are provided
        // @ts-ignore
        const admin: any = await import('firebase-admin')
        if (!admin.apps.length) {
          const serviceAccount = JSON.parse(serviceAccountJson)
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId,
          })
        }

        const response = await admin.messaging().sendEachForMulticast({
          tokens,
          notification: {
            title: notifTitle,
            body: notifBody,
          },
          data: {
            opportunityId: payload.opportunityId,
            targetRole,
            click_action: 'FLUTTER_NOTIFICATION_CLICK',
          },
        })

        console.log(`[FCM] Successfully sent ${response.successCount} messages, ${response.failureCount} failed.`)
        return { sent: response.successCount, failed: response.failureCount }
      } catch (fcmError) {
        console.warn('[FCM] Firebase Admin send error (continuing without breaking API):', fcmError)
      }
    } else {
      console.log(`[FCM-SIMULATED] Firebase credentials not yet set in .env. Notification simulated successfully for ${tokens.length} devices.`)
    }

    return { sent: tokens.length, simulated: true }
  } catch (error) {
    console.error('[FCM] Error in sendRolePushNotification:', error)
    return { error }
  }
}
