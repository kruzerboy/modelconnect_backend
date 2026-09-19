import { getValidatedEnv } from './env'

export interface SendPasswordResetEmailParams {
  to: string
  name?: string
  otp: string
  resetToken: string
}

export async function sendPasswordResetEmail({
  to,
  name = 'User',
  otp,
}: SendPasswordResetEmailParams): Promise<{ success: boolean; devOtp?: string; message: string }> {
  const env = getValidatedEnv()

  const subject = 'ModelConnect - Password Reset Verification Code'
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
      <h2 style="color: #4f46e5; margin-bottom: 8px;">ModelConnect</h2>
      <p style="font-size: 16px; color: #1e293b; margin-bottom: 20px;">Hello ${name},</p>
      <p style="font-size: 15px; color: #475569; line-height: 1.5;">
        You requested a password reset for your ModelConnect account. Use the 6-digit verification code below to complete your password reset:
      </p>
      <div style="text-align: center; margin: 28px 0;">
        <span style="display: inline-block; font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #4f46e5; background: #eef2ff; padding: 12px 28px; border-radius: 10px; border: 1px dashed #6366f1;">
          ${otp}
        </span>
      </div>
      <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
        This code is valid for <strong>15 minutes</strong>. If you did not request this password reset, please ignore this email or contact support.
      </p>
      <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0;" />
      <p style="font-size: 12px; color: #94a3b8; text-align: center;">
        &copy; ${new Date().getFullYear()} ModelConnect. All rights reserved.
      </p>
    </div>
  `

  // 1. Check if Resend API key is provided
  if (env.RESEND_API_KEY) {
    try {
      const fromEmail = env.SMTP_FROM || 'ModelConnect <onboarding@resend.dev>'
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [to],
          subject,
          html,
        }),
      })

      if (res.ok) {
        console.log(`[Resend] Successfully sent password reset email to ${to}`)
        return { success: true, message: 'Password reset email sent successfully.' }
      }

      const errorText = await res.text()
      console.error(`[Resend Error] Status: ${res.status}, Body: ${errorText}`)
    } catch (err) {
      console.error('[Resend Exception] Failed to send email via Resend:', err)
    }
  }

  // 2. Check if SMTP configuration exists and try nodemailer dynamically
  if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
    try {
      // Dynamic import to avoid build errors when nodemailer isn't installed
      const nodemailerModule = await import('nodemailer' as string)
      const transporter = nodemailerModule.createTransport({
        host: env.SMTP_HOST,
        port: parseInt(env.SMTP_PORT || '587', 10),
        secure: env.SMTP_PORT === '465',
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        },
      })

      await transporter.sendMail({
        from: env.SMTP_FROM || `"ModelConnect" <${env.SMTP_USER}>`,
        to,
        subject,
        html,
      })

      return { success: true, message: 'Password reset email sent successfully.' }
    } catch (err) {
      console.warn('Failed to send email via SMTP nodemailer:', err)
    }
  }

  // 3. Fallback / Development mode
  console.log(`\n======================================================`)
  console.log(`[MODELCONNECT AUTH] PASSWORD RESET OTP FOR: ${to}`)
  console.log(`OTP CODE: ${otp} (Valid for 15 minutes)`)
  console.log(`======================================================\n`)

  return {
    success: true,
    devOtp: otp,
    message: 'Reset verification code generated.',
  }
}
