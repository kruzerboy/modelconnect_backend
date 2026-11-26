import { NextRequest, NextResponse } from 'next/server'
import { connectDb } from '@/lib/db'
import { handleApiError, requireAdmin } from '@/lib/middleware'
import { successResponse, ApiError, ERROR_CODES } from '@/lib/api-response'
import { queryParam } from '@/lib/route-utils'

const SAMPLE_TICKETS = [
  {
    ticketNumber: 'TICK-1001',
    userId: 'user_sample_1',
    userName: 'Aanya Sharma',
    userEmail: 'aanya.sharma@example.com',
    userPhone: '+91 98765 43210',
    userRole: 'model',
    subject: 'Client cancelled commercial shoot 2 hours prior without compensation',
    description:
      'The studio client booked me for a full-day campaign in Mumbai. At 7:00 AM they messaged cancelling the shoot without paying the agreed 50% late-cancellation fee. Requesting escrow intervention.',
    category: 'shoot_dispute',
    priority: 'urgent',
    status: 'open',
    assignedTo: null,
    shootId: 'shoot_8829',
    opportunityTitle: 'Zara Spring Summer Lookbook Shoot',
    attachments: [
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80',
    ],
    messages: [
      {
        id: 'msg_1',
        senderId: 'user_sample_1',
        senderName: 'Aanya Sharma',
        senderType: 'user',
        message:
          'Client cancelled 2 hours before call time. Please review the booking contract and release cancellation compensation from escrow.',
        isInternalNote: false,
        createdAt: new Date(Date.now() - 3600 * 4 * 1000),
      },
    ],
    createdAt: new Date(Date.now() - 3600 * 4 * 1000),
    updatedAt: new Date(Date.now() - 3600 * 4 * 1000),
  },
  {
    ticketNumber: 'TICK-1002',
    userId: 'user_sample_2',
    userName: 'Vikram Mehta',
    userEmail: 'vikram.cine@example.com',
    userPhone: '+91 91234 56789',
    userRole: 'camera',
    subject: 'Payout not reflecting in bank account after shoot completion',
    description:
      'Completed a 2-day corporate shoot 5 business days ago. Studio approved completion but Razorpay payout status still shows pending in my wallet balance.',
    category: 'payment_escrow',
    priority: 'high',
    status: 'in_progress',
    assignedTo: 'admin@bookshoot.in',
    shootId: 'shoot_8830',
    opportunityTitle: 'Automotive TVC Brand Commercial',
    attachments: [],
    messages: [
      {
        id: 'msg_2',
        senderId: 'user_sample_2',
        senderName: 'Vikram Mehta',
        senderType: 'user',
        message: 'Shoot was completed on Nov 21. Bank payout is delayed. Need assistance.',
        isInternalNote: false,
        createdAt: new Date(Date.now() - 3600 * 24 * 1000),
      },
      {
        id: 'msg_3',
        senderId: 'admin_1',
        senderName: 'BookShoot Operations',
        senderType: 'admin',
        message: 'Checking payout settlement batch with Razorpay Route API. Will update within 2 hours.',
        isInternalNote: false,
        createdAt: new Date(Date.now() - 3600 * 12 * 1000),
      },
    ],
    createdAt: new Date(Date.now() - 3600 * 24 * 1000),
    updatedAt: new Date(Date.now() - 3600 * 12 * 1000),
  },
  {
    ticketNumber: 'TICK-1003',
    userId: 'user_sample_3',
    userName: 'Karan Patel',
    userEmail: 'karan.drones@example.com',
    userPhone: '+91 98888 77777',
    userRole: 'drone',
    subject: 'DGCA Remote Pilot Certificate upload failed during profile edit',
    description:
      'I renewed my DGCA Type Certificate and tried uploading the new PDF certificate on mobile app, but getting upload timeout error.',
    category: 'verification',
    priority: 'normal',
    status: 'open',
    assignedTo: null,
    shootId: null,
    opportunityTitle: null,
    attachments: [],
    messages: [
      {
        id: 'msg_4',
        senderId: 'user_sample_3',
        senderName: 'Karan Patel',
        senderType: 'user',
        message: 'Getting file upload error code 413 on DGCA license PDF.',
        isInternalNote: false,
        createdAt: new Date(Date.now() - 3600 * 30 * 1000),
      },
    ],
    createdAt: new Date(Date.now() - 3600 * 30 * 1000),
    updatedAt: new Date(Date.now() - 3600 * 30 * 1000),
  },
  {
    ticketNumber: 'TICK-1004',
    userId: 'user_sample_4',
    userName: 'Vogue Studios India',
    userEmail: 'casting@voguestudios.in',
    userPhone: '+91 99999 11111',
    userRole: 'business',
    subject: 'Candidate no-show for commercial jewellery photoshoot',
    description:
      'Booked talent did not report to studio call time and phone was unreachable. We had to hire emergency backup. Requesting no-show flag and fee refund.',
    category: 'shoot_dispute',
    priority: 'high',
    status: 'open',
    assignedTo: null,
    shootId: 'shoot_8835',
    opportunityTitle: 'Kundan Bridal Jewellery Shoot',
    attachments: [],
    messages: [
      {
        id: 'msg_5',
        senderId: 'user_sample_4',
        senderName: 'Vogue Studios India',
        senderType: 'user',
        message: 'Talent failed to appear at 9:00 AM call. Production delayed by 4 hours.',
        isInternalNote: false,
        createdAt: new Date(Date.now() - 3600 * 48 * 1000),
      },
    ],
    createdAt: new Date(Date.now() - 3600 * 48 * 1000),
    updatedAt: new Date(Date.now() - 3600 * 48 * 1000),
  },
  {
    ticketNumber: 'TICK-1005',
    userId: 'user_sample_5',
    userName: 'Riya Sen',
    userEmail: 'riya.sen@example.com',
    userPhone: '+91 94444 33333',
    userRole: 'model',
    subject: 'Push notifications sound not playing on iOS 18',
    description:
      'I am receiving casting notifications silently without vibration or alert sound on iPhone 15 Pro.',
    category: 'bug_report',
    priority: 'low',
    status: 'resolved',
    assignedTo: 'admin@bookshoot.in',
    shootId: null,
    opportunityTitle: null,
    attachments: [],
    resolutionNote: 'User was guided to enable sound permissions in iOS Settings > Notifications > BookShoot.',
    resolvedAt: new Date(Date.now() - 3600 * 72 * 1000),
    messages: [
      {
        id: 'msg_6',
        senderId: 'user_sample_5',
        senderName: 'Riya Sen',
        senderType: 'user',
        message: 'Notification sound muted on iOS 18.',
        isInternalNote: false,
        createdAt: new Date(Date.now() - 3600 * 80 * 1000),
      },
      {
        id: 'msg_7',
        senderId: 'admin_1',
        senderName: 'BookShoot Operations',
        senderType: 'admin',
        message: 'APNs payload sound key verified. Guided user to verify notification settings.',
        isInternalNote: true,
        createdAt: new Date(Date.now() - 3600 * 75 * 1000),
      },
    ],
    createdAt: new Date(Date.now() - 3600 * 80 * 1000),
    updatedAt: new Date(Date.now() - 3600 * 72 * 1000),
  },
]

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request)
    const db = await connectDb()
    const ticketsCollection = db.collection('support_tickets')

    // Seed sample tickets if collection is currently empty
    const count = await ticketsCollection.countDocuments()
    if (count === 0) {
      await ticketsCollection.insertMany(SAMPLE_TICKETS)
    }

    const status = queryParam(request, 'status')
    const category = queryParam(request, 'category')
    const priority = queryParam(request, 'priority')
    const search = queryParam(request, 'search')

    const filter: Record<string, any> = {}

    if (status && status !== 'all') {
      filter.status = status.toLowerCase()
    }
    if (category && category !== 'all') {
      filter.category = category.toLowerCase()
    }
    if (priority && priority !== 'all') {
      filter.priority = priority.toLowerCase()
    }
    if (search) {
      const q = search.trim()
      filter.$or = [
        { ticketNumber: { $regex: q, $options: 'i' } },
        { subject: { $regex: q, $options: 'i' } },
        { userName: { $regex: q, $options: 'i' } },
        { userEmail: { $regex: q, $options: 'i' } },
        { userPhone: { $regex: q, $options: 'i' } },
      ]
    }

    const tickets = await ticketsCollection
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray()

    const formatted = tickets.map((t) => ({
      id: t._id.toString(),
      ticketNumber: t.ticketNumber,
      userId: t.userId,
      userName: t.userName,
      userEmail: t.userEmail,
      userPhone: t.userPhone,
      userRole: t.userRole,
      subject: t.subject,
      description: t.description,
      category: t.category,
      priority: t.priority,
      status: t.status,
      assignedTo: t.assignedTo,
      shootId: t.shootId,
      opportunityTitle: t.opportunityTitle,
      attachments: t.attachments || [],
      messagesCount: Array.isArray(t.messages) ? t.messages.length : 0,
      resolutionNote: t.resolutionNote || null,
      resolvedAt: t.resolvedAt || null,
      createdAt: t.createdAt
        ? new Date(t.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
        : 'Recent',
      updatedAt: t.updatedAt
        ? new Date(t.updatedAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })
        : 'Recent',
    }))

    return NextResponse.json(successResponse(formatted))
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { userId, userName, userEmail, userPhone, userRole, subject, description, category, priority, shootId, opportunityTitle, attachments } = body

    if (!subject || !description) {
      throw new ApiError(ERROR_CODES.VALIDATION_ERROR, 400, 'subject and description are required')
    }

    const db = await connectDb()
    const ticketsCollection = db.collection('support_tickets')

    const ticketNumber = `TICK-${Math.floor(1000 + Math.random() * 9000)}`

    const newTicket = {
      ticketNumber,
      userId: userId || 'anonymous',
      userName: userName || 'User',
      userEmail: userEmail || 'user@example.com',
      userPhone: userPhone || '',
      userRole: userRole || 'model',
      subject: subject.trim(),
      description: description.trim(),
      category: category || 'general',
      priority: priority || 'normal',
      status: 'open',
      assignedTo: null,
      shootId: shootId || null,
      opportunityTitle: opportunityTitle || null,
      attachments: attachments || [],
      messages: [
        {
          id: `msg_${Date.now()}`,
          senderId: userId || 'anonymous',
          senderName: userName || 'User',
          senderType: 'user',
          message: description.trim(),
          isInternalNote: false,
          createdAt: new Date(),
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await ticketsCollection.insertOne(newTicket)

    return NextResponse.json(
      successResponse({ id: result.insertedId.toString(), ticketNumber }, 'Support ticket created successfully')
    )
  } catch (error) {
    return handleApiError(error)
  }
}
