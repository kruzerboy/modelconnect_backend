import { Db, ObjectId } from 'mongodb'
import { connectDb } from './db'
import { hashPassword } from './auth'

export interface AdminUserDoc {
  _id?: ObjectId
  email: string
  passwordHash: string
  name: string
  fullName?: string
  role: 'superadmin' | 'admin'
  active: boolean
  createdAt: Date
  updatedAt: Date
  lastLoginAt?: Date
  lastLoginIp?: string
}

export async function getAdminCollection(db?: Db) {
  const database = db || (await connectDb())
  return database.collection<AdminUserDoc>('adminUsers')
}

/**
 * Ensures the admin collection exists and has at least one SuperAdmin account.
 * Configurable via ADMIN_EMAIL and ADMIN_INITIAL_PASSWORD environment variables.
 */
export async function ensureInitialAdmin(db?: Db) {
  const collection = await getAdminCollection(db)

  // Ensure unique index on email
  try {
    await collection.createIndex({ email: 1 }, { unique: true })
  } catch (_) {}

  const count = await collection.countDocuments()
  if (count === 0) {
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@bookshoot.in').toLowerCase().trim()
    const initialPassword = process.env.ADMIN_INITIAL_PASSWORD || 'BookShoot@Admin2025!'
    const passwordHash = await hashPassword(initialPassword)

    const initialAdmin: AdminUserDoc = {
      email: adminEmail,
      passwordHash,
      name: 'BookShoot SuperAdmin',
      role: 'superadmin',
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    await collection.insertOne(initialAdmin)
    console.log(`[AdminAuth] Initial admin account created: ${adminEmail}`)
  }
}
