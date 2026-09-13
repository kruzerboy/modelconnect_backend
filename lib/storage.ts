import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { NextRequest } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'
import { ApiError, ERROR_CODES } from './api-response'

/**
 * Checks if Cloudinary credentials are provided via environment variables.
 */
export function isCloudinaryConfigured(): boolean {
  if (process.env.CLOUDINARY_URL && process.env.CLOUDINARY_URL.trim().length > 0) {
    return true
  }
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  )
}

function initCloudinary() {
  if (process.env.CLOUDINARY_URL) {
    cloudinary.config({
      cloudinary_url: process.env.CLOUDINARY_URL,
      secure: true,
    })
  } else if (process.env.CLOUDINARY_CLOUD_NAME) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    })
  }
}

/**
 * Uploads a file buffer directly to Cloudinary.
 */
export async function uploadToCloudinary(
  buffer: Buffer,
  folder = 'modelconnect'
): Promise<{ url: string; publicId: string }> {
  initCloudinary()
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
      },
      (error, result) => {
        if (error || !result) {
          reject(new ApiError(ERROR_CODES.INTERNAL_ERROR, 500, error?.message || 'Cloudinary upload failed'))
        } else {
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
          })
        }
      }
    )
    uploadStream.end(buffer)
  })
}


const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/jpg',
  'image/gif',
])

const MIME_EXTENSION_MAP: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/heic': '.heic',
  'image/gif': '.gif',
}

const EXTENSION_MIME_MAP: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.heic': 'image/heic',
  '.gif': 'image/gif',
}

const MAX_FILE_SIZE = 15 * 1024 * 1024 // 15MB

/**
 * Returns the persistent storage directory outside the deployment directory.
 * Configured via UPLOAD_DIR environment variable, or defaults to `../modelconnect_storage`.
 */
export function getStorageDir(): string {
  const customDir = process.env.UPLOAD_DIR?.trim()
  const storageDir = customDir && customDir.length > 0
    ? path.resolve(customDir)
    : path.resolve(process.cwd(), '../modelconnect_storage')

  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true })
  }

  return storageDir
}

export interface SavedFileInfo {
  filename: string
  size: number
  mimeType: string
  url: string
}

/**
 * Validates and saves an uploaded file to the persistent external storage folder.
 */
export async function saveUploadedFile(request: NextRequest, file: File): Promise<SavedFileInfo> {
  const mimeType = file.type?.toLowerCase() || 'application/octet-stream'
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new ApiError(
      ERROR_CODES.VALIDATION_ERROR,
      400,
      `Unsupported file type: ${mimeType}. Allowed formats: JPG, PNG, WEBP, HEIC, GIF`
    )
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new ApiError(
      ERROR_CODES.VALIDATION_ERROR,
      400,
      `File exceeds maximum limit of 15MB (${(file.size / (1024 * 1024)).toFixed(1)}MB)`
    )
  }

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  // 1. If Cloudinary is configured, upload directly to Cloudinary
  if (isCloudinaryConfigured()) {
    const { url, publicId } = await uploadToCloudinary(buffer)
    return {
      filename: publicId,
      size: file.size,
      mimeType,
      url,
    }
  }

  // 2. Fallback to local persistent disk storage
  let ext = path.extname(file.name || '').toLowerCase()
  if (!ext || ext.length < 2) {
    ext = MIME_EXTENSION_MAP[mimeType] || '.jpg'
  }

  // Collision-resistant unique filename
  const timestamp = Date.now()
  const randomHex = crypto.randomBytes(8).toString('hex')
  const filename = `img_${timestamp}_${randomHex}${ext}`

  const storageDir = getStorageDir()
  const targetPath = path.join(storageDir, filename)

  await fs.promises.writeFile(targetPath, buffer)

  const url = buildPublicUrl(request, filename)

  return {
    filename,
    size: file.size,
    mimeType,
    url,
  }
}

/**
 * Safely reads a file from external storage, guarding against directory traversal attacks.
 */
export async function getStoredFile(filename: string): Promise<{ buffer: Buffer; mimeType: string }> {
  // Guard against path traversal
  if (!filename || typeof filename !== 'string' || !/^[a-zA-Z0-9_\-\.]+$/.test(filename) || filename.includes('..')) {
    throw new ApiError(ERROR_CODES.VALIDATION_ERROR, 400, 'Invalid filename format')
  }

  const storageDir = getStorageDir()
  const filePath = path.resolve(storageDir, filename)

  // Verify the resolved path is strictly inside storageDir
  if (!filePath.startsWith(storageDir)) {
    throw new ApiError(ERROR_CODES.FORBIDDEN, 403, 'Access denied')
  }

  if (!fs.existsSync(filePath)) {
    throw new ApiError(ERROR_CODES.NOT_FOUND, 404, 'File not found')
  }

  const ext = path.extname(filename).toLowerCase()
  const mimeType = EXTENSION_MIME_MAP[ext] || 'application/octet-stream'

  const buffer = await fs.promises.readFile(filePath)
  return { buffer, mimeType }
}

/**
 * Constructs an absolute public URL to access the uploaded file.
 */
export function buildPublicUrl(request: NextRequest, filename: string): string {
  const forwardedHost = request.headers.get('x-forwarded-host')
  const host = forwardedHost || request.headers.get('host') || 'localhost:3000'
  const forwardedProto = request.headers.get('x-forwarded-proto')
  const protocol = forwardedProto || (request.url.startsWith('https') ? 'https' : 'http')

  return `${protocol}://${host}/api/v1/uploads/${filename}`
}
