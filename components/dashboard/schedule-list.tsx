'use client'

import React from 'react'
import { Calendar, Clock, MapPin, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

interface Schedule {
  id: string
  title: string
  time?: string
  type: 'general' | 'work' | 'study' | 'workout' | 'work_departure'
  location?: string
  calculated_departure_time?: string
}

interface ScheduleListProps {
  schedules: Schedule[]
}

export function ScheduleList({ schedules }: ScheduleListProps) {
  const getScheduleIconColor = (type: string) => {
    switch (type) {
      case 'work':
      case 'work_departure':
        return 'bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-950 font-semibold'
      case 'study':
        return 'bg-stone-100 text-stone-900 dark:bg-stone-850 dark:text-stone-100'
      case 'workout':
        return 'bg-stone-100 text-stone-900 dark:bg-stone-850 dark:text-stone-100'
      default:
        return 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300'
    }
  }

  return (
    <Card className="border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900 shadow-sm">
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-semibold text-stone-600 dark:text-stone-400 flex items-center gap-2">
          <Calendar className="size-4 text-stone-900 dark:text-stone-100" />
          Today's Schedule
        </CardTitle>
        <Link href="/schedule" className="text-xs text-stone-900 dark:text-stone-100 hover:underline flex items-center gap-0.5 font-semibold">
          View All
          <ChevronRight className="size-3" />
        </Link>
      </CardHeader>
      <CardContent>
        {schedules.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-stone-500 dark:text-stone-400">Clear calendar today.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {schedules.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-3 p-2.5 rounded-lg border border-stone-50 bg-stone-50/30 dark:border-stone-800/40 dark:bg-stone-900/30"
              >
                <div className={`p-2 rounded-lg shrink-0 ${getScheduleIconColor(item.type)}`}>
                  <Clock className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-semibold text-stone-800 dark:text-stone-100 truncate">{item.title}</h4>
                    {item.time && (
                      <span className="text-[11px] font-bold font-mono text-stone-900 dark:text-stone-100 bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded shrink-0">
                        {item.time}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-stone-400">
                    <span className="capitalize">{item.type.replace('_', ' ')}</span>
                    {item.location && (
                      <>
                        <span className="text-stone-300 dark:text-stone-700">•</span>
                        <span className="flex items-center gap-0.5 truncate max-w-[150px]">
                          <MapPin className="size-3" />
                          {item.location}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
