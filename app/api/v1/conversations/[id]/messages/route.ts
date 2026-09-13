import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { connectDb } from '@/lib/db'
import { requireAuth, handleApiError } from '@/lib/middleware'
import { successResponse } from '@/lib/api-response'
import { objectId, parseBody, serialize } from '@/lib/route-utils'

const messageSchema = z.object({ text: z.string().trim().min(1).max(5000) })

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(request); const { id } = await params; const db = await connectDb(); const conversation = await db.collection('conversations').findOne({ _id: objectId(id, 'conversation id'), participants: auth.userId })
    if (!conversation) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Conversation not found' } }, { status: 404 })
    const data = await db.collection('messages').find({ conversationId: id }).sort({ createdAt: 1 }).limit(200).toArray()
    return NextResponse.json(successResponse(serialize(data)))
  } catch (error) { return handleApiError(error) }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(request); const { id } = await params; const input = await parseBody(request, messageSchema); const db = await connectDb()
    const conversation = await db.collection('conversations').findOne({ _id: objectId(id, 'conversation id'), participants: auth.userId })
    if (!conversation) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Conversation not found' } }, { status: 404 })
    const doc = { conversationId: id, senderId: auth.userId, text: input.text, createdAt: new Date() }; const result = await db.collection('messages').insertOne(doc)
    await db.collection('conversations').updateOne({ _id: objectId(id) }, { $set: { lastMessageAt: doc.createdAt, updatedAt: doc.createdAt } })
    return NextResponse.json(successResponse(serialize({ _id: result.insertedId, ...doc })), { status: 201 })
  } catch (error) { return handleApiError(error) }
}
