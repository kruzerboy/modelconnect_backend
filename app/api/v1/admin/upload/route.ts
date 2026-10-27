import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'
import crypto from 'crypto'
import { handleApiError } from '@/lib/middleware'
import { ApiError, ERROR_CODES, successResponse } from '@/lib/api-response'
import {
  isCloudinaryConfigured,
  uploadToCloudinary,
  getStorageDir,
  saveUploadedFile,
} from '@/lib/storage'

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || ''

    // 1. JSON Payload with base64 dataUrl
    if (contentType.includes('application/json')) {
      const body = await request.json()
      const { dataUrl, filename } = body

      if (!dataUrl || typeof dataUrl !== 'string') {
        throw new ApiError(
          ERROR_CODES.VALIDATION_ERROR,
          400,
          'Missing dataUrl string in JSON request body'
        )
      }

      const match = dataUrl.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/)
      if (!match) {
        throw new ApiError(
          ERROR_CODES.VALIDATION_ERROR,
          400,
          'Invalid base64 data URL format'
        )
      }

      const mimeType = match[1]
      const base64Data = match[2]
      const buffer = Buffer.from(base64Data, 'base64')

      if (buffer.length > 15 * 1024 * 1024) {
        throw new ApiError(
          ERROR_CODES.VALIDATION_ERROR,
          400,
          'Image file size exceeds maximum limit of 15MB'
        )
      }

      // Check if Cloudinary is active
      if (isCloudinaryConfigured()) {
        const cloudResult = await uploadToCloudinary(buffer, 'bookshoot_banners')
        return NextResponse.json(
          successResponse({
            url: cloudResult.url,
            filename: filename || 'banner.png',
            provider: 'cloudinary',
          })
        )
      }

      // Fallback: Save to persistent disk storage
      const storageDir = getStorageDir()
      const ext = path.extname(filename || '') || (mimeType === 'image/png' ? '.png' : '.jpg')
      const hash = crypto.randomBytes(16).toString('hex')
      const savedFilename = `banner_${Date.now()}_${hash}${ext}`
      const targetPath = path.join(storageDir, savedFilename)

      fs.writeFileSync(targetPath, buffer)

      const host = request.headers.get('host') || 'localhost:3000'
      const proto = request.headers.get('x-forwarded-proto') || 'http'
      const fileUrl = `${proto}://${host}/api/v1/storage/${savedFilename}`

      return NextResponse.json(
        successResponse({
          url: fileUrl,
          filename: savedFilename,
          provider: 'local_storage',
        })
      )
    }

    // 2. Multipart Form-Data
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      const file = formData.get('file') as File | null

      if (!file) {
        throw new ApiError(
          ERROR_CODES.VALIDATION_ERROR,
          400,
          'No file provided in form-data "file"'
        )
      }

      const info = await saveUploadedFile(request, file)
      return NextResponse.json(successResponse(info))
    }

    throw new ApiError(
      ERROR_CODES.VALIDATION_ERROR,
      400,
      'Unsupported content type. Must be application/json or multipart/form-data'
    )
  } catch (error) {
    return handleApiError(error)
  }
}
