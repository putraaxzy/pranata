'use client'

import { useEffect, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format, differenceInSeconds } from 'date-fns'

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

        const todayStr = format(new Date(), 'yyyy-MM-dd')
        const { data: schedules } = await supabase
          .from('schedules')
          .select('*')
          .eq('user_id', user.id)
          .eq('date', todayStr)
          .eq('type', 'work_departure')

        if (!schedules || schedules.length === 0) return

        const now = new Date()

        schedules.forEach((sched) => {
          if (!sched.calculated_departure_time) return

          const [depHours, depMins] = sched.calculated_departure_time.split(':').map(Number)
          const departureTime = new Date()
          departureTime.setHours(depHours, depMins, 0, 0)

          const diffSec = differenceInSeconds(departureTime, now)

          if (diffSec <= 0 && diffSec > -300) {
            new Notification('Time to Leave for Work! 🧭', {
              body: `"${sched.title}" starts at ${sched.work_start_time}. Depart now to arrive on time!`,
              requireInteraction: true,
              tag: `departure-${sched.id}`,
            })
          } else if (diffSec > 0) {
            const tId = window.setTimeout(() => {
              new Notification('Time to Leave for Work! 🧭', {
                body: `"${sched.title}" starts at ${sched.work_start_time}. Depart now to arrive on time!`,
                requireInteraction: true,
                tag: `departure-${sched.id}`,
              })
            }, diffSec * 1000)

            timeoutsRef.current.push(tId)
          }
        })
      } catch (err) {
        console.error('Error setting up departure notification timers:', err)
      }
    }

    setupNotificationTimers()

    return () => {
      timeoutsRef.current.forEach((t) => window.clearTimeout(t))
    }
  }, [supabase])

  return null
}
