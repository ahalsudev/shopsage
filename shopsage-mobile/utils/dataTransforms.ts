/**
 * Utility functions for transforming backend responses to frontend types
 */

// Helper to safely parse dates
const parseDate = (dateString: string | Date | undefined): Date | undefined => {
  if (!dateString) return undefined
  if (dateString instanceof Date) return dateString

  try {
    const parsed = new Date(dateString)
    return isNaN(parsed.getTime()) ? undefined : parsed
  } catch {
    return undefined
  }
}
