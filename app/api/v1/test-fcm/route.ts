import { NextRequest, NextResponse } from 'next/server'
import { connectDb } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { fcmToken, userId } = body

    // 1. Check credentials
    const envJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.FIREBASE_SERVICE_ACCOUNT
    const fs = require('fs')
    const path = require('path')
    const fileExists = fs.existsSync(path.join(process.cwd(), 'dmw-models-app-firebase-adminsdk.json'))

    let targetToken = fcmToken

    if (!targetToken && userId) {
      const db = await connectDb()
      const device = await db.collection('userDevices').findOne({ userId: String(userId) })
      targetToken = device?.fcmToken
    }

    if (!targetToken) {
      return NextResponse.json({
        success: false,
        error: 'No target token provided. Provide { "fcmToken": "..." } or { "userId": "..." } in request body.',
        debug: {
          hasEnvKey: !!envJson,
          hasLocalKeyFile: fileExists,
          cwd: process.cwd(),
        },
      }, { status: 400 })
    }

    // Try sending directly with Firebase Admin
    const { initializeApp, cert, getApps } = require('firebase-admin/app')
    const { getMessaging } = require('firebase-admin/messaging')

    let serviceAccount: any = null
    if (envJson) {
      try {
        serviceAccount = typeof envJson === 'string' ? JSON.parse(envJson) : envJson
      } catch (e) {
        return NextResponse.json({ success: false, error: 'Failed to JSON.parse FIREBASE_SERVICE_ACCOUNT_KEY env var' }, { status: 500 })
      }
    } else if (fileExists) {
      serviceAccount = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'dmw-models-app-firebase-adminsdk.json'), 'utf8'))
    }

    if (!serviceAccount) {
      return NextResponse.json({
        success: false,
        error: 'Firebase service account not found in environment or local file.',
        debug: { hasEnvKey: !!envJson, hasLocalKeyFile: fileExists },
      }, { status: 500 })
    }

    if (serviceAccount.private_key && typeof serviceAccount.private_key === 'string') {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n')
    }

    const appName = 'test-fcm-app'
    const app = getApps().find((a: any) => a.name === appName) || initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.project_id || 'dmw-models-app',
    }, appName)

    const messaging = getMessaging(app)
    const response = await messaging.send({
      token: targetToken,
      notification: {
        title: '🔔 BookShoot Test Notification',
        body: 'Push notifications are working perfectly on Hostinger!',
      },
      android: {
        priority: 'high',
        notification: {
          channelId: 'opportunity_alerts',
          sound: 'default',
          priority: 'high',
          defaultSound: true,
          defaultVibrateTimings: true,
        },
      },
      data: {
        type: 'test_push',
        timestamp: String(Date.now()),
      },
    })

    return NextResponse.json({
      success: true,
      messageId: response,
      note: 'Message accepted by Firebase and dispatched to device.',
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error?.message || String(error),
      code: error?.code,
      stack: error?.stack,
    }, { status: 500 })
  }
}
