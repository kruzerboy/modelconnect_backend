import { MongoClient, Db } from 'mongodb'
import { getValidatedEnv } from './env'

let cachedClient: MongoClient | null = null
let cachedDb: Db | null = null

export async function connectDb(): Promise<Db> {
  if (cachedDb) {
    return cachedDb
  }

  const env = getValidatedEnv()

  const client = new MongoClient(env.MONGODB_URI)
  await client.connect()

  cachedClient = client
  cachedDb = client.db('modelconnect')

  // Create indexes on first connection
  await createIndexes(cachedDb)

  return cachedDb
}

async function createIndexes(db: Db) {
  try {
    // Users collection
    try {
      await db.collection('users').updateMany({ email: null }, { $unset: { email: '' } }).catch(() => {})
      await db.collection('users').createIndex({ email: 1 }, { unique: true, sparse: true })
    } catch (err: any) {
      if (err?.code === 85 || err?.codeName === 'IndexOptionsConflict') {
        try {
          await db.collection('users').dropIndex('email_1')
          await db.collection('users').createIndex({ email: 1 }, { unique: true, sparse: true })
        } catch (_) {}
      }
    }

    try {
      await db.collection('users').createIndex({ phoneNumber: 1 }, { unique: true, sparse: true })
    } catch (_) {}

    try {
      await db.collection('users').createIndex({ username: 1 }, { unique: true, sparse: true })
    } catch (_) {}

    // Model profiles
    await db.collection('modelProfiles').createIndex({ userId: 1 }, { unique: true }).catch(() => {})
    await db.collection('modelProfiles').createIndex({ 'metrics.discoveryScore': -1 }).catch(() => {})

    // Business profiles
    await db.collection('businessProfiles').createIndex({ userId: 1 }, { unique: true }).catch(() => {})

    // Portfolio items
    await db.collection('portfolioItems').createIndex({ userId: 1 }).catch(() => {})
    await db.collection('portfolioItems').createIndex({ createdAt: -1 }).catch(() => {})

    // Model pricing
    await db.collection('modelPricing').createIndex({ userId: 1 }, { unique: true }).catch(() => {})

    // Availability
    await db.collection('availability').createIndex({ userId: 1 }).catch(() => {})
    await db.collection('availability').createIndex({ startDate: 1, endDate: 1 }).catch(() => {})

    // Opportunities
    await db.collection('opportunities').createIndex({ createdBy: 1 }).catch(() => {})
    await db.collection('opportunities').createIndex({ status: 1, deadline: 1 }).catch(() => {})
    await db.collection('opportunities').createIndex({ 'budget.min': 1, 'budget.max': 1 }).catch(() => {})
    await db.collection('opportunities').createIndex({ tags: 1 }).catch(() => {})

    // Applications
    await db.collection('applications').createIndex({ opportunityId: 1, userId: 1 }, { unique: true }).catch(() => {})
    await db.collection('applications').createIndex({ userId: 1 }).catch(() => {})
    await db.collection('applications').createIndex({ opportunityId: 1 }).catch(() => {})
    await db.collection('applications').createIndex({ status: 1, updatedAt: -1 }).catch(() => {})

    // Shortlists
    await db.collection('shortlists').createIndex({ userId: 1, modelId: 1 }, { unique: true }).catch(() => {})
    await db.collection('shortlists').createIndex({ userId: 1 }).catch(() => {})
    await db.collection('shortlists').createIndex({ createdAt: -1 }).catch(() => {})

    // Notifications
    await db.collection('notifications').createIndex({ userId: 1, createdAt: -1 }).catch(() => {})
    await db.collection('notifications').createIndex({ userId: 1, read: 1 }).catch(() => {})

    // Password Resets
    await db.collection('passwordResets').createIndex({ email: 1 }).catch(() => {})
    await db.collection('passwordResets').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }).catch(() => {})

    // Banners
    await db.collection('banners').createIndex({ active: 1, displayOrder: 1 }).catch(() => {})
    await db.collection('banners').createIndex({ createdAt: -1 }).catch(() => {})

    // Featured Profiles
    await db.collection('featuredProfiles').createIndex({ active: 1, slotOrder: 1 }).catch(() => {})
    await db.collection('featuredProfiles').createIndex({ userId: 1 }, { unique: true }).catch(() => {})
  } catch (e) {
    console.warn('[DB] Index creation warning:', e)
  }
}

export function getDb(): Db {
  if (!cachedDb) {
    throw new Error('Database not connected. Call connectDb() first.')
  }
  return cachedDb
}

export async function closeDb(): Promise<void> {
  if (cachedClient) {
    await cachedClient.close()
    cachedClient = null
    cachedDb = null
  }
}
