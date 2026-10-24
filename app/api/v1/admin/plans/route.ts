import { NextRequest, NextResponse } from 'next/server'
import { connectDb } from '@/lib/db'
import { planSchema } from '@/lib/schemas'
import { handleApiError } from '@/lib/middleware'
import { successResponse } from '@/lib/api-response'
import { parseBody, serialize } from '@/lib/route-utils'

export async function GET(request: NextRequest) {
  try {
    const db = await connectDb()
    const plans = await db
      .collection('plans')
      .find({})
      .sort({ displayOrder: 1, createdAt: 1 })
      .toArray()

    return NextResponse.json(successResponse(serialize(plans)))
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const validatedData = await parseBody(request, planSchema)

    const db = await connectDb()
    const planDoc = {
      ...validatedData,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await db.collection('plans').insertOne(planDoc)

    return NextResponse.json(
      successResponse(
        serialize({ _id: result.insertedId, ...planDoc }),
        'Pricing plan created successfully'
      ),
      { status: 201 }
    )
  } catch (error) {
    return handleApiError(error)
  }
}
