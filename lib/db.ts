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
  // Users collection
  await db.collection('users').createIndex({ email: 1 }, { unique: true })
  await db.collection('users').createIndex({ username: 1 }, { unique: true, sparse: true })

  // Model profiles
  await db.collection('modelProfiles').createIndex({ userId: 1 }, { unique: true })
  await db.collection('modelProfiles').createIndex({ 'metrics.discoveryScore': -1 })

  // Business profiles
  await db.collection('businessProfiles').createIndex({ userId: 1 }, { unique: true })

  // Portfolio items
  await db.collection('portfolioItems').createIndex({ userId: 1 })
  await db.collection('portfolioItems').createIndex({ createdAt: -1 })

  // Model pricing
  await db.collection('modelPricing').createIndex({ userId: 1 }, { unique: true })

  // Availability
  await db.collection('availability').createIndex({ userId: 1 })
  await db.collection('availability').createIndex({ startDate: 1, endDate: 1 })

  // Opportunities
  await db.collection('opportunities').createIndex({ createdBy: 1 })
  await db.collection('opportunities').createIndex({ status: 1, deadline: 1 })
  await db.collection('opportunities').createIndex({ 'budget.min': 1, 'budget.max': 1 })
  await db.collection('opportunities').createIndex({ tags: 1 })

  // Applications
  await db.collection('applications').createIndex({ opportunityId: 1, userId: 1 }, { unique: true })
  await db.collection('applications').createIndex({ userId: 1 })
  await db.collection('applications').createIndex({ opportunityId: 1 })
  await db.collection('applications').createIndex({ status: 1, updatedAt: -1 })

  // Shortlists
  await db.collection('shortlists').createIndex({ userId: 1, modelId: 1 }, { unique: true })
  await db.collection('shortlists').createIndex({ userId: 1 })
  await db.collection('shortlists').createIndex({ createdAt: -1 })

  // Conversations
  await db.collection('conversations').createIndex({ participants: 1 })
  await db.collection('conversations').createIndex({ opportunityId: 1, applicantId: 1 }, { sparse: true })
  await db.collection('conversations').createIndex({ updatedAt: -1 })

  // Messages
  await db.collection('messages').createIndex({ conversationId: 1, createdAt: -1 })
  await db.collection('messages').createIndex({ senderId: 1 })

  // Notifications
  await db.collection('notifications').createIndex({ userId: 1, createdAt: -1 })
  await db.collection('notifications').createIndex({ userId: 1, read: 1 })
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
