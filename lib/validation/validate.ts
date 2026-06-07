import { z } from 'zod'

/**
 * Validation helper that parses data with a Zod schema and returns normalized errors
 * Returns: { success: true, data } or { success: false, errors: { field: message } }
 */
export async function validate<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown
): Promise<
  | { success: true; data: z.infer<T>; errors?: never }
  | { success: false; data?: never; errors: Record<string, string> }
> {
  try {
    const result = await schema.parseAsync(data)
    return { success: true, data: result }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {}
      error.errors.forEach((err) => {
        const path = err.path.join('.')
        errors[path] = err.message
      })
      return { success: false, errors }
    }
    // Unknown error
    return { 
      success: false, 
      errors: { _general: 'Validation failed' } 
    }
  }
}

/**
 * Synchronous validation helper
 */
export function validateSync<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown
):
  | { success: true; data: z.infer<T>; errors?: never }
  | { success: false; data?: never; errors: Record<string, string> }
{
  try {
    const result = schema.parse(data)
    return { success: true, data: result }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {}
      error.errors.forEach((err) => {
        const path = err.path.join('.')
        errors[path] = err.message
      })
      return { success: false, errors }
    }
    return { 
      success: false, 
      errors: { _general: 'Validation failed' } 
    }
  }
}

/**
 * Extract first error message from validation errors
 */
export function getFirstError(errors: Record<string, string>): string {
  const firstKey = Object.keys(errors)[0]
  return errors[firstKey] || 'Validation failed'
}
