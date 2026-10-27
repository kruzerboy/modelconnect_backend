import { connectDb } from '@/lib/db'
import { createAccessToken, createRefreshToken } from '@/lib/auth'
import { serialize } from '@/lib/route-utils'

function normalizePhone(phone: string): { cleanPhone: string; bareNumber: string } {
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '').trim()
  const digits = cleanPhone.replace(/\D/g, '')
  const bareNumber = digits.length >= 10 ? digits.slice(-10) : digits
  return { cleanPhone, bareNumber }
}

export async function createPhoneLoginSession(
  phoneNumber: string,
  firebaseUid?: string | null,
) {
  const { cleanPhone, bareNumber } = normalizePhone(phoneNumber)
  const verifiedFirebaseUid = firebaseUid?.trim() || null
  const db = await connectDb()
  let user = await db.collection('users').findOne({
    $or: [
      { phoneNumber: cleanPhone },
      { phoneNumber: `+91${bareNumber}` },
      { phoneNumber: bareNumber },
      { phoneNumber: { $regex: `${bareNumber}$` } },
      ...(verifiedFirebaseUid ? [{ firebaseUid: verifiedFirebaseUid }] : []),
    ],
  })

  const now = new Date()
  let isNewUser = false

  if (!user) {
    isNewUser = true
    const newUser: Record<string, unknown> = {
      phoneNumber: cleanPhone,
      role: 'model',
      firstName: '',
      lastName: '',
      status: 'active',
      isProfileCompleted: false,
      createdAt: now,
      updatedAt: now,
    }
    if (verifiedFirebaseUid) newUser.firebaseUid = verifiedFirebaseUid

    const insertResult = await db.collection('users').insertOne(newUser)
    user = { _id: insertResult.insertedId, ...newUser }
  } else {
    const updateFields: Record<string, unknown> = { updatedAt: now }
    if (!user.phoneNumber) updateFields.phoneNumber = cleanPhone
    if (verifiedFirebaseUid && !user.firebaseUid) {
      updateFields.firebaseUid = verifiedFirebaseUid
    }

    if (Object.keys(updateFields).length > 1) {
      await db.collection('users').updateOne(
        { _id: user._id },
        { $set: updateFields },
      )
    }
  }

  const userId = user._id.toString()
  const isProfileCompleted = Boolean(
    user.isProfileCompleted === true ||
    (user.firstName && user.firstName.trim().length > 0 && user.role),
  )
  const { passwordHash, ...safeUser } = user

  return {
    user: serialize({ ...safeUser, isProfileCompleted }),
    accessToken: await createAccessToken(userId, user.role || 'model'),
    refreshToken: await createRefreshToken(userId),
    isProfileCompleted,
    isNewUser,
  }
}
