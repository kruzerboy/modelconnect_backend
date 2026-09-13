import { NextRequest, NextResponse } from 'next/server'
import { verifyAccessToken } from './auth'
import { ApiError, ERROR_CODES, errorResponse } from './api-response'

export async function requireAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  
  if (!authHeader?.startsWith('Bearer ')) {
    throw new ApiError(
      ERROR_CODES.UNAUTHORIZED,
      401,
      'Missing or invalid authorization header'
    )
  }

  const token = authHeader.substring(7)
  const payload = await verifyAccessToken(token)

  if (!payload) {
    throw new ApiError(
      ERROR_CODES.INVALID_TOKEN,
      401,
      'Invalid or expired token'
    )
  }

  return payload
}

export async function requireRole(request: NextRequest, allowedRoles: string[]) {
  const auth = await requireAuth(request)

  if (!allowedRoles.includes(auth.role)) {
    throw new ApiError(
      ERROR_CODES.FORBIDDEN,
      403,
      'Insufficient permissions for this operation'
    )
  }

  return auth
}

export function handleApiError(error: unknown): NextResponse {
  console.error('[API Error]', error)

  if (error instanceof ApiError) {
    return NextResponse.json(
      errorResponse(error.code, error.message, error.details),
      { status: error.statusCode }
    )
  }

  if (error instanceof SyntaxError) {
    return NextResponse.json(
      errorResponse(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid JSON in request body'
      ),
      { status: 400 }
    )
  }

  return NextResponse.json(
    errorResponse(
      ERROR_CODES.INTERNAL_ERROR,
      'An unexpected error occurred'
    ),
    { status: 500 }
  )
}

export async function connectAndHandleError<T>(
  handler: () => Promise<T>
): Promise<NextResponse> {
  try {
    return NextResponse.json(await handler())
  } catch (error) {
    return handleApiError(error)
  }
}
