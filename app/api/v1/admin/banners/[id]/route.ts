import { NextRequest, NextResponse } from 'next/server'
import { connectDb } from '@/lib/db'
import { updateBannerSchema } from '@/lib/schemas'
import { handleApiError } from '@/lib/middleware'
import { successResponse, ApiError, ERROR_CODES } from '@/lib/api-response'
import { parseBody, serialize, objectId } from '@/lib/route-utils'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const db = await connectDb()
    const banner = await db.collection('banners').findOne({ _id: objectId(id) })

    if (!banner) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, 404, 'Banner not found')
    }

    return NextResponse.json(successResponse(serialize(banner)))
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const validatedData = await parseBody(request, updateBannerSchema)

    const db = await connectDb()
    const updateDoc = {
      ...validatedData,
      updatedAt: new Date(),
    }

    const result = await db.collection('banners').findOneAndUpdate(
      { _id: objectId(id) },
      { $set: updateDoc },
      { returnDocument: 'after' }
    )

    if (!result) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, 404, 'Banner not found')
    }

    return NextResponse.json(
      successResponse(serialize(result), 'Banner updated successfully')
    )
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const db = await connectDb()
    const result = await db.collection('banners').deleteOne({ _id: objectId(id) })

    if (result.deletedCount === 0) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, 404, 'Banner not found')
    }

    return NextResponse.json(
      successResponse(null, 'Banner deleted successfully')
    )
  } catch (error) {
    return handleApiError(error)
  }
}
