import { format as fnsFormat } from 'date-fns'

export const TIMEZONES = [
  { value: 'auto', label: 'Otomatis (Browser)' },
  { value: 'Asia/Jakarta', label: 'WIB - Asia/Jakarta (UTC+7)' },
  { value: 'Asia/Makassar', label: 'WITA - Asia/Makassar (UTC+8)' },
  { value: 'Asia/Jayapura', label: 'WIT - Asia/Jayapura (UTC+9)' },
  { value: 'UTC', label: 'UTC' },
  { value: 'Asia/Singapore', label: 'Singapore (UTC+8)' },
  { value: 'Europe/London', label: 'London (UTC+0/+1)' },
  { value: 'America/New_York', label: 'New York (UTC-5/-4)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (UTC-8/-7)' },
] as const

export function getNow(tz: string = 'auto'): Date {
  const now = new Date()
  if (!tz || tz === 'auto') return now
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false
    })
    const parts = formatter.formatToParts(now)
    const pv = parts.reduce((acc, part) => {
      acc[part.type] = part.value
      return acc
    }, {} as Record<string, string>)
    
    return new Date(
      parseInt(pv.year),
      parseInt(pv.month) - 1,
      parseInt(pv.day),
      parseInt(pv.hour),
      parseInt(pv.minute),
      parseInt(pv.second)
    )
  } catch {
    return now
  }
}

export function getTodayStr(tz: string = 'auto'): string {
  return fnsFormat(getNow(tz), 'yyyy-MM-dd')
}

export function getMomentInTimezone(timeStr: string, dateStr: string, tz: string = 'auto'): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  const [h, m] = timeStr.split(':').map(Number)

  if (!tz || tz === 'auto') {
    return new Date(year, month - 1, day, h, m, 0, 0)
  }

  try {
    const isoString = `${dateStr}T${timeStr.padStart(5, '0')}:00`
    const tempDate = new Date(isoString + 'Z')
    
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false
    })
    
    const parts = formatter.formatToParts(tempDate)
    const pv = parts.reduce((acc, part) => {
      acc[part.type] = part.value
      return acc
    }, {} as Record<string, string>)
    
    const localOfTemp = new Date(
      parseInt(pv.year),
      parseInt(pv.month) - 1,
      parseInt(pv.day),
      parseInt(pv.hour),
      parseInt(pv.minute),
      parseInt(pv.second)
    )
    
    const offsetMs = tempDate.getTime() - localOfTemp.getTime()
    return new Date(tempDate.getTime() + offsetMs)
  } catch {
    return new Date(year, month - 1, day, h, m, 0, 0)
  }
}
