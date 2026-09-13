import { NextRequest } from 'next/server'
import { z } from 'zod'
import { ApiError, ERROR_CODES } from './api-response'

export async function parseBody<T>(request: NextRequest, schema: z.ZodType<T>): Promise<T> {
  const body = await request.json()
  const result = schema.safeParse(body)
  if (!result.success) {
    throw new ApiError(ERROR_CODES.VALIDATION_ERROR, 400, 'Request validation failed', {
      issues: result.error.issues.map((issue) => ({ path: issue.path, message: issue.message })),
    })
  }
  return result.data
}

export function objectId(value: string, field = 'id') {
  const { ObjectId } = require('mongodb') as typeof import('mongodb')
  if (!ObjectId.isValid(value)) {
    throw new ApiError(ERROR_CODES.VALIDATION_ERROR, 400, `Invalid ${field}`)
  }
  return new ObjectId(value)
}

export function serialize<T>(value: T): T {
  return JSON.parse(JSON.stringify(value, (_, current) =>
    current?._bsontype === 'ObjectId' ? current.toString() : current
  ))
}

export function getBearerToken(request: NextRequest) {
  const value = request.headers.get('authorization')
  return value?.startsWith('Bearer ') ? value.slice(7) : null
}

export function queryParam(request: NextRequest, key: string, fallback?: string) {
  return request.nextUrl.searchParams.get(key) ?? fallback
}

export function dateOrThrow(value: string, field: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) throw new ApiError(ERROR_CODES.VALIDATION_ERROR, 400, `Invalid ${field}`)
  return date
}

export function handleDuplicate(error: unknown): never {
  if ((error as { code?: number })?.code === 11000) {
    throw new ApiError(ERROR_CODES.CONFLICT, 409, 'A record with those values already exists')
  }
  throw error
}
