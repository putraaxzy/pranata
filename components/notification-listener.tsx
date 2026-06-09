'use client'

import { useEffect, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { differenceInSeconds } from 'date-fns'
import { getNow, getTodayStr, getMomentInTimezone } from '@/lib/timezone'

const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const

export function NotificationListener() {
  const supabase = useMemo(() => createClient(), [])
  const timeoutsRef = useRef<number[]>([])

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return
    }

    const setupNotificationTimers = async () => {
      timeoutsRef.current.forEach((t) => window.clearTimeout(t))
      timeoutsRef.current = []

      if (Notification.permission !== 'granted') {
        return
      }

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        const user = session?.user
        if (!user) return

        const [profileResult, datedResult, recurringResult] = await Promise.all([
          supabase.from('profiles').select('timezone_setting').eq('user_id', user.id).maybeSingle(),
          supabase.from('schedules').select('*').eq('user_id', user.id).eq('is_done', false),
          supabase.from('schedules').select('*').eq('user_id', user.id).eq('is_recurring', true)
        ])

        const tz = profileResult.data?.timezone_setting || 'auto'
        const todayStr = getTodayStr(tz)
        const todayDow = getNow(tz).getDay()

        const datedSchedules = (datedResult.data || []).filter(s => s.date === todayStr)
        const recurringSchedules = (recurringResult.data || []).filter((s) => {
          const isDayMatched = s.recurring_days && s.recurring_days.includes(todayDow)
          const isStarted = !s.start_date || s.start_date <= todayStr
          const isNotEnded = !s.end_date || s.end_date >= todayStr
          const isNotExcluded = !s.exception_dates || !s.exception_dates.includes(todayStr)
          const isNotCompleted = !s.completed_dates || !s.completed_dates.includes(todayStr)
          return isDayMatched && isStarted && isNotEnded && isNotExcluded && isNotCompleted
        })

        const datedIds = new Set(datedSchedules.map(s => s.id))
        const uniqueRecurring = recurringSchedules.filter(s => !datedIds.has(s.id))
        const allSchedules = [...datedSchedules, ...uniqueRecurring]

        if (allSchedules.length === 0) return

        const triggerTelegramNotification = async (title: string, body: string) => {
          try {
            await fetch('/api/telegram-notify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ title, body }),
            })
          } catch (err) {
            console.error('Failed to trigger Telegram notification:', err)
          }
        }

        const now = new Date()

        allSchedules.forEach((sched) => {
          if (sched.type === 'work_departure' && sched.calculated_departure_time) {
            const departureTime = getMomentInTimezone(sched.calculated_departure_time, todayStr, tz)
            const diffSec = differenceInSeconds(departureTime, now)

            const title = 'Time to Leave for Work!'
            const body = `"${sched.title}" starts at ${sched.work_start_time}. Depart now to arrive on time!`

            if (diffSec <= 0 && diffSec > -300) {
              new Notification(title, {
                body,
                requireInteraction: true,
                tag: `departure-${sched.id}`,
              })
              triggerTelegramNotification(title, body)
            } else if (diffSec > 0) {
              const tId = window.setTimeout(() => {
                new Notification(title, {
                  body,
                  requireInteraction: true,
                  tag: `departure-${sched.id}`,
                })
                triggerTelegramNotification(title, body)
              }, diffSec * 1000)

              timeoutsRef.current.push(tId)
            }
          }

          if (sched.reminder_minutes && sched.reminder_minutes > 0 && sched.time) {
            const eventTimeStr = sched.time.includes(' - ') ? sched.time.split(' - ')[0] : sched.time
            const eventTime = getMomentInTimezone(eventTimeStr, todayStr, tz)

            const reminderTime = new Date(eventTime.getTime() - sched.reminder_minutes * 60 * 1000)
            const diffSec = differenceInSeconds(reminderTime, now)

            const recurringLabel = sched.is_recurring ? ` (${DAY_LABELS[todayDow]})` : ''
            const reminderLabel = sched.reminder_minutes >= 60
              ? `${sched.reminder_minutes / 60} hour(s)`
              : `${sched.reminder_minutes} minutes`

            const title = `Upcoming: ${sched.title}${recurringLabel}`
            const body = `Starting in ${reminderLabel} at ${eventTimeStr}.`

            if (diffSec <= 0 && diffSec > -300) {
              new Notification(title, {
                body,
                requireInteraction: true,
                tag: `reminder-${sched.id}`,
              })
              triggerTelegramNotification(title, body)
            } else if (diffSec > 0) {
              const tId = window.setTimeout(() => {
                new Notification(title, {
                  body,
                  requireInteraction: true,
                  tag: `reminder-${sched.id}`,
                })
                triggerTelegramNotification(title, body)
              }, diffSec * 1000)

              timeoutsRef.current.push(tId)
            }
          }
        })
      } catch (err) {
        console.error('Error setting up notification timers:', err)
      }
    }

    setupNotificationTimers()

    return () => {
      timeoutsRef.current.forEach((t) => window.clearTimeout(t))
    }
  }, [supabase])

  return null
}
