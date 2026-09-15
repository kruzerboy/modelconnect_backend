import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { connectDb } from '@/lib/db'
import { requireAuth, handleApiError } from '@/lib/middleware'
import { successResponse } from '@/lib/api-response'
import { objectId, parseBody, serialize } from '@/lib/route-utils'

const createConvSchema = z.object({
  opportunityId: z.string().optional(),
  opportunityTitle: z.string().optional(),
  recipientId: z.string().min(1, 'Recipient ID is required'),
})

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    const db = await connectDb()

    const convs = await db.collection('conversations')
      .find({ participants: auth.userId })
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .toArray()

    const enriched = await Promise.all(
      convs.map(async (conv) => {
        const otherUserId = conv.participants.find((p: string) => p !== auth.userId) || conv.participants[0]
        let otherUser = null
        try {
          otherUser = await db.collection('users').findOne({ _id: objectId(otherUserId) })
        } catch {}

        let otherProfile = null
        if (otherUser?.role === 'business') {
          otherProfile = await db.collection('businessProfiles').findOne({ userId: otherUserId })
        } else {
          otherProfile = await db.collection('modelProfiles').findOne({ userId: otherUserId })
        }

        const lastMsg = await db.collection('messages')
          .find({ conversationId: conv._id.toString() })
          .sort({ createdAt: -1 })
          .limit(1)
          .toArray()

        return {
          id: conv._id.toString(),
          opportunityId: conv.opportunityId || '',
          opportunityTitle: conv.opportunityTitle || 'Shoot Casting',
          participants: conv.participants,
          otherUserName: otherProfile?.companyName || (otherUser ? `${otherUser.firstName} ${otherUser.lastName}` : 'User'),
          otherUserRole: otherUser?.role || 'model',
          otherUserAvatar: otherProfile?.logoUrl || otherProfile?.portfolio?.[0] || null,
          lastMessage: lastMsg[0]?.text || conv.lastMessage || 'Conversation started',
          lastMessageAt: lastMsg[0]?.createdAt || conv.lastMessageAt || conv.createdAt,
          unreadCount: 0,
        }
      })
    )

    return NextResponse.json(successResponse(serialize(enriched)))
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    const input = await parseBody(request, createConvSchema)
    const db = await connectDb()

    // Check if conversation already exists with this recipient
    const existing = await db.collection('conversations').findOne({
      participants: { $all: [auth.userId, input.recipientId] },
      ...(input.opportunityId ? { opportunityId: input.opportunityId } : {})
    })

    if (existing) {
      return NextResponse.json(successResponse(serialize(existing)))
    }

    const now = new Date()
    const doc = {
      participants: [auth.userId, input.recipientId],
      opportunityId: input.opportunityId || '',
      opportunityTitle: input.opportunityTitle || '',
      createdAt: now,
      updatedAt: now,
      lastMessageAt: now,
    }

    const result = await db.collection('conversations').insertOne(doc)
    return NextResponse.json(successResponse(serialize({ _id: result.insertedId, ...doc })), { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}
