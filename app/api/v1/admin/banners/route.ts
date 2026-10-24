import { NextRequest, NextResponse } from 'next/server'
import { connectDb } from '@/lib/db'
import { bannerSchema } from '@/lib/schemas'
import { handleApiError } from '@/lib/middleware'
import { successResponse, ApiError, ERROR_CODES } from '@/lib/api-response'
import { parseBody, serialize } from '@/lib/route-utils'

export async function GET(request: NextRequest) {
  try {
    const db = await connectDb()
    const banners = await db
      .collection('banners')
      .find({})
      .sort({ displayOrder: 1, createdAt: -1 })
      .toArray()

    return NextResponse.json(successResponse(serialize(banners)))
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const validatedData = await parseBody(request, bannerSchema)

    const db = await connectDb()
    const bannerDoc = {
      ...validatedData,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await db.collection('banners').insertOne(bannerDoc)

    return NextResponse.json(
      successResponse(
        serialize({ _id: result.insertedId, ...bannerDoc }),
        'Banner created successfully'
      ),
      { status: 201 }
    )
  } catch (error) {
    return handleApiError(error)
  }
}
