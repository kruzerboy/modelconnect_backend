import { NextRequest, NextResponse } from 'next/server'
import { connectDb } from '@/lib/db'
import { handleApiError, requireAdmin } from '@/lib/middleware'
import { successResponse, ApiError, ERROR_CODES } from '@/lib/api-response'
import { serialize } from '@/lib/route-utils'
import { ObjectId } from 'mongodb'
import { DEFAULT_SPOTLIGHT_PLANS } from '@/lib/spotlight-defaults'

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request)
    const db = await connectDb()
    const collection = db.collection('spotlightPlans')

    // Seed defaults if empty
    const count = await collection.countDocuments()
    if (count === 0) {
      const now = new Date()
      for (const plan of DEFAULT_SPOTLIGHT_PLANS) {
        await collection.updateOne(
          { durationDays: plan.durationDays },
          { $setOnInsert: { ...plan, createdAt: now, updatedAt: now } },
          { upsert: true }
        )
      }
    } else {
      await collection.updateOne({ durationDays: 7, price: 29 }, { $set: { price: 999 } })
      await collection.updateOne({ durationDays: 14, price: { $in: [29, 49] } }, { $set: { price: 1799 } })
      await collection.updateOne({ durationDays: 30, price: 99 }, { $set: { price: 2999 } })
    }

    const plans = await collection
      .find({})
      .sort({ displayOrder: 1, durationDays: 1 })
      .toArray()

    return NextResponse.json(
      successResponse(serialize(plans.length > 0 ? plans : DEFAULT_SPOTLIGHT_PLANS))
    )
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request)
    const body = await request.json().catch(() => ({}))
    const durationDays = Number(body.durationDays)
    const price = Number(body.price)

    if (!durationDays || durationDays <= 0 || !price || price < 0) {
      throw new ApiError(
        ERROR_CODES.VALIDATION_ERROR,
        400,
        'Valid durationDays and price are required'
      )
    }

    const db = await connectDb()
    const collection = db.collection('spotlightPlans')

    const planDoc = {
      durationDays,
      price,
      title: body.title || `${durationDays} Days Spotlight`,
      description:
        body.description ||
        `Featured on the home feed spotlight carousel for ${durationDays} days`,
      badge: body.badge || '',
      highlight: body.highlight === true,
      active: body.active !== false,
      displayOrder: Number(body.displayOrder) || 1,
      updatedAt: new Date(),
    }

    const result = await collection.findOneAndUpdate(
      { durationDays },
      {
        $set: planDoc,
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true, returnDocument: 'after' }
    )

    return NextResponse.json(
      successResponse(serialize(result), 'Spotlight plan saved successfully')
    )
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireAdmin(request)
    const body = await request.json().catch(() => ({}))
    const durationDays = Number(body.durationDays)

    if (!durationDays) {
      throw new ApiError(
        ERROR_CODES.VALIDATION_ERROR,
        400,
        'durationDays is required'
      )
    }

    const db = await connectDb()
    const collection = db.collection('spotlightPlans')

    const updateFields: Record<string, unknown> = { updatedAt: new Date() }
    if (body.price !== undefined) updateFields.price = Number(body.price)
    if (body.title !== undefined) updateFields.title = String(body.title).trim()
    if (body.description !== undefined)
      updateFields.description = String(body.description).trim()
    if (body.badge !== undefined) updateFields.badge = String(body.badge).trim()
    if (body.highlight !== undefined) updateFields.highlight = Boolean(body.highlight)
    if (body.active !== undefined) updateFields.active = Boolean(body.active)
    if (body.displayOrder !== undefined)
      updateFields.displayOrder = Number(body.displayOrder)

    const result = await collection.findOneAndUpdate(
      { durationDays },
      { $set: updateFields },
      { returnDocument: 'after' }
    )

    if (!result) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, 404, 'Spotlight plan not found')
    }

    return NextResponse.json(
      successResponse(serialize(result), 'Spotlight plan updated successfully')
    )
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin(request)
    const { searchParams } = new URL(request.url)
    const durationDaysStr = searchParams.get('durationDays')
    const id = searchParams.get('id')

    const db = await connectDb()
    const collection = db.collection('spotlightPlans')

    let filter: Record<string, unknown> = {}
    if (durationDaysStr) {
      filter = { durationDays: Number(durationDaysStr) }
    } else if (id) {
      filter = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { _id: id }
    } else {
      throw new ApiError(
        ERROR_CODES.VALIDATION_ERROR,
        400,
        'durationDays or id parameter required'
      )
    }

    const result = await collection.deleteOne(filter as any)
    if (result.deletedCount === 0) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, 404, 'Spotlight plan not found')
    }

    return NextResponse.json(
      successResponse(null, 'Spotlight plan deleted successfully')
    )
  } catch (error) {
    return handleApiError(error)
  }
}
