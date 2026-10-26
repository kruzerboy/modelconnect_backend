import { NextRequest, NextResponse } from 'next/server'
import { connectDb } from '@/lib/db'
import { handleApiError } from '@/lib/middleware'
import { successResponse, ApiError, ERROR_CODES } from '@/lib/api-response'
import { parseBody, serialize } from '@/lib/route-utils'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const db = await connectDb()
    const appsCollection = db.collection('featuredApplications')

    const appDoc = {
      userId: body.userId || 'guest_applicant',
      discipline: body.discipline || 'model',
      durationDays: Number(body.durationDays) || 14,
      amountPaid: Number(body.amountPaid) || 1799,
      paymentMethod: body.paymentMethod || 'upi_direct',
      transactionId: body.transactionId || `TXN_${Date.now()}`,
      pitchNotes: body.pitchNotes || '',
      badgeRequested: body.badgeRequested || 'VERIFIED PRO',
      status: 'pending_review',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await appsCollection.insertOne(appDoc)

    return NextResponse.json(
      successResponse(
        serialize({ _id: result.insertedId, ...appDoc }),
        'Spotlight application submitted successfully for curation'
      ),
      { status: 201 }
    )
  } catch (error) {
    return handleApiError(error)
  }
}
