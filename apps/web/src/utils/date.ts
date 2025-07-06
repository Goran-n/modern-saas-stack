import { format, parseISO, isValid, differenceInMinutes, startOfDay, isToday, isYesterday } from 'date-fns'

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return ''
  
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(dateObj)) return ''
  
  return format(dateObj, 'PPP')
}

export function formatTime(date: string | Date | null | undefined): string {
  if (!date) return ''
  
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(dateObj)) return ''
  
  return format(dateObj, 'HH:mm')
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return ''
  
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(dateObj)) return ''
  
  return format(dateObj, 'PPP HH:mm')
}

export function formatRelativeDate(date: string | Date | null | undefined): string {
  if (!date) return ''
  
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(dateObj)) return ''
  
  if (isToday(dateObj)) return 'Today'
  if (isYesterday(dateObj)) return 'Yesterday'
  
  return format(dateObj, 'dd/MM/yyyy')
}

export function shouldShowDateSeparator(
  currentDate: string | Date | null | undefined,
  previousDate: string | Date | null | undefined
): boolean {
  if (!currentDate) return false
  if (!previousDate) return true
  
  const current = typeof currentDate === 'string' ? parseISO(currentDate) : currentDate
  const previous = typeof previousDate === 'string' ? parseISO(previousDate) : previousDate
  
  if (!isValid(current) || !isValid(previous)) return false
  
  return startOfDay(current).getTime() !== startOfDay(previous).getTime()
}

export function getTimeDifference(
  date1: string | Date,
  date2: string | Date
): number {
  const d1 = typeof date1 === 'string' ? parseISO(date1) : date1
  const d2 = typeof date2 === 'string' ? parseISO(date2) : date2
  
  return differenceInMinutes(d1, d2)
}

export function convertDatesToStrings<T extends Record<string, any>>(obj: T): T {
  const result = { ...obj } as any
  
  Object.keys(result).forEach((key) => {
    const value = result[key]
    if (value instanceof Date) {
      result[key] = value.toISOString()
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = convertDatesToStrings(value)
    }
  })
  
  return result
}