import { z } from 'zod'

const envSchema = z.object({
  MONGODB_URI: z.string().url('MONGODB_URI must be a valid MongoDB connection string'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  UPLOAD_DIR: z.string().optional(),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  CLOUDINARY_URL: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
})

let validatedEnv: z.infer<typeof envSchema> | null = null

export function getValidatedEnv() {
  if (!validatedEnv) {
    const result = envSchema.safeParse(process.env)
    
    if (!result.success) {
      console.error('Environment validation failed:')
      console.error(result.error.flatten())
      throw new Error('Invalid environment variables')
    }
    
    validatedEnv = result.data
  }
  
  return validatedEnv
}
