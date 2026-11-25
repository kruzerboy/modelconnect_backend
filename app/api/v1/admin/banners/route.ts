import { NextRequest, NextResponse } from 'next/server'
import { connectDb } from '@/lib/db'
import { bannerSchema } from '@/lib/schemas'
import { handleApiError, requireAdmin } from '@/lib/middleware'
import { successResponse, ApiError, ERROR_CODES } from '@/lib/api-response'
import { parseBody, serialize } from '@/lib/route-utils'

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request)
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
    await requireAdmin(request)
    const validatedData = await parseBody(request, bannerSchema)

    const mobileImageUrl = validatedData.mobileImageUrl || validatedData.imageUrl || ''
    const webImageUrl = validatedData.webImageUrl || validatedData.imageUrl || ''
    const imageUrl = mobileImageUrl || webImageUrl || validatedData.imageUrl || ''

    const bannerDoc = {
      ...validatedData,
      imageUrl,
      mobileImageUrl,
      webImageUrl,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const db = await connectDb()
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
