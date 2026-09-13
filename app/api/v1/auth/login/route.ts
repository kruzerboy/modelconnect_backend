import { NextRequest, NextResponse } from 'next/server'
import { connectDb } from '@/lib/db'
import { createAccessToken, createRefreshToken, verifyPassword } from '@/lib/auth'
import { loginSchema } from '@/lib/schemas'
import { parseBody, serialize } from '@/lib/route-utils'
import { ApiError, ERROR_CODES, successResponse } from '@/lib/api-response'
import { handleApiError } from '@/lib/middleware'

export async function POST(request: NextRequest) {
  try {
    const input = await parseBody(request, loginSchema)
    const user = await (await connectDb()).collection('users').findOne({ email: input.email.toLowerCase().trim() })
    if (!user || !(await verifyPassword(input.password, user.passwordHash))) throw new ApiError(ERROR_CODES.INVALID_CREDENTIALS, 401, 'Email or password is incorrect')
    const userId = user._id.toString()
    const { passwordHash, ...safeUser } = user
    return NextResponse.json(successResponse({ user: serialize(safeUser), accessToken: await createAccessToken(userId, user.role), refreshToken: await createRefreshToken(userId) }))
  } catch (error) { return handleApiError(error) }
}
