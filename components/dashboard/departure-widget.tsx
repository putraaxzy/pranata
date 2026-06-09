'use client'

import React, { useEffect, useState } from 'react'
import { Compass, Clock, MapPin, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { differenceInMinutes } from 'date-fns'

interface DepartureSchedule {
  id: string
  title: string
  work_start_time: string
  travel_duration_minutes: number
  traffic_buffer_minutes: number
  calculated_departure_time: string
  location?: string
}

interface DepartureWidgetProps {
  schedule?: DepartureSchedule
}

export function DepartureWidget({ schedule }: DepartureWidgetProps) {
  const [timeLeft, setTimeLeft] = useState<string>('')
  const [status, setStatus] = useState<'pending' | 'due_soon' | 'overdue' | 'none'>('none')

  useEffect(() => {
    let active = true

    const update = () => {
      if (!active) return
      if (!schedule || !schedule.calculated_departure_time) {
        setStatus('none')
        setTimeLeft('')
        return
      }

      const now = new Date()
      const [depHours, depMins] = schedule.calculated_departure_time.split(':').map(Number)
      
      const departureTime = new Date()
      departureTime.setHours(depHours, depMins, 0, 0)

      const diffMins = differenceInMinutes(departureTime, now)

      if (diffMins < 0) {
        setStatus('overdue')
        setTimeLeft('Passed')
      } else if (diffMins <= 15) {
        setStatus('due_soon')
        setTimeLeft(`${diffMins}m remaining`)
      } else {
        setStatus('pending')
        const hrs = Math.floor(diffMins / 60)
        const mins = diffMins % 60
        setTimeLeft(hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`)
      }
    }

    const timeoutId = setTimeout(update, 0)
    const intervalId = setInterval(update, 1000)

    return () => {
      active = false
      clearTimeout(timeoutId)
      clearInterval(intervalId)
    }
  }, [schedule])

  if (status === 'none') {
    return (
      <Card className="border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-stone-500 dark:text-stone-400 flex items-center gap-2">
            <Compass className="size-4 text-stone-400" />
            Departure Reminder
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-stone-600 dark:text-stone-400">
            No work departure schedule set for today. Use the add (+) button at the bottom right to schedule one.
          </p>
        </CardContent>
      </Card>
    )
  }

  const getBorderColor = () => {
    switch (status) {
      case 'due_soon':
        return 'border-stone-400 dark:border-stone-600 bg-stone-50 dark:bg-stone-900/50'
      case 'overdue':
        return 'border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50'
      default:
        return 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900'
    }
  }

  const getBadgeStyle = () => {
    switch (status) {
      case 'due_soon':
        return 'bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-950 animate-pulse'
      case 'overdue':
        return 'bg-stone-100 text-stone-750 dark:bg-stone-800 dark:text-stone-300'
      default:
        return 'bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-950'
    }
  }

  return (
    <Card className={`border shadow-sm transition-all duration-300 ${getBorderColor()}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-stone-600 dark:text-stone-400 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Compass className="size-4 text-stone-900 dark:text-stone-100" />
            Work Departure Reminder
          </span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getBadgeStyle()}`}>
            {status === 'overdue' ? 'Departed' : status === 'due_soon' ? 'Leave Soon' : 'Active'}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-base text-stone-800 dark:text-stone-100">{schedule!.title}</h3>
            {schedule!.location && (
              <p className="text-xs text-stone-500 dark:text-stone-400 flex items-center gap-1 mt-0.5">
                <MapPin className="size-3" />
                {schedule!.location}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold font-mono tracking-tight text-stone-900 dark:text-stone-150">
              {schedule!.calculated_departure_time}
            </p>
            <p className="text-[10px] text-stone-400 uppercase tracking-wider font-semibold">Departure Time</p>
          </div>
        </div>

        <div className="border-t border-stone-100 dark:border-stone-800 pt-2 flex items-center justify-between text-xs text-stone-600 dark:text-stone-400">
          <div className="flex items-center gap-1.5">
            <Clock className="size-3.5 text-stone-400" />
            <span>Work starts at <strong className="font-semibold">{schedule!.work_start_time}</strong></span>
          </div>
          <span>
            {schedule!.travel_duration_minutes}m travel + {schedule!.traffic_buffer_minutes}m buffer
          </span>
        </div>

        {status !== 'overdue' && (
          <div className="bg-stone-50 dark:bg-stone-950 p-2.5 rounded-lg flex items-center gap-2 border border-stone-200 dark:border-stone-800">
            <AlertCircle className="size-4 text-stone-900 dark:text-stone-100 shrink-0" />
            <span className="text-xs text-stone-900 dark:text-stone-100">
              Time to depart: <strong className="font-semibold">{timeLeft}</strong>
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
