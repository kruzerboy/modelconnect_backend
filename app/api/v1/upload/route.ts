import { NextRequest, NextResponse } from 'next/server'
import { handleApiError, requireAuth } from '@/lib/middleware'
import { ApiError, ERROR_CODES, successResponse } from '@/lib/api-response'
import { saveUploadedFile } from '@/lib/storage'

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    await requireAuth(request)

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const files = formData.getAll('files') as File[]

    if (!file && (!files || files.length === 0)) {
      throw new ApiError(ERROR_CODES.VALIDATION_ERROR, 400, 'No image file provided in form-data field "file"')
    }

    // Handle multiple files if provided
    if (files && files.length > 1) {
      const results = []
      for (const f of files) {
        if (f && typeof f === 'object' && 'arrayBuffer' in f) {
          const info = await saveUploadedFile(request, f)
          results.push(info)
        }
      }
      return NextResponse.json(successResponse(results), { status: 201 })
    }

    // Handle single file upload
    const targetFile = file || files[0]
    const info = await saveUploadedFile(request, targetFile)

    return NextResponse.json(successResponse(info), { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}
