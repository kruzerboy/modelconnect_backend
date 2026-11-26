import { NextRequest, NextResponse } from 'next/server'
import { connectDb } from '@/lib/db'
import { handleApiError, requireAdmin } from '@/lib/middleware'
import { successResponse, ApiError, ERROR_CODES } from '@/lib/api-response'
import { objectId } from '@/lib/route-utils'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request)
    const { id } = await params
    const db = await connectDb()
    const ticket = await db.collection('support_tickets').findOne({ _id: objectId(id) })

    if (!ticket) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, 404, 'Support ticket not found')
    }

    return NextResponse.json(
      successResponse({
        ...ticket,
        id: ticket._id.toString(),
      })
    )
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request)
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const { status, priority, assignedTo, resolutionNote } = body

    const updateFields: Record<string, any> = { updatedAt: new Date() }
    if (status) updateFields.status = status.toLowerCase()
    if (priority) updateFields.priority = priority.toLowerCase()
    if (assignedTo !== undefined) updateFields.assignedTo = assignedTo
    if (resolutionNote !== undefined) {
      updateFields.resolutionNote = resolutionNote
      if (status === 'resolved' || status === 'closed') {
        updateFields.resolvedAt = new Date()
      }
    }

    const db = await connectDb()
    const result = await db.collection('support_tickets').findOneAndUpdate(
      { _id: objectId(id) },
      { $set: updateFields },
      { returnDocument: 'after' }
    )

    if (!result) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, 404, 'Support ticket not found')
    }

    return NextResponse.json(
      successResponse(result, 'Ticket updated successfully')
    )
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request)
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const { message, isInternalNote, senderName } = body

    if (!message || !message.trim()) {
      throw new ApiError(ERROR_CODES.VALIDATION_ERROR, 400, 'message is required')
    }

    const db = await connectDb()
    const newMessage = {
      id: `msg_${Date.now()}`,
      senderId: 'admin_session',
      senderName: senderName || 'BookShoot Admin Support',
      senderType: 'admin',
      message: message.trim(),
      isInternalNote: Boolean(isInternalNote),
      createdAt: new Date(),
    }

    const result = await db.collection('support_tickets').findOneAndUpdate(
      { _id: objectId(id) },
      {
        $push: { messages: newMessage } as any,
        $set: { updatedAt: new Date() },
      },
      { returnDocument: 'after' }
    )

    if (!result) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, 404, 'Support ticket not found')
    }

    return NextResponse.json(
      successResponse(newMessage, 'Reply posted successfully')
    )
  } catch (error) {
    return handleApiError(error)
  }
}
