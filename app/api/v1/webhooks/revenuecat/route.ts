import { NextRequest, NextResponse } from 'next/server'
import { connectDb } from '@/lib/db'
import { ObjectId } from 'mongodb'

/**
 * RevenueCat Webhook Handler
 * Endpoint: POST /api/v1/webhooks/revenuecat
 *
 * Automatically handles:
 * - TEST: RevenueCat dashboard test ping
 * - INITIAL_PURCHASE: New iOS subscription purchased
 * - RENEWAL: Subscription renewed
 * - CANCELLATION: Subscription cancelled (still active until period end)
 * - EXPIRATION: Subscription ended
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Optional Secret Verification
    const webhookSecret = process.env.REVENUECAT_WEBHOOK_SECRET
    if (webhookSecret && webhookSecret.trim().length > 0) {
      const authHeader = request.headers.get('authorization') || ''
      const token = authHeader.startsWith('Bearer ')
        ? authHeader.slice(7).trim()
        : authHeader.trim()

      if (token !== webhookSecret.trim()) {
        console.warn('[RevenueCat Webhook] Unauthorized attempt with invalid token')
        return NextResponse.json(
          { error: 'Unauthorized webhook request' },
          { status: 401 }
        )
      }
    }

    const body = await request.json().catch(() => null)
    if (!body || !body.event) {
      return NextResponse.json(
        { error: 'Missing or malformed event payload' },
        { status: 400 }
      )
    }

    const { event } = body
    const eventType = event.type
    const appUserId = event.app_user_id

    console.log(`[RevenueCat Webhook] Received event: ${eventType} for user: ${appUserId}`)

    // 2. Acknowledge Test Event from Dashboard
    if (eventType === 'TEST') {
      return NextResponse.json({
        received: true,
        message: 'RevenueCat test webhook connection successful!',
      })
    }

    if (!appUserId) {
      return NextResponse.json({ received: true, note: 'No app_user_id provided' })
    }

    const db = await connectDb()

    // 3. Find User
    let userQuery: any = {}
    if (ObjectId.isValid(appUserId)) {
      userQuery = { _id: new ObjectId(appUserId) }
    } else {
      userQuery = {
        $or: [
          { email: appUserId.toLowerCase() },
          { phone: appUserId },
        ],
      }
    }

    const user = await db.collection('users').findOne(userQuery)
    if (!user) {
      console.warn(`[RevenueCat Webhook] User not found for app_user_id: ${appUserId}`)
      // Return 200 so RevenueCat doesn't keep retrying indefinitely for an untracked anonymous ID
      return NextResponse.json({ received: true, warning: 'User not found' })
    }

    const now = new Date()
    const expiresAt = event.expiration_at_ms
      ? new Date(event.expiration_at_ms)
      : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    const productId = event.product_id || 'bookshoot_bussiness_pro_monthly'
    const planName = productId.includes('model') ? 'Model Pro' : 'Business Pro'

    // 4. Handle Subscription Lifecycle Events
    if (
      eventType === 'INITIAL_PURCHASE' ||
      eventType === 'RENEWAL' ||
      eventType === 'UNCANCELLATION' ||
      eventType === 'NON_RENEWING_PURCHASE' ||
      eventType === 'PRODUCT_CHANGE'
    ) {
      // Upgrade User & Add Post Quota
      const postsToAdd = eventType === 'INITIAL_PURCHASE' ? 3 : 0

      await db.collection('users').updateOne(
        { _id: user._id },
        {
          ...(postsToAdd > 0
            ? { $inc: { availableOpportunityPosts: postsToAdd } }
            : {}),
          $set: {
            isSubscribed: true,
            currentPlan: productId,
            currentPlanName: planName,
            planValidUntil: expiresAt,
            updatedAt: now,
          },
        }
      )

      // Record in Subscriptions collection
      await db.collection('subscriptions').insertOne({
        userId: user._id.toString(),
        userRole: user.role || 'owner',
        planCode: productId,
        planName,
        basePrice: event.price_in_purchased_currency || 0,
        currency: event.currency || 'INR',
        paymentMethod: 'apple_iap',
        paymentTransactionId: event.transaction_id || `RC_${Date.now()}`,
        originalTransactionId: event.original_transaction_id,
        revenueCatEventId: event.id,
        status: 'active',
        store: event.store || 'APP_STORE',
        environment: event.environment || 'SANDBOX',
        activatedAt: now,
        expiresAt,
        createdAt: now,
        updatedAt: now,
      })

      console.log(`[RevenueCat Webhook] Successfully activated subscription for user ${user._id}`)
    } else if (eventType === 'EXPIRATION') {
      // Mark as expired
      await db.collection('users').updateOne(
        { _id: user._id },
        {
          $set: {
            isSubscribed: false,
            updatedAt: now,
          },
        }
      )

      await db.collection('subscriptions').updateMany(
        { userId: user._id.toString(), status: 'active' },
        {
          $set: {
            status: 'expired',
            updatedAt: now,
          },
        }
      )

      console.log(`[RevenueCat Webhook] Subscription expired for user ${user._id}`)
    } else if (eventType === 'CANCELLATION') {
      // User turned off auto-renew; still active until expiresAt
      console.log(`[RevenueCat Webhook] User ${user._id} cancelled auto-renewal. Access valid until ${expiresAt}`)
    }

    return NextResponse.json({
      received: true,
      eventType,
      userId: user._id.toString(),
    })
  } catch (error: any) {
    console.error('[RevenueCat Webhook] Internal Error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed', details: error.message },
      { status: 500 }
    )
  }
}

