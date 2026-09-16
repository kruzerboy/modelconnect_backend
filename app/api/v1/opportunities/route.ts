import { NextRequest, NextResponse } from 'next/server'
import { connectDb } from '@/lib/db'
import { opportunitySchema } from '@/lib/schemas'
import { requireAuth, handleApiError } from '@/lib/middleware'
import { ApiError, ERROR_CODES, successResponse } from '@/lib/api-response'
import { parseBody, queryParam, serialize } from '@/lib/route-utils'
import { createPaginatedResponse, getPaginationParams } from '@/lib/helpers'

export async function GET(request: NextRequest) {
  try {
    const page = Number(queryParam(request, 'page', '1'));
    const limit = Number(queryParam(request, 'limit', '20'));
    const pagination = getPaginationParams(page, limit);

    const filter: Record<string, unknown> = {};
    const mine = queryParam(request, 'mine');
    const createdBy = queryParam(request, 'createdBy');

    if (mine === 'true') {
      const auth = await requireAuth(request);
      filter.createdBy = auth.userId;
    } else if (createdBy) {
      filter.createdBy = createdBy;
    } else {
      filter.status = 'open';
      filter.deadline = { $gte: new Date() };
    }

    const tag = queryParam(request, 'tag') || queryParam(request, 'category');
    if (tag && tag !== 'All') {
      const regex = { $regex: tag, $options: 'i' };
      filter.$or = [
        { tags: tag },
        { category: regex },
        { productionServices: regex },
        { requirements: regex },
      ];
    }

    const search = queryParam(request, 'search');
    if (search && search.trim()) {
      const searchRegex = { $regex: search.trim(), $options: 'i' };
      filter.$or = [
        ...(Array.isArray(filter.$or) ? (filter.$or as unknown[]) : []),
        { title: searchRegex },
        { description: searchRegex },
        { category: searchRegex },
        { city: searchRegex },
      ];
    }

    const city = queryParam(request, 'city');
    if (city && city.trim()) {
      filter.$and = [
        ...(Array.isArray(filter.$and) ? (filter.$and as unknown[]) : []),
        {
          $or: [
            { city: { $regex: city.trim(), $options: 'i' } },
            { 'location.city': { $regex: city.trim(), $options: 'i' } }
          ]
        }
      ];
    }

    const db = await connectDb();
    const collection = db.collection('opportunities');
    const total = await collection.countDocuments(filter);
    const data = await collection.find(filter).sort({ createdAt: -1 }).skip(pagination.skip).limit(pagination.limit).toArray();

    return NextResponse.json(successResponse(createPaginatedResponse(serialize(data), pagination.page, pagination.limit, total)));
  } catch (error) { return handleApiError(error); }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request); if (auth.role !== 'business') throw new ApiError(ERROR_CODES.FORBIDDEN, 403, 'Only businesses can create opportunities')
    const input = await parseBody(request, opportunitySchema); if (input.budget.max < input.budget.min) throw new ApiError(ERROR_CODES.VALIDATION_ERROR, 400, 'Maximum budget must be at least the minimum budget')
    const deadline = new Date(input.deadline); if (deadline <= new Date()) throw new ApiError(ERROR_CODES.VALIDATION_ERROR, 400, 'Deadline must be in the future')
    const now = new Date(); const doc = { ...input, createdBy: auth.userId, status: 'open', deadline, createdAt: now, updatedAt: now }
    const result = await (await connectDb()).collection('opportunities').insertOne(doc)
    return NextResponse.json(successResponse(serialize({ _id: result.insertedId, ...doc })), { status: 201 })
  } catch (error) { return handleApiError(error) }
}
