import { z } from 'zod'

// Auth schemas
export const loginSchema = z.object({
  email: z.string().email('Invalid email address').min(1, 'Email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters')
})

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name is too long'),
  email: z.string().email('Invalid email address').min(1, 'Email is required'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword']
})

// Quiz schemas
export const flagSubmissionSchema = z.object({
  labId: z.string().min(1, 'Lab ID is required'),
  challengeId: z.string().min(1, 'Challenge ID is required'),
  flag: z.string()
    .min(1, 'Flag is required')
    .regex(/^RANGEOPS\{[A-Za-z0-9_\-]{5,200}\}$/, 'Flag must be in format: RANGEOPS{flag_content}'),
  timeSpent: z.number().min(0, 'Time spent must be positive')
})

// Lab schemas
export const createLabSchema = z.object({
  id: z.string().min(1, 'Lab ID is required'),
  title: z.string().min(3, 'Title must be at least 3 characters').max(200, 'Title is too long'),
  description: z.string().min(10, 'Description must be at least 10 characters').max(2000, 'Description is too long'),
  difficulty: z.enum(['Beginner', 'Intermediate', 'Advanced'], {
    errorMap: () => ({ message: 'Invalid difficulty level' })
  }),
  price: z.number().min(0, 'Price must be positive').max(100000, 'Price is too high'),
  duration: z.string().min(1, 'Duration is required'),
  category: z.string().min(2, 'Category is required'),
  instructor: z.string().min(2, 'Instructor name is required'),
  rating: z.number().min(0).max(5, 'Rating must be between 0 and 5').optional().default(4.5),
  students: z.number().min(0, 'Students count must be positive').optional().default(0),
  image: z.string().url('Invalid image URL').optional().default('/placeholder.jpg'),
  vmIpAddress: z.string().ip({ version: 'v4' }).optional().or(z.literal('')),
  learningOutcomes: z.array(z.string()).optional().default([]),
  requirements: z.array(z.string()).optional().default([]),
  whatYouGet: z.array(z.string()).optional().default([]),
  curriculum: z.array(z.object({
    module: z.string(),
    duration: z.string(),
    topics: z.array(z.string())
  })).optional().default([])
})

export const updateLabSchema = createLabSchema.partial().omit({ id: true })

// Payment schemas
export const createOrderSchema = z.object({
  labId: z.string().min(1, 'Lab ID is required'),
  amount: z.number().min(1, 'Amount must be greater than 0'),
  currency: z.string().default('INR'),
  notes: z.record(z.string()).optional()
})

export const verifyPaymentSchema = z.object({
  razorpay_order_id: z.string().min(1, 'Order ID is required'),
  razorpay_payment_id: z.string().min(1, 'Payment ID is required'),
  razorpay_signature: z.string().min(1, 'Signature is required'),
  labId: z.string().min(1, 'Lab ID is required')
})

// User schemas
export const updateUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name is too long').optional(),
  email: z.string().email('Invalid email address').optional(),
  role: z.enum(['user', 'admin']).optional()
})

export const sendVmCredentialsSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  labId: z.string().min(1, 'Lab ID is required'),
  vmIpAddress: z.string().ip({ version: 'v4', message: 'Invalid IP address' }),
  username: z.string().min(1, 'Username is required').max(50, 'Username is too long'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(100, 'Password is too long')
})

// Contact/Support schemas
export const contactFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name is too long'),
  email: z.string().email('Invalid email address'),
  subject: z.string().min(5, 'Subject must be at least 5 characters').max(200, 'Subject is too long'),
  message: z.string().min(10, 'Message must be at least 10 characters').max(2000, 'Message is too long')
})

// Type exports for TypeScript
export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type FlagSubmissionInput = z.infer<typeof flagSubmissionSchema>
export type CreateLabInput = z.infer<typeof createLabSchema>
export type UpdateLabInput = z.infer<typeof updateLabSchema>
export type CreateOrderInput = z.infer<typeof createOrderSchema>
export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
export type SendVmCredentialsInput = z.infer<typeof sendVmCredentialsSchema>
export type ContactFormInput = z.infer<typeof contactFormSchema>
