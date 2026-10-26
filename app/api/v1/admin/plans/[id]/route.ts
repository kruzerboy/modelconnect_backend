import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { connectDb } from '@/lib/db'
import { updatePlanSchema } from '@/lib/schemas'
import { handleApiError } from '@/lib/middleware'
import { successResponse, ApiError, ERROR_CODES } from '@/lib/api-response'
import { parseBody, serialize } from '@/lib/route-utils'

interface RouteParams {
  params: Promise<{ id: string }>
}

function buildPlanQuery(id: string) {
  const queries: any[] = [{ code: id }, { id }]
  if (ObjectId.isValid(id)) {
    queries.push({ _id: new ObjectId(id) })
  }
  return { $or: queries }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const db = await connectDb()
    const plan = await db.collection('plans').findOne(buildPlanQuery(id))

    if (!plan) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, 404, 'Plan not found')
    }

    const normalized = {
      ...plan,
      monthlyPrice: Number(plan.monthlyPrice ?? plan.price ?? 0),
      yearlyPrice: Number(plan.yearlyPrice ?? (plan.monthlyPrice ? plan.monthlyPrice * 10 : (plan.price ? plan.price * 10 : 0))),
      price: Number(plan.price ?? plan.monthlyPrice ?? 0),
      postLimit: Number(plan.postLimit ?? plan.includedPosts ?? 10),
      includedPosts: Number(plan.includedPosts ?? plan.postLimit ?? 10),
    }

    return NextResponse.json(successResponse(serialize(normalized)))
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const validatedData = await parseBody(request, updatePlanSchema)

    const db = await connectDb()
    const updateDoc: Record<string, unknown> = {
      ...validatedData,
      updatedAt: new Date(),
    }

    if (validatedData.monthlyPrice !== undefined || validatedData.price !== undefined) {
      const p = Number(validatedData.monthlyPrice ?? validatedData.price)
      updateDoc.price = p
      updateDoc.monthlyPrice = p
    }
    if (validatedData.yearlyPrice !== undefined) {
      updateDoc.yearlyPrice = Number(validatedData.yearlyPrice)
    }
    if (validatedData.postLimit !== undefined || validatedData.includedPosts !== undefined) {
      const posts = Number(validatedData.postLimit ?? validatedData.includedPosts)
      updateDoc.includedPosts = posts
      updateDoc.postLimit = posts
    }

    const result = await db.collection('plans').findOneAndUpdate(
      buildPlanQuery(id),
      { $set: updateDoc },
      { returnDocument: 'after' }
    )

    if (!result) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, 404, 'Plan not found')
    }

    return NextResponse.json(
      successResponse(serialize(result), 'Plan updated successfully')
    )
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  return PUT(request, { params })
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const db = await connectDb()
    const result = await db.collection('plans').deleteOne(buildPlanQuery(id))

    if (result.deletedCount === 0) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, 404, 'Plan not found')
    }

    return NextResponse.json(
      successResponse(null, 'Plan deleted successfully')
    )
  } catch (error) {
    return handleApiError(error)
  }
}
